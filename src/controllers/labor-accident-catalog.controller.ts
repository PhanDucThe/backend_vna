import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { Roles } from '../decorators/roles.decorator';
import {
  CreateLaborAccidentCatalogDto,
  ListLaborAccidentCatalogsQueryDto,
  UpdateLaborAccidentCatalogDto,
  UpdateLaborAccidentCatalogStatusDto,
} from '../dtos/labor-accident-catalog.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  LaborAccidentCatalogListResponseDto,
  LaborAccidentCatalogResponseDto,
} from '../dtos/swagger-response.dto';
import { LaborAccidentCatalogType } from '../entities/labor-accident-catalog.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { LaborAccidentCatalogService } from '../services/labor-accident-catalog.service';

@Controller('labor-accident-catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiTags('Danh mục TNLĐ')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  LaborAccidentCatalogResponseDto,
  LaborAccidentCatalogListResponseDto,
)
export class LaborAccidentCatalogController {
  constructor(private readonly catalogService: LaborAccidentCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách danh mục tai nạn lao động',
    description:
      'Role Sở quản lý nguyên nhân TNLĐ, yếu tố gây chấn thương, loại chấn thương và nghề nghiệp.',
  })
  @ApiOkResponse({
    description: 'Danh sách danh mục tai nạn lao động kèm phân trang',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(LaborAccidentCatalogListResponseDto),
            },
          },
        },
      ],
    },
  })
  getCatalogs(@Query() query: ListLaborAccidentCatalogsQueryDto) {
    return this.catalogService.getCatalogs(query);
  }

  @Get('types')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Loại danh mục tai nạn lao động',
  })
  @ApiOkResponse({
    description: 'Danh sách loại danh mục',
    type: ApiSuccessResponseDto,
  })
  getCatalogTypes() {
    return this.catalogService.getCatalogTypes();
  }

  @Get('options')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Tùy chọn danh mục tai nạn lao động đang sử dụng',
  })
  @ApiOkResponse({
    description: 'Danh sách option danh mục đang hoạt động',
    type: ApiSuccessResponseDto,
  })
  getCatalogOptions(@Query('type') type?: LaborAccidentCatalogType) {
    return this.catalogService.getCatalogOptions(type);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết danh mục tai nạn lao động',
  })
  @ApiOkResponse({
    description: 'Chi tiết danh mục tai nạn lao động',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentCatalogResponseDto) },
          },
        },
      ],
    },
  })
  getCatalogDetail(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getCatalogDetail(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Thêm danh mục tai nạn lao động',
  })
  @ApiOkResponse({
    description: 'Danh mục vừa tạo',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentCatalogResponseDto) },
          },
        },
      ],
    },
  })
  createCatalog(@Body() body: CreateLaborAccidentCatalogDto) {
    return this.catalogService.createCatalog(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật danh mục tai nạn lao động',
  })
  @ApiOkResponse({
    description: 'Danh mục sau khi cập nhật',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentCatalogResponseDto) },
          },
        },
      ],
    },
  })
  updateCatalog(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLaborAccidentCatalogDto,
  ) {
    return this.catalogService.updateCatalog(id, body);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái danh mục tai nạn lao động',
  })
  @ApiOkResponse({
    description: 'Danh mục sau khi cập nhật trạng thái',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentCatalogResponseDto) },
          },
        },
      ],
    },
  })
  updateCatalogStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLaborAccidentCatalogStatusDto,
  ) {
    return this.catalogService.updateCatalogStatus(id, body);
  }
}
