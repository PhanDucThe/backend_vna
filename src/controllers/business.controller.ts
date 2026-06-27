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
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';
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
@ApiTags('Doanh nghiệp')
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
    summary: 'Danh sách doanh nghiệp',
    description:
      'Hỗ trợ lọc theo tên doanh nghiệp, mã số thuế, loại hình, ngành nghề cấp 4, phường/xã và trạng thái.',
  })
  @ApiOkResponse({
    description: 'Danh sách doanh nghiệp kèm thông tin phân trang',
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
    summary: 'Danh mục/ràng buộc cho form doanh nghiệp',
    description:
      'Trả về danh sách loại hình kinh doanh hợp lệ, quy tắc mã số thuế và quy tắc mã ngành nghề cấp 4.',
  })
  @ApiOkResponse({
    description: 'Tùy chọn cho form doanh nghiệp',
    type: ApiSuccessResponseDto,
  })
  getBusinessOptions() {
    return this.businessService.getBusinessOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết doanh nghiệp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp' })
  @ApiOkResponse({
    description: 'Chi tiết doanh nghiệp để đổ dữ liệu vào form',
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
    summary: 'Thêm mới doanh nghiệp',
    description:
      'Nhận multipart/form-data để tạo doanh nghiệp và upload tối đa 10 file đính kèm. Mã số thuế: 10 chữ số hoặc 10 chữ số-3 chữ số. Mã ngành nghề cấp 4: đúng 4 chữ số. Khi tạo thành công, hệ thống tự tạo tài khoản doanh nghiệp với username là mã số thuế và password mặc định 12345678.',
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
          example: 'Công ty cổ phần công nghệ quốc tế VNA',
        },
        foreignName: {
          type: 'string',
          example: 'VNA International Technology Joint Stock Company',
        },
        taxCode: {
          type: 'string',
          example: '0312345678',
          description: '10 chữ số hoặc 10 chữ số-3 chữ số, ví dụ 0100109106-001',
        },
        businessType: {
          type: 'string',
          example: 'Công ty TNHH 1 thành viên',
        },
        industryCode: {
          type: 'string',
          example: '4669',
          description: 'Mã ngành nghề cấp 4 theo VSIC',
        },
        industryName: {
          type: 'string',
          example: 'Bán buôn chuyên doanh khác chưa được phân vào đâu',
        },
        licenseIssueDate: { type: 'string', example: '2020-01-01' },
        provinceCity: { type: 'string', example: 'Thành phố Hồ Chí Minh' },
        wardCommune: { type: 'string', example: 'Phường Hiệp Bình Phước' },
        address: {
          type: 'string',
          example: '162 đường số 2, khu đô thị Vạn Phúc',
        },
        email: { type: 'string', example: 'vna@gmail.com' },
        agencyPhone: { type: 'string', example: '02812345678' },
        operatingProvinceCity: {
          type: 'string',
          example: 'Thành phố Hồ Chí Minh',
        },
        operatingWardCommune: {
          type: 'string',
          example: 'Phường Hiệp Bình Phước',
        },
        businessLocation: {
          type: 'string',
          example: '162 đường số 2, khu đô thị Vạn Phúc',
        },
        representativeName: { type: 'string', example: 'Nguyễn Văn A' },
        representativePhone: { type: 'string', example: '0909123456' },
        isActive: { type: 'string', example: 'true' },
        attachmentNames: {
          type: 'string',
          example: '["Giấy phép kinh doanh","Giấy tờ mới"]',
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
    description: 'Doanh nghiệp vừa tạo kèm thông tin tài khoản mặc định',
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
    summary: 'Cập nhật doanh nghiệp',
    description:
      'Nhận multipart/form-data. Nếu gửi file đính kèm mới thì hệ thống sẽ thêm vào danh sách file hiện có.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        businessName: {
          type: 'string',
          example: 'Công ty cổ phần công nghệ quốc tế VNA',
        },
        foreignName: { type: 'string', example: 'VNA International' },
        taxCode: { type: 'string', example: '0312345678' },
        businessType: {
          type: 'string',
          example: 'Công ty TNHH 1 thành viên',
        },
        industryCode: { type: 'string', example: '4669' },
        industryName: {
          type: 'string',
          example: 'Bán buôn chuyên doanh khác chưa được phân vào đâu',
        },
        licenseIssueDate: { type: 'string', example: '2020-01-01' },
        provinceCity: { type: 'string', example: 'Thành phố Hồ Chí Minh' },
        wardCommune: { type: 'string', example: 'Phường Hiệp Bình Phước' },
        address: {
          type: 'string',
          example: '162 đường số 2, khu đô thị Vạn Phúc',
        },
        email: { type: 'string', example: 'vna@gmail.com' },
        agencyPhone: { type: 'string', example: '02812345678' },
        operatingProvinceCity: {
          type: 'string',
          example: 'Thành phố Hồ Chí Minh',
        },
        operatingWardCommune: {
          type: 'string',
          example: 'Phường Hiệp Bình Phước',
        },
        businessLocation: {
          type: 'string',
          example: '162 đường số 2, khu đô thị Vạn Phúc',
        },
        representativeName: { type: 'string', example: 'Nguyễn Văn A' },
        representativePhone: { type: 'string', example: '0909123456' },
        isActive: { type: 'string', example: 'true' },
        attachmentNames: {
          type: 'string',
          example: '["Giấy phép kinh doanh","Giấy tờ khác"]',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Doanh nghiệp sau khi cập nhật',
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
  @ApiOperation({ summary: 'Bật/tắt trạng thái doanh nghiệp' })
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
    description: 'Doanh nghiệp sau khi đổi trạng thái',
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
  @ApiOperation({ summary: 'Xóa doanh nghiệp' })
  @ApiOkResponse({
    description: 'Kết quả xóa doanh nghiệp',
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

  @Delete(':id/attachments/:attachmentId')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Xóa file đính kèm của doanh nghiệp' })
  deleteAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.businessService.deleteAttachment(id, attachmentId, currentUser);
  }
}
