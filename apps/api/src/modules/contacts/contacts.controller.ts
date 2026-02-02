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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List all contacts with filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of contacts' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: ContactQueryDto
  ) {
    return this.contactsService.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact details with balance' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.contactsService.findById(id, organizationId);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get contact balance' })
  @ApiResponse({ status: 200, description: 'Contact balance details' })
  async getBalance(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.contactsService.getBalance(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateContactDto
  ) {
    return this.contactsService.create(organizationId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateContactDto
  ) {
    return this.contactsService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact (soft delete)' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.contactsService.delete(id, organizationId);
  }
}

// Separate controller for /customers alias
@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiResponse({ status: 200, description: 'Paginated list of customers' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: ContactQueryDto
  ) {
    return this.contactsService.findCustomers(organizationId, query);
  }
}

// Separate controller for /vendors alias
@ApiTags('Vendors')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  @ApiResponse({ status: 200, description: 'Paginated list of vendors' })
  async findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: ContactQueryDto
  ) {
    return this.contactsService.findVendors(organizationId, query);
  }
}
