import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type {} from 'multer';

import { Roles } from '../decorators/roles.decorator';
import { CreateBusinessDto } from '../dtos/create-business.dto';
import { ListBusinessesQueryDto } from '../dtos/list-businesses-query.dto';
import { UpdateBusinessDto } from '../dtos/update-business.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { BusinessService } from '../services/business.service';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  BusinessListResponseDto,
  BusinessResponseDto,
  CreatedBusinessResponseDto,
} from '../dtos/swagger-response.dto';

@Controller('businesses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiTags('Businesses')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  BusinessListResponseDto,
  BusinessResponseDto,
  CreatedBusinessResponseDto,
)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sach doanh nghiep',
    description:
      'Ho tro loc theo ten doanh nghiep, ma so thue, loai hinh, nganh nghe cap 4, phuong/xa va trang thai.',
  })
  @ApiOkResponse({
    description: 'Danh sach doanh nghiep kem meta phan trang',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(BusinessListResponseDto) },
          },
        },
      ],
    },
  })
  getBusinesses(@Query() query: ListBusinessesQueryDto) {
    return this.businessService.getBusinesses(query);
  }

  @Get('options')
  @ApiOperation({
    summary: 'Danh muc/rang buoc cho form doanh nghiep',
    description:
      'Tra ve danh sach loai hinh kinh doanh hop le, quy tac ma so thue va quy tac ma nganh nghe cap 4.',
  })
  @ApiOkResponse({
    description: 'Options cho form doanh nghiep',
    type: ApiSuccessResponseDto,
  })
  getBusinessOptions() {
    return this.businessService.getBusinessOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet doanh nghiep' })
  @ApiResponse({ status: 404, description: 'Khong tim thay doanh nghiep' })
  @ApiOkResponse({
    description: 'Chi tiet doanh nghiep de do vao form',
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
  getBusinessDetail(@Param('id', ParseIntPipe) id: number) {
    return this.businessService.getBusinessDetail(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Them moi doanh nghiep',
    description:
      'Nhan multipart/form-data de tao doanh nghiep va upload toi da 10 file dinh kem. Ma so thue: 10 so hoac 10 so-3 so. Ma nganh nghe cap 4: dung 4 chu so. Khi tao thanh cong, he thong tu tao tai khoan doanh nghiep voi username la ma so thue va password mac dinh 12345678.',
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
          description: '10 chu so hoac 10 so-3 so, vi du 0100109106-001',
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
        email: { type: 'string', example: 'vna@gmail.com' },
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
        isActive: { type: 'string', example: 'true' },
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
    description: 'Doanh nghiep vua tao kem thong tin tai khoan mac dinh',
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
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  createBusiness(
    @Body() createBusinessDto: CreateBusinessDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.businessService.createBusiness(createBusinessDto, files);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cap nhat doanh nghiep',
    description:
      'Nhan multipart/form-data. Neu gui attachments moi thi he thong them vao danh sach file hien co.',
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
        foreignName: { type: 'string', example: 'VNA International' },
        taxCode: { type: 'string', example: '0312345678' },
        businessType: {
          type: 'string',
          example: 'Cong ty TNHH 1 thanh vien',
        },
        industryCode: { type: 'string', example: '4669' },
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
        email: { type: 'string', example: 'vna@gmail.com' },
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
        isActive: { type: 'string', example: 'true' },
        attachmentNames: {
          type: 'string',
          example: '["Giay phep kinh doanh","Giay to khac"]',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
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
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  updateBusiness(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.businessService.updateBusiness(id, updateBusinessDto, files);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Bat/tat trang thai doanh nghiep' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['isActive'],
      properties: {
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiOkResponse({
    description: 'Doanh nghiep sau khi doi trang thai',
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
  updateBusinessStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: string | boolean,
  ) {
    return this.businessService.updateBusinessStatus(id, isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoa doanh nghiep' })
  @ApiOkResponse({
    description: 'Ket qua xoa doanh nghiep',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
              },
            },
          },
        },
      ],
    },
  })
  deleteBusiness(@Param('id', ParseIntPipe) id: number) {
    return this.businessService.deleteBusiness(id);
  }
}
