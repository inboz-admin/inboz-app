import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  inviteUser(@Body() inviteUserDto: InviteUserDto) {
    return this.usersService.inviteUser(inviteUserDto);
  }

  @Get()
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('by-email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Delete(':id/force')
  forceDelete(@Param('id') id: string) {
    return this.usersService.permanentlyDeleteUser(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.usersService.restoreUser(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.removeUser(id);
  }

  @Get(':id/quota')
  getQuotaStats(@Param('id') id: string, @Query('targetDate') targetDate?: string) {
    return this.usersService.getQuotaStats(id, targetDate ? new Date(targetDate) : undefined);
  }
}
