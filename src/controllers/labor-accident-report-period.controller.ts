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
  CreateLaborAccidentReportPeriodDto,
  ListLaborAccidentReportPeriodsQueryDto,
  UpdateLaborAccidentReportPeriodDto,
  UpdateLaborAccidentReportPeriodStatusDto,
} from '../dtos/labor-accident-report-period.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  LaborAccidentReportPeriodListResponseDto,
  LaborAccidentReportPeriodResponseDto,
} from '../dtos/swagger-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { LaborAccidentReportPeriodService } from '../services/labor-accident-report-period.service';

@Controller('labor-accident-report-periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiTags('Kỳ báo cáo TNLĐ')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  LaborAccidentReportPeriodResponseDto,
  LaborAccidentReportPeriodListResponseDto,
)
export class LaborAccidentReportPeriodController {
  constructor(
    private readonly reportPeriodService: LaborAccidentReportPeriodService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách cấu hình kỳ báo cáo TNLĐ',
    description:
      'Role Sở lọc cấu hình theo năm, tên báo cáo, kỳ báo cáo, thời gian và trạng thái.',
  })
  @ApiOkResponse({
    description: 'Danh sách cấu hình kỳ báo cáo kèm phân trang',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(LaborAccidentReportPeriodListResponseDto),
            },
          },
        },
      ],
    },
  })
  getReportPeriods(@Query() query: ListLaborAccidentReportPeriodsQueryDto) {
    return this.reportPeriodService.getReportPeriods(query);
  }

  @Get('options')
  @ApiOperation({
    summary: 'Tùy chọn form cấu hình kỳ báo cáo TNLĐ',
  })
  @ApiOkResponse({
    description: 'Danh mục tên báo cáo, kỳ báo cáo và trạng thái',
    type: ApiSuccessResponseDto,
  })
  getOptions() {
    return this.reportPeriodService.getOptions();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết cấu hình kỳ báo cáo TNLĐ',
  })
  @ApiOkResponse({
    description: 'Chi tiết cấu hình kỳ báo cáo',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(LaborAccidentReportPeriodResponseDto),
            },
          },
        },
      ],
    },
  })
  getReportPeriodDetail(@Param('id', ParseIntPipe) id: number) {
    return this.reportPeriodService.getReportPeriodDetail(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Thêm cấu hình kỳ báo cáo TNLĐ',
  })
  @ApiOkResponse({
    description: 'Cấu hình kỳ báo cáo vừa tạo',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(LaborAccidentReportPeriodResponseDto),
            },
          },
        },
      ],
    },
  })
  createReportPeriod(@Body() body: CreateLaborAccidentReportPeriodDto) {
    return this.reportPeriodService.createReportPeriod(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật cấu hình kỳ báo cáo TNLĐ',
  })
  @ApiOkResponse({
    description: 'Cấu hình kỳ báo cáo sau khi cập nhật',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(LaborAccidentReportPeriodResponseDto),
            },
          },
        },
      ],
    },
  })
  updateReportPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLaborAccidentReportPeriodDto,
  ) {
    return this.reportPeriodService.updateReportPeriod(id, body);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái cấu hình kỳ báo cáo TNLĐ',
  })
  @ApiOkResponse({
    description: 'Cấu hình kỳ báo cáo sau khi cập nhật trạng thái',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(LaborAccidentReportPeriodResponseDto),
            },
          },
        },
      ],
    },
  })
  updateReportPeriodStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLaborAccidentReportPeriodStatusDto,
  ) {
    return this.reportPeriodService.updateReportPeriodStatus(id, body);
  }
}
