import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '@/prisma/prisma.service';

const ITEMS_INDEX = 'ims_items';

@Injectable()
export class ItemSearchService implements OnModuleInit {
  private readonly logger = new Logger(ItemSearchService.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    if (!this.searchService.isEnabled()) return;

    await this.searchService.createIndex(ITEMS_INDEX, {
      properties: {
        name: { type: 'text', analyzer: 'standard', boost: 3 },
        sku: { type: 'keyword', normalizer: undefined },
        skuText: { type: 'text', analyzer: 'standard', boost: 2 },
        description: { type: 'text', analyzer: 'standard' },
        category: { type: 'keyword' },
        categoryText: { type: 'text', analyzer: 'standard' },
        brand: { type: 'keyword' },
        partNumber: { type: 'keyword' },
        partNumberText: { type: 'text', analyzer: 'standard', boost: 2 },
        crossReferences: { type: 'keyword' },
        type: { type: 'keyword' },
        status: { type: 'keyword' },
        organizationId: { type: 'keyword' },
        costPrice: { type: 'float' },
        sellingPrice: { type: 'float' },
        suggest: {
          type: 'completion',
          analyzer: 'standard',
          contexts: [
            {
              name: 'organizationId',
              type: 'category',
              path: 'organizationId',
            },
          ],
        },
      },
    });

    this.logger.log('Items search index initialized');
  }

  /**
   * Index a single item into Elasticsearch
   */
  async indexItem(item: {
    id: string;
    name: string;
    sku: string;
    description?: string | null;
    brand?: string | null;
    partNumber?: string | null;
    crossReferences?: string[];
    type: string;
    status: string;
    costPrice: unknown;
    sellingPrice: unknown;
    organizationId: string;
    category?: { name: string } | null;
  }): Promise<void> {
    const suggestInputs = [item.name, item.sku].filter(Boolean);
    if (item.partNumber) suggestInputs.push(item.partNumber);

    await this.searchService.indexDocument(ITEMS_INDEX, item.id, {
      name: item.name,
      sku: item.sku,
      skuText: item.sku,
      description: item.description || '',
      category: item.category?.name || '',
      categoryText: item.category?.name || '',
      brand: item.brand || '',
      partNumber: item.partNumber || '',
      partNumberText: item.partNumber || '',
      crossReferences: item.crossReferences || [],
      type: item.type,
      status: item.status,
      organizationId: item.organizationId,
      costPrice: Number(item.costPrice) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
      suggest: {
        input: suggestInputs,
        contexts: { organizationId: [item.organizationId] },
      },
    });
  }

  /**
   * Full-text search for items, scoped to an organization
   */
  async searchItems(
    query: string,
    organizationId: string,
    page = 1,
    size = 20,
  ) {
    const from = (page - 1) * size;
    const result = await this.searchService.search(
      ITEMS_INDEX,
      {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: [
                  'name^3',
                  'skuText^2',
                  'partNumberText^2',
                  'description',
                  'brand',
                  'categoryText',
                ],
                type: 'best_fields',
                fuzziness: 'AUTO',
                prefix_length: 1,
              },
            },
          ],
          filter: [
            { term: { organizationId } },
            { term: { status: 'ACTIVE' } },
          ],
        },
      },
      from,
      size,
    );

    return {
      hits: result.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      })),
      total: result.total,
    };
  }

  /**
   * Autocomplete suggestions for items
   */
  async suggestItems(
    text: string,
    organizationId: string,
    size = 7,
  ): Promise<string[]> {
    if (!this.searchService.isEnabled() || !text) return [];

    const client = this.searchService.getClient();
    if (!client) return [];

    try {
      const result = await client.search({
        index: ITEMS_INDEX,
        suggest: {
          suggestions: {
            prefix: text,
            completion: {
              field: 'suggest',
              size,
              fuzzy: { fuzziness: 'AUTO' },
              contexts: {
                organizationId: [organizationId],
              },
            },
          },
        },
      });

      const suggestions = result.suggest?.suggestions;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const options = suggestions[0].options;
        if (Array.isArray(options)) {
          return options.map(
            (o: { text?: string }) => o.text || '',
          ).filter(Boolean);
        }
      }
      return [];
    } catch (error) {
      this.logger.error(
        `Item suggest failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Remove an item from the search index
   */
  async removeItem(id: string): Promise<void> {
    await this.searchService.deleteDocument(ITEMS_INDEX, id);
  }

  /**
   * Re-index all items for an organization (or all orgs if not specified)
   */
  async reindexAll(organizationId?: string): Promise<number> {
    const where = organizationId
      ? { organizationId, status: 'ACTIVE' as const }
      : { status: 'ACTIVE' as const };

    const items = await this.prisma.item.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
    });

    if (items.length === 0) return 0;

    const documents = items.map((item) => ({
      id: item.id,
      document: {
        name: item.name,
        sku: item.sku,
        skuText: item.sku,
        description: item.description || '',
        category: item.category?.name || '',
        categoryText: item.category?.name || '',
        brand: item.brand || '',
        partNumber: item.partNumber || '',
        partNumberText: item.partNumber || '',
        crossReferences: item.crossReferences || [],
        type: item.type,
        status: item.status,
        organizationId: item.organizationId,
        costPrice: Number(item.costPrice) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        suggest: {
          input: [item.name, item.sku, item.partNumber].filter(Boolean),
          contexts: { organizationId: [item.organizationId] },
        },
      },
    }));

    // Bulk index in batches of 500
    const batchSize = 500;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.searchService.bulkIndex(ITEMS_INDEX, batch);
    }

    this.logger.log(`Re-indexed ${items.length} items`);
    return items.length;
  }
}
