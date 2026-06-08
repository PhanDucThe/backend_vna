import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import * as currentUserDecorator from '../decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(
    @currentUserDecorator.CurrentUser()
    currentUser: currentUserDecorator.CurrentUserData,
  ) {
    return this.userService.getMe(currentUser.id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateUser(id, updateUserDto, file);
  }
}
