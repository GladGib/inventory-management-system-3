import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';
import { ItemSearchService } from './item-search.service';
import { ContactSearchService } from './contact-search.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchQueryDto, SuggestQueryDto, SearchType } from './dto/search-query.dto';

@ApiTags('Search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly itemSearchService: ItemSearchService,
    private readonly contactSearchService: ContactSearchService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Global search across items and contacts' })
  @ApiResponse({
    status: 200,
    description: 'Search results grouped by type',
  })
  async search(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: SearchQueryDto,
  ) {
    const { q, type, page, limit } = query;

    // If Elasticsearch is enabled, use it; otherwise fall back to database
    if (this.searchService.isEnabled()) {
      return this.elasticSearch(q, organizationId, type!, page!, limit!);
    }

    return this.databaseSearch(q, organizationId, type!, page!, limit!);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete suggestions for search' })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions',
  })
  async suggest(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: SuggestQueryDto,
  ) {
    const { q, type, limit } = query;

    if (this.searchService.isEnabled()) {
      return this.elasticSuggest(q, organizationId, type!, limit!);
    }

    return this.databaseSuggest(q, organizationId, type!, limit!);
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-index all searchable data for the organization' })
  @ApiResponse({
    status: 200,
    description: 'Re-indexing completed',
  })
  async reindex(@CurrentUser('organizationId') organizationId: string) {
    if (!this.searchService.isEnabled()) {
      return {
        message: 'Elasticsearch is not configured. Re-indexing is not needed for database search.',
        indexed: { items: 0, contacts: 0 },
      };
    }

    const [itemCount, contactCount] = await Promise.all([
      this.itemSearchService.reindexAll(organizationId),
      this.contactSearchService.reindexAll(organizationId),
    ]);

    return {
      message: 'Re-indexing completed',
      indexed: { items: itemCount, contacts: contactCount },
    };
  }

  // ============ Elasticsearch-Backed Search ============

  private async elasticSearch(
    q: string,
    organizationId: string,
    type: SearchType,
    page: number,
    limit: number,
  ) {
    const results: {
      items?: { data: unknown[]; total: number };
      contacts?: { data: unknown[]; total: number };
    } = {};

    if (type === SearchType.ALL || type === SearchType.ITEMS) {
      const itemResults = await this.itemSearchService.searchItems(
        q,
        organizationId,
        page,
        limit,
      );
      results.items = {
        data: itemResults.hits,
        total: itemResults.total,
      };
    }

    if (type === SearchType.ALL || type === SearchType.CONTACTS) {
      const contactResults = await this.contactSearchService.searchContacts(
        q,
        organizationId,
        page,
        limit,
      );
      results.contacts = {
        data: contactResults.hits,
        total: contactResults.total,
      };
    }

    return {
      query: q,
      type,
      page,
      limit,
      results,
      engine: 'elasticsearch',
    };
  }

  private async elasticSuggest(
    q: string,
    organizationId: string,
    type: SearchType,
    limit: number,
  ) {
    const suggestions: {
      items?: string[];
      contacts?: string[];
    } = {};

    if (type === SearchType.ALL || type === SearchType.ITEMS) {
      suggestions.items = await this.itemSearchService.suggestItems(
        q,
        organizationId,
        limit,
      );
    }

    if (type === SearchType.ALL || type === SearchType.CONTACTS) {
      suggestions.contacts = await this.contactSearchService.suggestContacts(
        q,
        organizationId,
        limit,
      );
    }

    return {
      query: q,
      type,
      suggestions,
      engine: 'elasticsearch',
    };
  }

  // ============ Database Fallback Search ============

  private async databaseSearch(
    q: string,
    organizationId: string,
    type: SearchType,
    page: number,
    limit: number,
  ) {
    const results: {
      items?: { data: unknown[]; total: number };
      contacts?: { data: unknown[]; total: number };
    } = {};
    const skip = (page - 1) * limit;

    if (type === SearchType.ALL || type === SearchType.ITEMS) {
      const where = {
        organizationId,
        status: 'ACTIVE' as const,
        OR: [
          { sku: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
          { partNumber: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
          { brand: { contains: q, mode: 'insensitive' as const } },
        ],
      };

      const [items, itemCount] = await Promise.all([
        this.prisma.item.findMany({
          where,
          include: {
            category: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.item.count({ where }),
      ]);

      results.items = {
        data: items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          description: item.description,
          category: item.category?.name || '',
          brand: item.brand || '',
          partNumber: item.partNumber || '',
          type: item.type,
          status: item.status,
          sellingPrice: Number(item.sellingPrice),
          organizationId: item.organizationId,
        })),
        total: itemCount,
      };
    }

    if (type === SearchType.ALL || type === SearchType.CONTACTS) {
      const where = {
        organizationId,
        status: 'ACTIVE' as const,
        OR: [
          { companyName: { contains: q, mode: 'insensitive' as const } },
          { displayName: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { phone: { contains: q, mode: 'insensitive' as const } },
        ],
      };

      const [contacts, contactCount] = await Promise.all([
        this.prisma.contact.findMany({
          where,
          orderBy: { companyName: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.contact.count({ where }),
      ]);

      results.contacts = {
        data: contacts.map((contact) => ({
          id: contact.id,
          companyName: contact.companyName,
          displayName: contact.displayName,
          email: contact.email || '',
          phone: contact.phone || '',
          mobile: contact.mobile || '',
          type: contact.type,
          status: contact.status,
          organizationId: contact.organizationId,
        })),
        total: contactCount,
      };
    }

    return {
      query: q,
      type,
      page,
      limit,
      results,
      engine: 'database',
    };
  }

  private async databaseSuggest(
    q: string,
    organizationId: string,
    type: SearchType,
    limit: number,
  ) {
    const suggestions: {
      items?: string[];
      contacts?: string[];
    } = {};

    if (type === SearchType.ALL || type === SearchType.ITEMS) {
      const items = await this.prisma.item.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { name: true },
        orderBy: { name: 'asc' },
        take: limit,
      });
      suggestions.items = items.map((i) => i.name);
    }

    if (type === SearchType.ALL || type === SearchType.CONTACTS) {
      const contacts = await this.prisma.contact.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          OR: [
            { companyName: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { companyName: true },
        orderBy: { companyName: 'asc' },
        take: limit,
      });
      suggestions.contacts = contacts.map((c) => c.companyName);
    }

    return {
      query: q,
      type,
      suggestions,
      engine: 'database',
    };
  }
}
