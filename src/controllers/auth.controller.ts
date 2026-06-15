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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

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
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  LoginResponseDto,
} from '../dtos/swagger-response.dto';

@Controller('auth')
@ApiTags('Auth')
@ApiExtraModels(ApiSuccessResponseDto, ApiErrorResponseDto, LoginResponseDto)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Dang nhap',
    description:
      'Tra ve accessToken, refreshToken va thong tin user. Dung accessToken cho nut Authorize tren Swagger.',
  })
  @ApiResponse({ status: 201, description: 'Dang nhap thanh cong' })
  @ApiResponse({ status: 401, description: 'Sai tai khoan/mat khau' })
  @ApiCreatedResponse({
    description: 'Response dang nhap sau khi boc boi interceptor',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LoginResponseDto) },
          },
        },
      ],
    },
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Request khong hop le',
    type: ApiErrorResponseDto,
  })
  login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gui OTP quen mat khau' })
  @ApiOkResponse({ description: 'Gui OTP thanh cong', type: ApiSuccessResponseDto })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestForgotPassword(body);
  }

  @Post('forgot-password/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gui OTP quen mat khau alias' })
  @ApiOkResponse({ description: 'Gui OTP thanh cong', type: ApiSuccessResponseDto })
  requestForgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestForgotPassword(body);
  }

  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xac thuc OTP quen mat khau' })
  @ApiOkResponse({ description: 'Xac thuc OTP thanh cong', type: ApiSuccessResponseDto })
  verifyForgotPasswordOtp(@Body() body: VerifyForgotPasswordOtpDto) {
    return this.authService.verifyForgotPasswordOtp(body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dat lai mat khau alias' })
  @ApiOkResponse({ description: 'Dat lai mat khau thanh cong', type: ApiSuccessResponseDto })
  resetPasswordAlias(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dat lai mat khau bang OTP' })
  @ApiOkResponse({ description: 'Dat lai mat khau thanh cong', type: ApiSuccessResponseDto })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Doi mat khau cua user dang dang nhap' })
  @ApiOkResponse({ description: 'Doi mat khau thanh cong', type: ApiSuccessResponseDto })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gui OTP doi Gmail cho user dang dang nhap' })
  @ApiOkResponse({ description: 'Gui OTP thanh cong', type: ApiSuccessResponseDto })
  sendChangeGmailOtp(@CurrentUser() currentUser: CurrentUserData) {
    return this.authService.sendChangeGmailOtp(currentUser.id);
  }

  @Post('change-gmail/verify-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xac thuc OTP doi Gmail' })
  @ApiOkResponse({ description: 'Xac thuc OTP thanh cong', type: ApiSuccessResponseDto })
  verifyChangeGmailOtp(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: VerifyChangeGmailOtpDto,
  ) {
    return this.authService.verifyChangeGmailOtp(currentUser.id, body);
  }

  @Post('change-gmail/update')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cap nhat Gmail moi sau khi da xac thuc OTP' })
  @ApiOkResponse({ description: 'Cap nhat Gmail thanh cong', type: ApiSuccessResponseDto })
  updateChangeGmail(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: UpdateChangeGmailDto,
  ) {
    return this.authService.updateChangeGmail(currentUser.id, body);
  }
}
