import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type {} from 'multer';

import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { ROLE_CODES } from '../constants/roles.constant';
import {
  UpdateBusinessProfileDto,
  VerifyBusinessProfileEmailOtpDto,
} from '../dtos/business-profile.dto';
import { SendChangeEmailOtpQueryDto } from '../dtos/change-gmail.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  BusinessResponseDto,
} from '../dtos/swagger-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { BusinessService } from '../services/business.service';

@Controller('businesses/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_CODES.EMPLOYEE)
@ApiTags('Businesses')
@ApiBearerAuth('access-token')
@ApiExtraModels(ApiSuccessResponseDto, ApiErrorResponseDto, BusinessResponseDto)
export class BusinessProfileController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @ApiOperation({
    summary: 'Thong tin doanh nghiep dang dang nhap',
    description:
      'Doanh nghiep lay thong tin cua chinh minh de hien thi tren man Thong tin doanh nghiep.',
  })
  @ApiOkResponse({
    description: 'Thong tin doanh nghiep dang dang nhap',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(BusinessResponseDto) },
          },
        },
      ],
    },
  })
  getMyBusiness(@CurrentUser() currentUser: CurrentUserData) {
    return this.businessService.getMyBusiness(currentUser.id);
  }

  @Post('email/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gui OTP doi email doanh nghiep',
    description:
      'Gui OTP ve email hien tai cua doanh nghiep truoc khi cho phep nhap email moi.',
  })
  @ApiOkResponse({
    description: 'Gui OTP thanh cong',
    type: ApiSuccessResponseDto,
  })
  sendEmailChangeOtp(
    @CurrentUser() currentUser: CurrentUserData,
    @Query() query: SendChangeEmailOtpQueryDto,
  ) {
    return this.businessService.sendBusinessProfileEmailOtp(
      currentUser.id,
      query.newEmail,
    );
  }

  @Post('email/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xac thuc OTP doi email doanh nghiep',
    description:
      'Xac thuc OTP da gui ve email cu. Sau khi thanh cong, PATCH businesses/me co the luu email moi.',
  })
  @ApiOkResponse({
    description: 'Xac thuc OTP thanh cong',
    type: ApiSuccessResponseDto,
  })
  verifyEmailChangeOtp(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: VerifyBusinessProfileEmailOtpDto,
  ) {
    return this.businessService.verifyBusinessProfileEmailOtp(
      currentUser.id,
      body,
    );
  }

  @Patch()
  @ApiOperation({
    summary: 'Cap nhat thong tin doanh nghiep dang dang nhap',
    description:
      'Doanh nghiep duoc cap nhat thong tin cua minh nhung khong duoc sua ma so thue va trang thai. Neu doi email, can xac thuc OTP email cu truoc.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        businessName: {
          type: 'string',
          example: 'Cong ty co phan cong nghe quoc te VNA',
        },
        foreignName: {
          type: 'string',
          example: 'VNA International Technology Joint Stock Company',
        },
        businessType: {
          type: 'string',
          example: 'Cong ty TNHH 1 thanh vien',
        },
        industryCode: {
          type: 'string',
          example: '4669',
          description: 'Ma nganh nghe cap 4 theo VSIC',
        },
        industryName: {
          type: 'string',
          example: 'Ban buon chuyen doanh khac chua duoc phan vao dau',
        },
        licenseIssueDate: { type: 'string', example: '2020-01-01' },
        provinceCity: { type: 'string', example: 'Thanh pho Ho Chi Minh' },
        wardCommune: { type: 'string', example: 'Phuong Hiep Binh Phuoc' },
        address: {
          type: 'string',
          example: '162 duong so 2, khu do thi Van Phuc',
        },
        email: { type: 'string', example: 'business@example.com' },
        agencyPhone: { type: 'string', example: '02812345678' },
        operatingProvinceCity: {
          type: 'string',
          example: 'Thanh pho Ho Chi Minh',
        },
        operatingWardCommune: {
          type: 'string',
          example: 'Phuong Hiep Binh Phuoc',
        },
        businessLocation: {
          type: 'string',
          example: '162 duong so 2, khu do thi Van Phuc',
        },
        representativeName: { type: 'string', example: 'Nguyen Van A' },
        representativePhone: { type: 'string', example: '0909123456' },
        attachmentNames: {
          type: 'string',
          example: '["Giay phep kinh doanh","Giay to khac"]',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Doanh nghiep sau khi cap nhat',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(BusinessResponseDto) },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FilesInterceptor('attachments', 2, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  updateMyBusiness(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: UpdateBusinessProfileDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.businessService.updateMyBusiness(currentUser.id, body, files);
  }
}
