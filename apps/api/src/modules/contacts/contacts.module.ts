import { Module } from '@nestjs/common';
import { ContactsController, CustomersController, VendorsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  controllers: [ContactsController, CustomersController, VendorsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
