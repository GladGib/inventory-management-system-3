import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '@/prisma/prisma.service';

const CONTACTS_INDEX = 'ims_contacts';

@Injectable()
export class ContactSearchService implements OnModuleInit {
  private readonly logger = new Logger(ContactSearchService.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    if (!this.searchService.isEnabled()) return;

    await this.searchService.createIndex(CONTACTS_INDEX, {
      properties: {
        companyName: { type: 'text', analyzer: 'standard', boost: 3 },
        displayName: { type: 'text', analyzer: 'standard', boost: 2 },
        email: { type: 'keyword' },
        emailText: { type: 'text', analyzer: 'standard' },
        phone: { type: 'keyword' },
        phoneText: { type: 'text', analyzer: 'standard' },
        mobile: { type: 'keyword' },
        type: { type: 'keyword' },
        status: { type: 'keyword' },
        taxNumber: { type: 'keyword' },
        organizationId: { type: 'keyword' },
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

    this.logger.log('Contacts search index initialized');
  }

  /**
   * Index a single contact into Elasticsearch
   */
  async indexContact(contact: {
    id: string;
    companyName: string;
    displayName: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    type: string;
    status: string;
    taxNumber?: string | null;
    organizationId: string;
  }): Promise<void> {
    const suggestInputs = [contact.companyName, contact.displayName].filter(Boolean);

    await this.searchService.indexDocument(CONTACTS_INDEX, contact.id, {
      companyName: contact.companyName,
      displayName: contact.displayName,
      email: contact.email || '',
      emailText: contact.email || '',
      phone: contact.phone || '',
      phoneText: contact.phone || '',
      mobile: contact.mobile || '',
      type: contact.type,
      status: contact.status,
      taxNumber: contact.taxNumber || '',
      organizationId: contact.organizationId,
      suggest: {
        input: suggestInputs,
        contexts: { organizationId: [contact.organizationId] },
      },
    });
  }

  /**
   * Full-text search for contacts, scoped to an organization
   */
  async searchContacts(
    query: string,
    organizationId: string,
    page = 1,
    size = 20,
  ) {
    const from = (page - 1) * size;
    const result = await this.searchService.search(
      CONTACTS_INDEX,
      {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: [
                  'companyName^3',
                  'displayName^2',
                  'emailText',
                  'phoneText',
                  'taxNumber',
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
   * Autocomplete suggestions for contacts
   */
  async suggestContacts(
    text: string,
    organizationId: string,
    size = 7,
  ): Promise<string[]> {
    if (!this.searchService.isEnabled() || !text) return [];

    const client = this.searchService.getClient();
    if (!client) return [];

    try {
      const result = await client.search({
        index: CONTACTS_INDEX,
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
        `Contact suggest failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Remove a contact from the search index
   */
  async removeContact(id: string): Promise<void> {
    await this.searchService.deleteDocument(CONTACTS_INDEX, id);
  }

  /**
   * Re-index all contacts for an organization (or all orgs if not specified)
   */
  async reindexAll(organizationId?: string): Promise<number> {
    const where = organizationId
      ? { organizationId, status: 'ACTIVE' as const }
      : { status: 'ACTIVE' as const };

    const contacts = await this.prisma.contact.findMany({ where });

    if (contacts.length === 0) return 0;

    const documents = contacts.map((contact) => ({
      id: contact.id,
      document: {
        companyName: contact.companyName,
        displayName: contact.displayName,
        email: contact.email || '',
        emailText: contact.email || '',
        phone: contact.phone || '',
        phoneText: contact.phone || '',
        mobile: contact.mobile || '',
        type: contact.type,
        status: contact.status,
        taxNumber: contact.taxNumber || '',
        organizationId: contact.organizationId,
        suggest: {
          input: [contact.companyName, contact.displayName].filter(Boolean),
          contexts: { organizationId: [contact.organizationId] },
        },
      },
    }));

    // Bulk index in batches of 500
    const batchSize = 500;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.searchService.bulkIndex(CONTACTS_INDEX, batch);
    }

    this.logger.log(`Re-indexed ${contacts.length} contacts`);
    return contacts.length;
  }
}
