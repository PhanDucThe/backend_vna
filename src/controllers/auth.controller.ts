import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import {
  UpdateChangeGmailDto,
  VerifyChangeGmailOtpDto,
} from '../dtos/change-gmail.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyForgotPasswordOtpDto } from '../dtos/verify-forgot-password-otp.dto';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';

interface AuthenticatedRequest extends Request {
  user: User;
}

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

  @Post('change-gmail/send-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  sendChangeGmailOtp(@Req() request: AuthenticatedRequest) {
    return this.authService.sendChangeGmailOtp(request.user);
  }

  @Post('change-gmail/verify-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verifyChangeGmailOtp(
    @Req() request: AuthenticatedRequest,
    @Body() body: VerifyChangeGmailOtpDto,
  ) {
    return this.authService.verifyChangeGmailOtp(request.user, body);
  }

  @Post('change-gmail/update')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateChangeGmail(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateChangeGmailDto,
  ) {
    return this.authService.updateChangeGmail(request.user, body);
  }
}
