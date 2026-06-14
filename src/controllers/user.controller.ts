import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type {} from 'multer';

import { Roles } from '../decorators/roles.decorator';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import * as currentUserDecorator from '../decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getUsers(
    @Query() query: ListUsersQueryDto,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getUsers(query, currentUser);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getMe(currentUser.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getUserDetail(
    @Param('id', ParseIntPipe) id: number,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getUserDetail(id, currentUser);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('File upload phai la anh'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateUser(id, updateUserDto, currentUser, file);
  }
}
