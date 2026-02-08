import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Sales Quotes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create a sales quote' })
  @ApiResponse({ status: 201, description: 'Quote created' })
  async createQuote(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuoteDto
  ) {
    return this.quotesService.createQuote(organizationId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales quotes' })
  @ApiResponse({ status: 200, description: 'List of quotes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getQuotes(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.quotesService.getQuotes(organizationId, {
      status,
      customerId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote details' })
  async getQuote(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.getQuote(id, organizationId);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update a quote' })
  @ApiResponse({ status: 200, description: 'Quote updated' })
  async updateQuote(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateQuoteDto
  ) {
    return this.quotesService.updateQuote(id, organizationId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a quote (only DRAFT)' })
  @ApiResponse({ status: 200, description: 'Quote deleted' })
  async deleteQuote(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.deleteQuote(id, organizationId);
  }

  @Post(':id/send')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Mark quote as sent' })
  @ApiResponse({ status: 200, description: 'Quote marked as sent' })
  async sendQuote(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.quotesService.sendQuote(id, organizationId);
  }

  @Post(':id/convert')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Convert quote to sales order' })
  @ApiResponse({ status: 201, description: 'Sales order created from quote' })
  async convertToOrder(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.quotesService.convertToOrder(id, organizationId, userId);
  }
}
