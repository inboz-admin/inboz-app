import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ContactListsService } from './contact-lists.service';
import { CreateContactListDto } from './dto/create-contact-list.dto';
import { UpdateContactListDto } from './dto/update-contact-list.dto';
import { ContactListQueryDto } from './dto/contact-list-query.dto';
import { AddContactsToListDto, RemoveContactsFromListDto } from './dto/add-contacts-to-list.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';

@Controller()
export class ContactListsController {
  constructor(private readonly contactListsService: ContactListsService) {}

  @Post()
  create(@Body() createContactListDto: CreateContactListDto) {
    return this.contactListsService.createContactList(createContactListDto);
  }

  @Get()
  findAll(@Query() query: ContactListQueryDto) {
    return this.contactListsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactListsService.findContactListById(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.contactListsService.restoreContactList(id);
  }

  @Post(':id/contacts')
  addContacts(
    @Param('id') id: string,
    @Body() addContactsDto: AddContactsToListDto,
  ) {
    return this.contactListsService.addContactsToList(id, addContactsDto);
  }

  @Delete(':id/contacts')
  removeContacts(
    @Param('id') id: string,
    @Body() removeContactsDto: RemoveContactsFromListDto,
  ) {
    return this.contactListsService.removeContactsFromList(
      id,
      removeContactsDto,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactListDto: UpdateContactListDto,
  ) {
    return this.contactListsService.updateContactList(id, updateContactListDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    if (force === 'true') {
      return this.contactListsService.permanentlyDeleteContactList(id);
    }
    return this.contactListsService.removeContactList(id);
  }

  @Get(':id/contacts')
  getListContacts(
    @Param('id') id: string,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.contactListsService.getListContacts(
      id,
      query.page,
      query.limit,
    );
  }
}
