import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  UpdateChangeGmailDto,
  VerifyChangeGmailOtpDto,
} from '../dtos/change-gmail.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyForgotPasswordOtpDto } from '../dtos/verify-forgot-password-otp.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestForgotPassword(body);
  }

  @Post('forgot-password/request')
  @HttpCode(HttpStatus.OK)
  requestForgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestForgotPassword(body);
  }

  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  verifyForgotPasswordOtp(@Body() body: VerifyForgotPasswordOtpDto) {
    return this.authService.verifyForgotPasswordOtp(body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPasswordAlias(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      currentUser.id,
      changePasswordDto,
    );
  }

  @Post('change-gmail/send-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  sendChangeGmailOtp(@CurrentUser() currentUser: CurrentUserData) {
    return this.authService.sendChangeGmailOtp(currentUser.id);
  }

  @Post('change-gmail/verify-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verifyChangeGmailOtp(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: VerifyChangeGmailOtpDto,
  ) {
    return this.authService.verifyChangeGmailOtp(currentUser.id, body);
  }

  @Post('change-gmail/update')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateChangeGmail(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: UpdateChangeGmailDto,
  ) {
    return this.authService.updateChangeGmail(currentUser.id, body);
  }
}
