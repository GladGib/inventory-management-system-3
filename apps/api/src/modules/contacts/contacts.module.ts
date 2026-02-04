import { Module } from '@nestjs/common';
import { ContactsController, CustomersController, VendorsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [AddressesModule],
  controllers: [ContactsController, CustomersController, VendorsController],
  providers: [ContactsService],
  exports: [ContactsService, AddressesModule],
})
export class ContactsModule {}
