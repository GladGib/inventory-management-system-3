import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Client | null = null;
  private enabled = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const elasticUrl = this.config.get<string>('ELASTICSEARCH_URL');
    if (elasticUrl) {
      try {
        this.client = new Client({ node: elasticUrl });
        // Verify connection
        const info = await this.client.info();
        this.enabled = true;
        this.logger.log(
          `Elasticsearch connected: ${info.name} (v${info.version.number})`,
        );
      } catch (error) {
        this.logger.warn(
          `Elasticsearch connection failed: ${error instanceof Error ? error.message : 'Unknown error'}. Search will use database fallback.`,
        );
        this.client = null;
        this.enabled = false;
      }
    } else {
      this.logger.warn(
        'ELASTICSEARCH_URL not configured, search will use database fallback',
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getClient(): Client | null {
    return this.client;
  }

  async createIndex(index: string, mappings: Record<string, unknown>): Promise<void> {
    if (!this.client) return;
    try {
      const exists = await this.client.indices.exists({ index });
      if (!exists) {
        await this.client.indices.create({
          index,
          mappings,
          settings: {
            analysis: {
              analyzer: {
                sku_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase'],
                },
              },
            },
          },
        });
        this.logger.log(`Index "${index}" created`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create index "${index}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async indexDocument(
    index: string,
    id: string,
    document: Record<string, unknown>,
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.index({
        index,
        id,
        document,
        refresh: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to index document ${id} in "${index}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async bulkIndex(
    index: string,
    documents: Array<{ id: string; document: Record<string, unknown> }>,
  ): Promise<void> {
    if (!this.client || documents.length === 0) return;
    try {
      const operations = documents.flatMap((doc) => [
        { index: { _index: index, _id: doc.id } },
        doc.document,
      ]);
      const result = await this.client.bulk({
        operations,
        refresh: true,
      });
      if (result.errors) {
        const errorItems = result.items.filter((item) => item.index?.error);
        this.logger.warn(
          `Bulk index had ${errorItems.length} errors in "${index}"`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Bulk index failed for "${index}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async search(
    index: string,
    query: Record<string, unknown>,
    from = 0,
    size = 20,
  ): Promise<{
    hits: Array<{ _id: string; _score: number | null; _source: Record<string, unknown> }>;
    total: number;
  }> {
    if (!this.client) {
      return { hits: [], total: 0 };
    }
    try {
      const result = await this.client.search({
        index,
        query,
        from,
        size,
      });
      const total =
        typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total?.value ?? 0;
      const hits = result.hits.hits.map((hit) => ({
        _id: hit._id ?? '',
        _score: hit._score ?? null,
        _source: (hit._source as Record<string, unknown>) || {},
      }));
      return { hits, total };
    } catch (error) {
      this.logger.error(
        `Search failed for "${index}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { hits: [], total: 0 };
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.delete({ index, id, refresh: true });
    } catch (error) {
      // Ignore 404 errors (document already deleted)
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        (error as { statusCode: number }).statusCode === 404
      ) {
        return;
      }
      this.logger.error(
        `Failed to delete document ${id} from "${index}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async suggest(
    index: string,
    field: string,
    text: string,
    size = 5,
  ): Promise<string[]> {
    if (!this.client || !text) return [];
    try {
      const result = await this.client.search({
        index,
        suggest: {
          suggestions: {
            prefix: text,
            completion: { field, size, fuzzy: { fuzziness: 'AUTO' } },
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
        `Suggest failed for "${index}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }
}
