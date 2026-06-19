import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type {} from 'multer';

import {
  RegisterBusinessDto,
  SendBusinessRegistrationOtpDto,
  VerifyBusinessRegistrationOtpDto,
} from '../dtos/business-registration.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  CreatedBusinessResponseDto,
} from '../dtos/swagger-response.dto';
import { BusinessService } from '../services/business.service';

@Controller('businesses/register')
@ApiTags('Businesses')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  CreatedBusinessResponseDto,
)
export class BusinessRegistrationController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('options')
  @ApiOperation({
    summary: 'Danh muc/rang buoc cho form dang ky doanh nghiep',
    description:
      'API public cho man hinh dang ky tai khoan doanh nghiep lay loai hinh kinh doanh va quy tac ma so thue/nganh nghe.',
  })
  @ApiOkResponse({
    description: 'Tuy chon cho form dang ky doanh nghiep',
    type: ApiSuccessResponseDto,
  })
  getRegistrationOptions() {
    return this.businessService.getBusinessOptions();
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gui OTP dang ky tai khoan doanh nghiep',
    description:
      'Gui OTP ve email doanh nghiep de xac thuc truoc khi chuyen sang buoc xac nhan thong tin.',
  })
  @ApiOkResponse({
    description: 'Gui OTP thanh cong',
    type: ApiSuccessResponseDto,
  })
  sendRegistrationOtp(@Body() body: SendBusinessRegistrationOtpDto) {
    return this.businessService.sendBusinessRegistrationOtp(body);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xac thuc OTP dang ky tai khoan doanh nghiep',
    description:
      'Xac thuc OTP de frontend cho phep doanh nghiep qua buoc xac nhan dang ky.',
  })
  @ApiOkResponse({
    description: 'Xac thuc OTP thanh cong',
    type: ApiSuccessResponseDto,
  })
  verifyRegistrationOtp(@Body() body: VerifyBusinessRegistrationOtpDto) {
    return this.businessService.verifyBusinessRegistrationOtp(body);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Xac nhan dang ky tai khoan doanh nghiep',
    description:
      'Nhan multipart/form-data de tao doanh nghiep sau khi email da xac thuc OTP. Tai khoan mac dinh la ma so thue, mat khau mac dinh la 12345678.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'businessName',
        'taxCode',
        'businessType',
        'industryCode',
        'industryName',
        'provinceCity',
        'wardCommune',
        'email',
      ],
      properties: {
        businessName: {
          type: 'string',
          example: 'Cong ty co phan cong nghe quoc te VNA',
        },
        foreignName: {
          type: 'string',
          example: 'VNA International Technology Joint Stock Company',
        },
        taxCode: {
          type: 'string',
          example: '0312345678',
          description:
            '10 chu so hoac 10 chu so-3 chu so, vi du 0100109106-001',
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
  @ApiCreatedResponse({
    description: 'Doanh nghiep vua dang ky kem thong tin tai khoan mac dinh',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(CreatedBusinessResponseDto) },
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
  confirmRegistration(
    @Body() body: RegisterBusinessDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.businessService.confirmBusinessRegistration(body, files);
  }
}
