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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('contacts/:contactId/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List addresses for a contact' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  async findAll(
    @Param('contactId') contactId: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.addressesService.findAll(contactId, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiResponse({ status: 200, description: 'Address details' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findById(
    @Param('contactId') contactId: string,
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.addressesService.findById(id, contactId, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  async create(
    @Param('contactId') contactId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDto: CreateAddressDto
  ) {
    return this.addressesService.create(contactId, organizationId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @Param('contactId') contactId: string,
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateAddressDto
  ) {
    return this.addressesService.update(id, contactId, organizationId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async delete(
    @Param('contactId') contactId: string,
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    await this.addressesService.delete(id, contactId, organizationId);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  async setDefault(
    @Param('contactId') contactId: string,
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string
  ) {
    return this.addressesService.setDefault(id, contactId, organizationId);
  }
}
