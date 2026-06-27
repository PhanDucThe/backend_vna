import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
  ListMyLaborAccidentReportsQueryDto,
  SaveLaborAccidentReportDraftDto,
  SubmitLaborAccidentReportDto,
} from '../dtos/labor-accident-report.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
  LaborAccidentReportListResponseDto,
  LaborAccidentReportResponseDto,
} from '../dtos/swagger-response.dto';
import { LaborAccidentReportDetailSection } from '../entities/labor-accident-report-detail.entity';
import { LaborAccidentReportStatus } from '../entities/labor-accident-report.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { LaborAccidentReportService } from '../services/labor-accident-report.service';

@Controller('labor-accident-reports/my')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_CODES.EMPLOYEE)
@ApiTags('Báo cáo TNLĐ doanh nghiệp')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  LaborAccidentReportResponseDto,
  LaborAccidentReportListResponseDto,
)
export class LaborAccidentReportController {
  constructor(private readonly reportService: LaborAccidentReportService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách báo cáo TNLĐ của doanh nghiệp đang đăng nhập',
  })
  @ApiOkResponse({
    description: 'Danh sách báo cáo TNLĐ kèm phân trang',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportListResponseDto) },
          },
        },
      ],
    },
  })
  getMyReports(
    @CurrentUser() currentUser: CurrentUserData,
    @Query() query: ListMyLaborAccidentReportsQueryDto,
  ) {
    return this.reportService.getMyReports(currentUser.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết báo cáo TNLĐ của doanh nghiệp đang đăng nhập',
  })
  @ApiOkResponse({
    description: 'Chi tiết báo cáo TNLĐ',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportResponseDto) },
          },
        },
      ],
    },
  })
  getMyReportDetail(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportService.getMyReportDetail(currentUser.id, id);
  }

  @Post('draft')
  @ApiOperation({
    summary: 'Lưu nháp báo cáo TNLĐ',
    description:
      'Upsert báo cáo theo reportPeriodId. Nếu đã có báo cáo nháp cùng kỳ thì cập nhật, nếu chưa có thì tạo mới. Trường details nhận JSON array.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reportPeriodId'],
      properties: {
        reportPeriodId: { type: 'number', example: 1 },
        totalEmployees: { type: 'number', example: 10 },
        femaleEmployees: { type: 'number', example: 5 },
        totalPayroll: { type: 'number', example: 10000000 },
        totalAccidents: { type: 'number', example: 2 },
        fatalAccidents: { type: 'number', example: 1 },
        accidentsWithTwoOrMoreVictims: { type: 'number', example: 1 },
        totalVictims: { type: 'number', example: 10 },
        femaleVictims: { type: 'number', example: 5 },
        deathVictims: { type: 'number', example: 5 },
        severeInjuryVictims: { type: 'number', example: 10 },
        victimsNotUnderManagement: { type: 'number', example: 0 },
        femaleVictimsNotUnderManagement: { type: 'number', example: 0 },
        deathVictimsNotUnderManagement: { type: 'number', example: 0 },
        severeInjuryVictimsNotUnderManagement: { type: 'number', example: 0 },
        medicalCost: { type: 'number', example: 2000000 },
        salaryPaymentCost: { type: 'number', example: 2000000 },
        allowanceCost: { type: 'number', example: 2000000 },
        totalCost: { type: 'number', example: 6000000 },
        totalDaysOff: { type: 'number', example: 20 },
        propertyDamage: { type: 'number', example: 20000000 },
        details: {
          type: 'string',
          example: JSON.stringify([
            {
              section: LaborAccidentReportDetailSection.ACCIDENT,
              orderNo: 1,
              accidentCauseCatalogId: 1,
              injuryFactorCatalogId: 12,
              occupationCatalogId: 24,
              totalAccidents: 1,
              totalVictims: 5,
              medicalCost: 2000000,
              salaryPaymentCost: 2000000,
              allowanceCost: 2000000,
              totalCost: 6000000,
              daysOff: 20,
              propertyDamage: 20000000,
            },
          ]),
        },
        attachmentNames: {
          type: 'string',
          example: '["Báo cáo TNLĐ có dấu mộc"]',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Báo cáo sau khi lưu nháp',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportResponseDto) },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  saveDraft(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: SaveLaborAccidentReportDraftDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.reportService.saveDraft(currentUser.id, body, files);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Gửi báo cáo TNLĐ',
    description:
      'Doanh nghiệp gửi báo cáo nháp cho Sở. Bắt buộc báo cáo đã có ít nhất một file đính kèm, hoặc gửi file trong chính request này.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        attachmentNames: {
          type: 'string',
          example: '["Báo cáo TNLĐ có dấu mộc"]',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Báo cáo sau khi gửi',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LaborAccidentReportResponseDto) },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  submitReport(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SubmitLaborAccidentReportDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.reportService.submitReport(currentUser.id, id, body, files);
  }
}
