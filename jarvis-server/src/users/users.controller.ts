import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import type { UserRole } from './user.interface';
import { LogsService } from '../logs/logs.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  findAll() { return this.usersService.findAll(); }

  @Post()
  create(@Body() body: { username: string; password: string; role: UserRole }) {
    const result = this.usersService.create(body);
    this.logsService.add('admin', 'CREATE_USER', { username: body.username, role: body.role });
    return result;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { password?: string; role?: UserRole; active?: boolean }) {
    const result = this.usersService.update(id, body);
    this.logsService.add('admin', 'UPDATE_USER', { id });
    return result;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logsService.add('admin', 'DELETE_USER', { id });
    return this.usersService.remove(id);
  }
}
