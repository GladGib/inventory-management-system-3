import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { PaymentTermsService } from './payment-terms.service';
import { CreatePaymentTermDto } from './dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from './dto/update-payment-term.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Payment Terms')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('settings/payment-terms')
export class PaymentTermsController {
  constructor(private readonly paymentTermsService: PaymentTermsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payment terms' })
  @ApiResponse({ status: 200, description: 'List of payment terms' })
  async findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.paymentTermsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment term by ID' })
  @ApiResponse({ status: 200, description: 'Payment term details' })
  @ApiResponse({ status: 404, description: 'Payment term not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.paymentTermsService.findById(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new payment term' })
  @ApiResponse({ status: 201, description: 'Payment term created' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreatePaymentTermDto
  ) {
    return this.paymentTermsService.create(organizationId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a payment term' })
  @ApiResponse({ status: 200, description: 'Payment term updated' })
  @ApiResponse({ status: 404, description: 'Payment term not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdatePaymentTermDto
  ) {
    return this.paymentTermsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment term' })
  @ApiResponse({ status: 204, description: 'Payment term deleted' })
  @ApiResponse({ status: 404, description: 'Payment term not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete - payment term is in use' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.paymentTermsService.delete(id, organizationId);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set payment term as default' })
  @ApiResponse({ status: 200, description: 'Payment term set as default' })
  async setDefault(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.paymentTermsService.setDefault(id, organizationId);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Seed default payment terms for organization' })
  @ApiResponse({ status: 201, description: 'Default payment terms created' })
  async seedDefaults(@CurrentUser('organizationId') organizationId: string) {
    return this.paymentTermsService.seedDefaults(organizationId);
  }
}
