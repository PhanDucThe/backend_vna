import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type {} from 'multer';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import {
  LaborAccidentReportSummaryQueryDto,
  BulkReceiveLaborAccidentReportsDto,
  BulkRejectLaborAccidentReportsDto,
  ListLaborAccidentReportsQueryDto,
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
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Business } from '../entities/business.entity';
import {
  LaborAccidentCatalog,
  LaborAccidentCatalogType,
} from '../entities/labor-accident-catalog.entity';
import {
  LaborAccidentReportAttachment,
  LaborAccidentReportAttachmentType,
} from '../entities/labor-accident-report-attachment.entity';
import {
  LaborAccidentReportDetail,
  LaborAccidentReportDetailSection,
} from '../entities/labor-accident-report-detail.entity';
import {
  LaborAccidentReport,
  LaborAccidentReportStatus,
} from '../entities/labor-accident-report.entity';
import {
  LaborAccidentReportPeriod,
  LaborAccidentReportPeriodType,
} from '../entities/labor-accident-report-period.entity';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CloudinaryService } from './cloudinary.service';
import {
  MANAGEMENT_ROLE_CODES,
  ROLE_CODES,
} from '../constants/roles.constant';

const PERIOD_TYPE_LABELS: Record<LaborAccidentReportPeriodType, string> = {
  [LaborAccidentReportPeriodType.FULL_YEAR]: 'Cả năm',
  [LaborAccidentReportPeriodType.SIX_MONTHS]: '6 tháng',
};

const REPORT_STATUS_LABELS: Record<LaborAccidentReportStatus, string> = {
  [LaborAccidentReportStatus.DRAFT]: 'Đang báo cáo',
  [LaborAccidentReportStatus.SUBMITTED]: 'Đang chờ duyệt',
  [LaborAccidentReportStatus.RECEIVED]: 'Đã tiếp nhận',
  [LaborAccidentReportStatus.REJECTED]: 'Từ chối phê duyệt',
};

type DetailPayload = {
  section?: unknown;
  orderNo?: unknown;
  accidentCauseCatalogId?: unknown;
  injuryFactorCatalogId?: unknown;
  occupationCatalogId?: unknown;
  note?: unknown;
  totalAccidents?: unknown;
  fatalAccidents?: unknown;
  accidentsWithTwoOrMoreVictims?: unknown;
  totalVictims?: unknown;
  femaleVictims?: unknown;
  deathVictims?: unknown;
  severeInjuryVictims?: unknown;
  victimsNotUnderManagement?: unknown;
  femaleVictimsNotUnderManagement?: unknown;
  deathVictimsNotUnderManagement?: unknown;
  severeInjuryVictimsNotUnderManagement?: unknown;
  medicalCost?: unknown;
  salaryPaymentCost?: unknown;
  allowanceCost?: unknown;
  totalCost?: unknown;
  daysOff?: unknown;
  propertyDamage?: unknown;
};

type NormalizedDetailPayload = Omit<
  Partial<LaborAccidentReportDetail>,
  'id' | 'report' | 'createdAt' | 'updatedAt'
>;

type ReportMetricTotals = {
  totalAccidents: number;
  fatalAccidents: number;
  accidentsWithTwoOrMoreVictims: number;
  totalVictims: number;
  femaleVictims: number;
  deathVictims: number;
  severeInjuryVictims: number;
  victimsNotUnderManagement: number;
  femaleVictimsNotUnderManagement: number;
  deathVictimsNotUnderManagement: number;
  severeInjuryVictimsNotUnderManagement: number;
  medicalCost: number;
  salaryPaymentCost: number;
  allowanceCost: number;
  totalCost: number;
  totalDaysOff: number;
  propertyDamage: number;
};

type SummaryCatalogRow = {
  catalog: LaborAccidentCatalog;
  totals: ReportMetricTotals;
};

type OfficeExportFormat = 'excel' | 'word';

type OfficeExportFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

function sendOfficeExport(response: any, file: OfficeExportFile) {
  const asciiFilename = file.filename.replace(/[^\x20-\x7E]/g, '_');
  const encodedFilename = encodeURIComponent(file.filename);

  response.setHeader('Content-Type', file.contentType);
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
  );
  response.setHeader('Content-Length', file.buffer.length);
  response.send(file.buffer);
}

@Injectable()
export class LaborAccidentReportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(LaborAccidentCatalog)
    private readonly catalogRepository: Repository<LaborAccidentCatalog>,

    @InjectRepository(LaborAccidentReport)
    private readonly reportRepository: Repository<LaborAccidentReport>,

    @InjectRepository(LaborAccidentReportPeriod)
    private readonly reportPeriodRepository: Repository<LaborAccidentReportPeriod>,
  ) {}

  async getMyReports(
    userId: number,
    query: ListMyLaborAccidentReportsQueryDto,
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('business.id = :businessId', { businessId: business.id });

    if (query.year?.trim()) {
      queryBuilder.andWhere('reportPeriod.year = :year', {
        year: this.normalizeYear(query.year),
      });
    }

    if (query.periodType) {
      queryBuilder.andWhere('reportPeriod.periodType = :periodType', {
        periodType: query.periodType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: query.status,
      });
    }

    const [reports, totalItems] = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      message: 'Lấy danh sách báo cáo tai nạn lao động thành công',
      data: {
        items: reports.map((report) => this.mapReport(report, false)),
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    };
  }

  async getMyReportDetail(userId: number, reportId: number) {
    const business = await this.findBusinessByAccountUserId(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    return {
      message: 'Lấy chi tiết báo cáo tai nạn lao động thành công',
      data: this.mapReport(report, true),
    };
  }

  async saveDraft(
    userId: number,
    body: SaveLaborAccidentReportDraftDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const user = await this.findUser(userId);
    const reportPeriod = await this.findActiveReportPeriod(body.reportPeriodId);
    const existingReport = await this.findReportByBusinessAndPeriod(
      business.id,
      reportPeriod.id,
    );

    if (
      existingReport &&
      existingReport.status !== LaborAccidentReportStatus.DRAFT &&
      existingReport.status !== LaborAccidentReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Chỉ được cập nhật báo cáo đang trong trạng thái nháp hoặc bị từ chối phê duyệt',
      );
    }

    const normalizedDetails = await this.normalizeDetails(body.details);

    const savedReport = await this.dataSource.transaction(async (manager) => {
      const report = existingReport ?? manager.create(LaborAccidentReport, {});

      this.assignReportPayload(report, body, business, reportPeriod, user);
      this.validateReportAgainstDetails(
        report,
        normalizedDetails ?? existingReport?.details ?? [],
      );

      const persistedReport = await manager.save(LaborAccidentReport, report);

      if (normalizedDetails) {
        await manager.delete(LaborAccidentReportDetail, {
          report: { id: persistedReport.id },
        });

        for (const detail of normalizedDetails) {
          await manager.save(
            LaborAccidentReportDetail,
            manager.create(LaborAccidentReportDetail, {
              ...detail,
              report: persistedReport,
            }),
          );
        }
      }

      await this.saveAttachments(
        persistedReport,
        user,
        files,
        body.attachmentNames,
        manager,
      );

      return persistedReport;
    });

    const reportWithRelations = await this.findReportByIdForBusiness(
      savedReport.id,
      business.id,
    );

    return {
      message: 'Lưu nháp báo cáo tai nạn lao động thành công',
      data: this.mapReport(reportWithRelations, true),
    };
  }

  async submitReport(
    userId: number,
    reportId: number,
    body: SubmitLaborAccidentReportDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const user = await this.findUser(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    if (
      report.status !== LaborAccidentReportStatus.DRAFT &&
      report.status !== LaborAccidentReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Chỉ được gửi báo cáo đang ở trạng thái nháp hoặc bị từ chối',
      );
    }

    this.validateReportReadyToLock(report);

    const savedReport = await this.dataSource.transaction(async (manager) => {
      await this.saveAttachments(report, user, files, body.attachmentNames, manager);

      const attachmentCount = await manager.count(LaborAccidentReportAttachment, {
        where: {
          report: { id: report.id },
        },
      });

      if (attachmentCount < 1) {
        throw new BadRequestException(
          'Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty trước khi gửi',
        );
      }

      report.status = LaborAccidentReportStatus.SUBMITTED;
      report.submittedAt = new Date();
      report.submittedByUser = user;
      report.rejectReason = null;

      return manager.save(LaborAccidentReport, report);
    });

    const reportWithRelations = await this.findReportByIdForBusiness(
      savedReport.id,
      business.id,
    );

    return {
      message: 'Gửi báo cáo tai nạn lao động thành công',
      data: this.mapReport(reportWithRelations, true),
    };
  }

  async receiveDepartmentReport(userId: number, reportId: number) {
    const user = await this.findUser(userId);
    const report = await this.findReportByIdForDepartment(reportId);

    if (report.status !== LaborAccidentReportStatus.SUBMITTED) {
      throw new BadRequestException(
        'Chỉ được tiếp nhận báo cáo đang ở trạng thái đã gửi',
      );
    }

    this.validateReportReadyToLock(report);

    report.status = LaborAccidentReportStatus.RECEIVED;
    report.receivedAt = new Date();
    report.receivedByUser = user;

    const savedReport = await this.reportRepository.save(report);
    const reportWithRelations = await this.findReportByIdForDepartment(
      savedReport.id,
    );

    return {
      message: 'Tiếp nhận báo cáo tai nạn lao động thành công',
      data: this.mapReport(reportWithRelations, true),
    };
  }

  async getDepartmentReports(query: ListLaborAccidentReportsQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .leftJoinAndSelect('report.attachments', 'attachment')
      .where('1 = 1');

    this.applyDepartmentReportFilters(queryBuilder, query);

    const [reports, totalItems] = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      message: 'Lấy danh sách báo cáo tai nạn lao động thành công',
      data: {
        items: reports.map((report) => this.mapReport(report, false)),
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    };
  }

  async getDepartmentReportDetail(reportId: number) {
    const report = await this.findReportByIdForDepartment(reportId);

    return {
      message: 'Lấy chi tiết báo cáo tai nạn lao động thành công',
      data: this.mapReport(report, true),
    };
  }

  async getDepartmentReportSummary(query: LaborAccidentReportSummaryQueryDto) {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.business', 'business')
      .leftJoinAndSelect('report.reportPeriod', 'reportPeriod')
      .leftJoinAndSelect('report.details', 'detail')
      .leftJoinAndSelect('detail.accidentCauseCatalog', 'accidentCauseCatalog')
      .leftJoinAndSelect('detail.injuryFactorCatalog', 'injuryFactorCatalog')
      .leftJoinAndSelect('detail.occupationCatalog', 'occupationCatalog')
      .where('1 = 1');

    this.applyDepartmentReportFilters(queryBuilder, query);

    const reports = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .getMany();

    const totals = this.createEmptyMetricTotals();
    const byAccidentCause = new Map<number, SummaryCatalogRow>();
    const byInjuryFactor = new Map<number, SummaryCatalogRow>();
    const byOccupation = new Map<number, SummaryCatalogRow>();
    const article39Allowance = this.createEmptyMetricTotals();

    for (const report of reports) {
      this.addReportTotals(totals, report);

      for (const detail of report.details ?? []) {
        if (detail.section === LaborAccidentReportDetailSection.ACCIDENT) {
          this.addCatalogSummaryRow(
            byAccidentCause,
            detail.accidentCauseCatalog,
            detail,
          );
          this.addCatalogSummaryRow(
            byInjuryFactor,
            detail.injuryFactorCatalog,
            detail,
          );
          this.addCatalogSummaryRow(byOccupation, detail.occupationCatalog, detail);
        }

        if (
          detail.section === LaborAccidentReportDetailSection.ARTICLE_39_ALLOWANCE
        ) {
          this.addDetailTotals(article39Allowance, detail);
        }
      }
    }

    return {
      message: 'Lấy báo cáo tổng hợp tai nạn lao động thành công',
      data: {
        filters: this.mapSummaryFilters(query),
        reportCount: reports.length,
        totals,
        byAccidentCause: this.mapSummaryCatalogRows(byAccidentCause),
        byInjuryFactor: this.mapSummaryCatalogRows(byInjuryFactor),
        byOccupation: this.mapSummaryCatalogRows(byOccupation),
        article39Allowance,
        damage: {
          totalDaysOff: totals.totalDaysOff,
          medicalCost: totals.medicalCost,
          salaryPaymentCost: totals.salaryPaymentCost,
          allowanceCost: totals.allowanceCost,
          totalCost: totals.totalCost,
          propertyDamage: totals.propertyDamage,
        },
      },
    };
  }

  async exportMyReport(
    userId: number,
    reportId: number,
    format: OfficeExportFormat,
  ) {
    const business = await this.findBusinessByAccountUserId(userId);
    const report = await this.findReportByIdForBusiness(reportId, business.id);

    return this.createOfficeFile(
      this.buildReportOfficeHtml(this.mapReport(report, true)),
      this.createReportFilename(report, format),
      format,
    );
  }

  async exportDepartmentReport(
    reportId: number,
    format: OfficeExportFormat,
  ) {
    const report = await this.findReportByIdForDepartment(reportId);

    return this.createOfficeFile(
      this.buildReportOfficeHtml(this.mapReport(report, true)),
      this.createReportFilename(report, format),
      format,
    );
  }

  async exportDepartmentSummary(
    query: LaborAccidentReportSummaryQueryDto,
    format: OfficeExportFormat,
  ) {
    const summaryResponse = await this.getDepartmentReportSummary(query);

    return this.createOfficeFile(
      this.buildSummaryOfficeHtml(summaryResponse.data),
      `bao-cao-tong-hop-tnld.${format === 'excel' ? 'xls' : 'doc'}`,
      format,
    );
  }

  private async findBusinessByAccountUserId(userId: number) {
    const business = await this.businessRepository.findOne({
      where: {
        accountUser: { id: userId },
      },
      relations: {
        accountUser: true,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Không tìm thấy doanh nghiệp của tài khoản đang đăng nhập',
      );
    }

    return business;
  }

  private async findUser(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản đang đăng nhập');
    }

    return user;
  }

  private async findActiveReportPeriod(value: string | number) {
    const reportPeriodId = this.normalizePositiveInteger(value, 'Kỳ báo cáo');
    const reportPeriod = await this.reportPeriodRepository.findOne({
      where: {
        id: reportPeriodId,
        isActive: true,
      },
    });

    if (!reportPeriod) {
      throw new BadRequestException(
        'Kỳ báo cáo không tồn tại hoặc không còn hoạt động',
      );
    }

    return reportPeriod;
  }

  private findReportByBusinessAndPeriod(businessId: number, periodId: number) {
    return this.reportRepository.findOne({
      where: {
        business: { id: businessId },
        reportPeriod: { id: periodId },
      },
      relations: {
        reportPeriod: true,
        business: true,
        details: {
          accidentCauseCatalog: true,
          injuryFactorCatalog: true,
          occupationCatalog: true,
        },
        attachments: true,
      },
      order: {
        details: {
          section: 'ASC',
          orderNo: 'ASC',
        },
      },
    });
  }

  private async findReportByIdForBusiness(reportId: number, businessId: number) {
    const report = await this.reportRepository.findOne({
      where: {
        id: reportId,
        business: { id: businessId },
      },
      relations: {
        business: true,
        reportPeriod: true,
        details: {
          accidentCauseCatalog: true,
          injuryFactorCatalog: true,
          occupationCatalog: true,
        },
        attachments: {
          uploadedByUser: true,
        },
        createdByUser: true,
        submittedByUser: true,
        receivedByUser: true,
      },
      order: {
        details: {
          section: 'ASC',
          orderNo: 'ASC',
        },
        attachments: {
          id: 'ASC',
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo tai nạn lao động');
    }

    return report;
  }

  private async findReportByIdForDepartment(reportId: number) {
    const report = await this.reportRepository.findOne({
      where: {
        id: reportId,
      },
      relations: {
        business: true,
        reportPeriod: true,
        details: {
          accidentCauseCatalog: true,
          injuryFactorCatalog: true,
          occupationCatalog: true,
        },
        attachments: {
          uploadedByUser: true,
        },
        createdByUser: true,
        submittedByUser: true,
        receivedByUser: true,
      },
      order: {
        details: {
          section: 'ASC',
          orderNo: 'ASC',
        },
        attachments: {
          id: 'ASC',
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo tai nạn lao động');
    }

    return report;
  }

  private applyDepartmentReportFilters(
    queryBuilder: SelectQueryBuilder<LaborAccidentReport>,
    query: ListLaborAccidentReportsQueryDto | LaborAccidentReportSummaryQueryDto,
  ) {
    if (query.reportPeriodId?.trim()) {
      queryBuilder.andWhere('reportPeriod.id = :reportPeriodId', {
        reportPeriodId: this.normalizePositiveInteger(
          query.reportPeriodId,
          'Kỳ báo cáo',
        ),
      });
    }

    if (query.year?.trim()) {
      queryBuilder.andWhere('reportPeriod.year = :year', {
        year: this.normalizeYear(query.year),
      });
    }

    if (query.periodType) {
      queryBuilder.andWhere('reportPeriod.periodType = :periodType', {
        periodType: query.periodType,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: query.status,
      });
    } else {
      queryBuilder.andWhere('report.status != :draftStatus', {
        draftStatus: LaborAccidentReportStatus.DRAFT,
      });
    }

    if ('businessName' in query && query.businessName?.trim()) {
      queryBuilder.andWhere('LOWER(report.businessName) LIKE :businessName', {
        businessName: this.toLikeValue(query.businessName),
      });
    }

    if ('taxCode' in query && query.taxCode?.trim()) {
      queryBuilder.andWhere('LOWER(report.taxCode) LIKE :taxCode', {
        taxCode: this.toLikeValue(query.taxCode),
      });
    }

    if (query.provinceCity?.trim()) {
      queryBuilder.andWhere('LOWER(business.provinceCity) LIKE :provinceCity', {
        provinceCity: this.toLikeValue(query.provinceCity),
      });
    }

    if (query.wardCommune?.trim()) {
      queryBuilder.andWhere('LOWER(business.wardCommune) LIKE :wardCommune', {
        wardCommune: this.toLikeValue(query.wardCommune),
      });
    }
  }

  private assignReportPayload(
    report: LaborAccidentReport,
    body: SaveLaborAccidentReportDraftDto,
    business: Business,
    reportPeriod: LaborAccidentReportPeriod,
    user: User,
  ) {
    const medicalCost = this.normalizeMoney(
      body.medicalCost,
      report.medicalCost ?? 0,
      'Chi phí y tế',
    );
    const salaryPaymentCost = this.normalizeMoney(
      body.salaryPaymentCost,
      report.salaryPaymentCost ?? 0,
      'Chi phí trả lương trong thời gian điều trị',
    );
    const allowanceCost = this.normalizeMoney(
      body.allowanceCost,
      report.allowanceCost ?? 0,
      'Chi phí bồi thường trợ cấp',
    );

    report.business = business;
    report.reportPeriod = reportPeriod;
    report.rejectReason = null;
    report.businessName = business.businessName;
    report.taxCode = business.taxCode;
    report.businessType = business.businessType;
    report.industryCode = business.industryCode;
    report.industryName = business.industryName;
    report.totalEmployees = this.normalizeInteger(
      body.totalEmployees,
      report.totalEmployees ?? 0,
      'Tổng số lao động của cơ sở',
    );
    report.femaleEmployees = this.normalizeInteger(
      body.femaleEmployees,
      report.femaleEmployees ?? 0,
      'Tổng số lao động nữ',
    );
    report.totalPayroll = this.normalizeMoney(
      body.totalPayroll,
      report.totalPayroll ?? 0,
      'Tổng quỹ lương',
    );
    report.totalAccidents = this.normalizeInteger(
      body.totalAccidents,
      report.totalAccidents ?? 0,
      'Tổng số vụ tai nạn lao động',
    );
    report.fatalAccidents = this.normalizeInteger(
      body.fatalAccidents,
      report.fatalAccidents ?? 0,
      'Tổng số vụ có người chết',
    );
    report.accidentsWithTwoOrMoreVictims = this.normalizeInteger(
      body.accidentsWithTwoOrMoreVictims,
      report.accidentsWithTwoOrMoreVictims ?? 0,
      'Tổng số vụ có 2 người bị nạn trở lên',
    );
    report.totalVictims = this.normalizeInteger(
      body.totalVictims,
      report.totalVictims ?? 0,
      'Tổng số người bị nạn',
    );
    report.femaleVictims = this.normalizeInteger(
      body.femaleVictims,
      report.femaleVictims ?? 0,
      'Tổng số lao động nữ bị nạn',
    );
    report.deathVictims = this.normalizeInteger(
      body.deathVictims,
      report.deathVictims ?? 0,
      'Tổng số người bị chết',
    );
    report.severeInjuryVictims = this.normalizeInteger(
      body.severeInjuryVictims,
      report.severeInjuryVictims ?? 0,
      'Tổng số người bị thương nặng',
    );
    report.victimsNotUnderManagement = this.normalizeInteger(
      body.victimsNotUnderManagement,
      report.victimsNotUnderManagement ?? 0,
      'Số người bị nạn không thuộc quyền quản lý',
    );
    report.femaleVictimsNotUnderManagement = this.normalizeInteger(
      body.femaleVictimsNotUnderManagement,
      report.femaleVictimsNotUnderManagement ?? 0,
      'Lao động nữ bị nạn không thuộc quyền quản lý',
    );
    report.deathVictimsNotUnderManagement = this.normalizeInteger(
      body.deathVictimsNotUnderManagement,
      report.deathVictimsNotUnderManagement ?? 0,
      'Số người chết không thuộc quyền quản lý',
    );
    report.severeInjuryVictimsNotUnderManagement = this.normalizeInteger(
      body.severeInjuryVictimsNotUnderManagement,
      report.severeInjuryVictimsNotUnderManagement ?? 0,
      'Người bị thương nặng không thuộc quyền quản lý',
    );
    report.medicalCost = medicalCost;
    report.salaryPaymentCost = salaryPaymentCost;
    report.allowanceCost = allowanceCost;
    report.totalCost =
      body.totalCost === undefined
        ? medicalCost + salaryPaymentCost + allowanceCost
        : this.normalizeMoney(body.totalCost, report.totalCost ?? 0, 'Tổng số tiền chi phí');
    report.totalDaysOff = this.normalizeInteger(
      body.totalDaysOff,
      report.totalDaysOff ?? 0,
      'Tổng số ngày nghỉ vì TNLĐ',
    );
    report.propertyDamage = this.normalizeMoney(
      body.propertyDamage,
      report.propertyDamage ?? 0,
      'Thiệt hại tài sản',
    );
    this.validateReportMetrics(report);
    report.status = LaborAccidentReportStatus.DRAFT;
    report.createdByUser = report.createdByUser ?? user;
  }

  private async normalizeDetails(value: string | unknown[] | undefined) {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsedValue = this.parseDetails(value);
    const normalizedDetails: NormalizedDetailPayload[] = [];
    const detailKeys = new Set<string>();

    for (const [index, item] of parsedValue.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new BadRequestException(`Chi tiết báo cáo dòng ${index + 1} không hợp lệ`);
      }

      const payload = item as DetailPayload;
      const section = this.normalizeDetailSection(payload.section, index);
      const orderNo = this.normalizePositiveInteger(
        payload.orderNo ?? index + 1,
        `Số thứ tự chi tiết dòng ${index + 1}`,
      );
      const key = `${section}:${orderNo}`;

      if (detailKeys.has(key)) {
        throw new BadRequestException(
          `Chi tiết báo cáo dòng ${index + 1} bị trùng mục và số thứ tự`,
        );
      }

      detailKeys.add(key);

      const accidentCauseCatalog = await this.findCatalogByType(
        payload.accidentCauseCatalogId,
        LaborAccidentCatalogType.ACCIDENT_CAUSE,
        'Nguyên nhân xảy ra TNLĐ',
      );
      const injuryFactorCatalog = await this.findCatalogByType(
        payload.injuryFactorCatalogId,
        LaborAccidentCatalogType.INJURY_FACTOR,
        'Yếu tố gây chấn thương',
      );
      const occupationCatalog = await this.findCatalogByType(
        payload.occupationCatalogId,
        LaborAccidentCatalogType.OCCUPATION,
        'Nghề nghiệp',
      );
      const medicalCost = this.normalizeMoney(payload.medicalCost, 0, 'Chi phí y tế');
      const salaryPaymentCost = this.normalizeMoney(
        payload.salaryPaymentCost,
        0,
        'Chi phí trả lương trong thời gian điều trị',
      );
      const allowanceCost = this.normalizeMoney(
        payload.allowanceCost,
        0,
        'Chi phí bồi thường trợ cấp',
      );

      normalizedDetails.push({
        section,
        orderNo,
        accidentCauseCatalog,
        injuryFactorCatalog,
        occupationCatalog,
        note: this.toTrimmedValue(payload.note) ?? null,
        totalAccidents: this.normalizeInteger(payload.totalAccidents, 0, 'Tổng số vụ'),
        fatalAccidents: this.normalizeInteger(payload.fatalAccidents, 0, 'Số vụ có người chết'),
        accidentsWithTwoOrMoreVictims: this.normalizeInteger(
          payload.accidentsWithTwoOrMoreVictims,
          0,
          'Số vụ có từ 2 người bị nạn trở lên',
        ),
        totalVictims: this.normalizeInteger(payload.totalVictims, 0, 'Tổng số người bị nạn'),
        femaleVictims: this.normalizeInteger(payload.femaleVictims, 0, 'Số lao động nữ'),
        deathVictims: this.normalizeInteger(payload.deathVictims, 0, 'Số người bị chết'),
        severeInjuryVictims: this.normalizeInteger(
          payload.severeInjuryVictims,
          0,
          'Số người bị thương nặng',
        ),
        victimsNotUnderManagement: this.normalizeInteger(
          payload.victimsNotUnderManagement,
          0,
          'Người bị nạn không thuộc quyền quản lý',
        ),
        femaleVictimsNotUnderManagement: this.normalizeInteger(
          payload.femaleVictimsNotUnderManagement,
          0,
          'Lao động nữ bị nạn không thuộc quyền quản lý',
        ),
        deathVictimsNotUnderManagement: this.normalizeInteger(
          payload.deathVictimsNotUnderManagement,
          0,
          'Người chết không thuộc quyền quản lý',
        ),
        severeInjuryVictimsNotUnderManagement: this.normalizeInteger(
          payload.severeInjuryVictimsNotUnderManagement,
          0,
          'Người bị thương nặng không thuộc quyền quản lý',
        ),
        medicalCost,
        salaryPaymentCost,
        allowanceCost,
        totalCost:
          payload.totalCost === undefined
            ? medicalCost + salaryPaymentCost + allowanceCost
            : this.normalizeMoney(payload.totalCost, 0, 'Tổng số tiền chi phí'),
        daysOff: this.normalizeInteger(payload.daysOff, 0, 'Số ngày nghỉ vì TNLĐ'),
        propertyDamage: this.normalizeMoney(payload.propertyDamage, 0, 'Thiệt hại tài sản'),
      });

      this.validateMetricPayload(
        normalizedDetails[normalizedDetails.length - 1],
        `Chi tiết báo cáo dòng ${index + 1}`,
      );
    }

    return normalizedDetails;
  }

  private parseDetails(value: string | unknown[]) {
    if (Array.isArray(value)) {
      return value;
    }

    try {
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return parsedValue;
      }
    } catch {
      throw new BadRequestException('Chi tiết báo cáo không đúng định dạng JSON array');
    }

    throw new BadRequestException('Chi tiết báo cáo phải là JSON array');
  }

  private normalizeDetailSection(value: unknown, index: number) {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(
        `Mục chi tiết báo cáo dòng ${index + 1} không được để trống`,
      );
    }

    if (
      !Object.values(LaborAccidentReportDetailSection).includes(
        value as LaborAccidentReportDetailSection,
      )
    ) {
      throw new BadRequestException(
        `Mục chi tiết báo cáo dòng ${index + 1} không hợp lệ`,
      );
    }

    return value as LaborAccidentReportDetailSection;
  }

  private async findCatalogByType(
    value: unknown,
    type: LaborAccidentCatalogType,
    label: string,
  ) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const id = this.normalizePositiveInteger(value, label);
    const catalog = await this.catalogRepository.findOne({
      where: {
        id,
        type,
        isActive: true,
      },
    });

    if (!catalog) {
      throw new BadRequestException(`${label} không tồn tại hoặc không còn sử dụng`);
    }

    return catalog;
  }

  private async saveAttachments(
    report: LaborAccidentReport,
    user: User,
    files: Express.Multer.File[],
    attachmentNames: string | undefined,
    manager: EntityManager,
  ) {
    if (!files.length) {
      return;
    }

    const names = this.parseAttachmentNames(attachmentNames);
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER_LABOR_ACCIDENT_REPORTS') ||
      'labor-accident-reports';

    for (const [index, file] of files.entries()) {
      const uploadResult = await this.cloudinaryService.uploadFile(file, folder);

      await manager.save(
        LaborAccidentReportAttachment,
        manager.create(LaborAccidentReportAttachment, {
          report,
          type: LaborAccidentReportAttachmentType.STAMPED_REPORT,
          displayName: names[index] || file.originalname,
          originalName: file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          mimetype: file.mimetype,
          size: file.size,
          uploadedByUser: user,
        }),
      );
    }
  }

  private parseAttachmentNames(value: string | undefined) {
    if (!value?.trim()) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return parsedValue.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated values below.
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeYear(value: string | number) {
    const year = Number(value);

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new BadRequestException('Năm báo cáo không hợp lệ');
    }

    return year;
  }

  private normalizePositiveInteger(value: unknown, label: string) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
  }

  private normalizeInteger(value: unknown, currentValue: number, label: string) {
    if (value === undefined || value === null || value === '') {
      return Number(currentValue) || 0;
    }

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
  }

  private normalizeMoney(value: unknown, currentValue: number, label: string) {
    if (value === undefined || value === null || value === '') {
      return Number(currentValue) || 0;
    }

    const normalizedValue =
      typeof value === 'string' ? this.normalizeMoneyString(value) : value;
    const numberValue = Number(normalizedValue);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
  }

  private normalizeMoneyString(value: string) {
    const trimmedValue = value.trim().replace(/\s/g, '');

    if (!trimmedValue) {
      return '';
    }

    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmedValue)) {
      return trimmedValue.replace(/\./g, '').replace(',', '.');
    }

    return trimmedValue.replace(/,/g, '');
  }

  private validateReportMetrics(report: LaborAccidentReport) {
    const errors: string[] = [];

    this.collectReportMetricErrors(report, errors);
    this.throwValidationErrors(errors);
  }

  private validateReportReadyToLock(report: LaborAccidentReport) {
    const errors: string[] = [];
    const accidentDetails =
      report.details?.filter(
        (detail) => detail.section === LaborAccidentReportDetailSection.ACCIDENT,
      ) ?? [];

    this.collectReportMetricErrors(report, errors);
    this.collectReportDetailConsistencyErrors(report, report.details ?? [], errors);

    if (this.metricValue(report, 'totalEmployees') < 1) {
      errors.push('Tổng số lao động của cơ sở phải lớn hơn 0 trước khi gửi báo cáo');
    }

    if (this.metricValue(report, 'totalAccidents') > 0 && !accidentDetails.length) {
      errors.push(
        'Vui lòng nhập chi tiết các vụ tai nạn lao động trước khi gửi báo cáo',
      );
    }

    this.throwValidationErrors(errors);
  }

  private validateMetricPayload(source: Record<string, unknown>, label: string) {
    const errors: string[] = [];

    this.collectMetricPayloadErrors(source, label, errors);
    this.throwValidationErrors(errors);
  }

  private validateReportAgainstDetails(
    report: LaborAccidentReport,
    details: Array<Partial<LaborAccidentReportDetail>>,
  ) {
    const errors: string[] = [];

    this.collectReportDetailConsistencyErrors(report, details, errors);
    this.throwValidationErrors(errors);
  }

  private collectReportMetricErrors(
    report: LaborAccidentReport,
    errors: string[],
  ) {
    const totalEmployees = this.metricValue(report, 'totalEmployees');
    const femaleEmployees = this.metricValue(report, 'femaleEmployees');

    if (femaleEmployees > totalEmployees) {
      errors.push(
        'Tổng số lao động nữ không được lớn hơn tổng số lao động của cơ sở',
      );
    }

    this.collectMetricPayloadErrors(report as unknown as Record<string, unknown>, 'Tổng quan báo cáo', errors);
  }

  private collectMetricPayloadErrors(
    source: Record<string, unknown>,
    label: string,
    errors: string[],
  ) {
    const totalAccidents = this.metricValue(source, 'totalAccidents');
    const fatalAccidents = this.metricValue(source, 'fatalAccidents');
    const accidentsWithTwoOrMoreVictims = this.metricValue(
      source,
      'accidentsWithTwoOrMoreVictims',
    );
    const totalVictims = this.metricValue(source, 'totalVictims');
    const femaleVictims = this.metricValue(source, 'femaleVictims');
    const deathVictims = this.metricValue(source, 'deathVictims');
    const severeInjuryVictims = this.metricValue(source, 'severeInjuryVictims');
    const victimsNotUnderManagement = this.metricValue(
      source,
      'victimsNotUnderManagement',
    );
    const femaleVictimsNotUnderManagement = this.metricValue(
      source,
      'femaleVictimsNotUnderManagement',
    );
    const deathVictimsNotUnderManagement = this.metricValue(
      source,
      'deathVictimsNotUnderManagement',
    );
    const severeInjuryVictimsNotUnderManagement = this.metricValue(
      source,
      'severeInjuryVictimsNotUnderManagement',
    );
    const medicalCost = this.metricValue(source, 'medicalCost');
    const salaryPaymentCost = this.metricValue(source, 'salaryPaymentCost');
    const allowanceCost = this.metricValue(source, 'allowanceCost');
    const totalCost = this.metricValue(source, 'totalCost');

    this.collectMaxRule(errors, label, 'Số vụ có người chết', fatalAccidents, 'Tổng số vụ', totalAccidents);
    this.collectMaxRule(
      errors,
      label,
      'Số vụ có từ 2 người bị nạn trở lên',
      accidentsWithTwoOrMoreVictims,
      'Tổng số vụ',
      totalAccidents,
    );
    this.collectMaxRule(errors, label, 'Số lao động nữ bị nạn', femaleVictims, 'Tổng số người bị nạn', totalVictims);
    this.collectMaxRule(errors, label, 'Số người bị chết', deathVictims, 'Tổng số người bị nạn', totalVictims);
    this.collectMaxRule(errors, label, 'Số người bị thương nặng', severeInjuryVictims, 'Tổng số người bị nạn', totalVictims);
    this.collectMaxRule(
      errors,
      label,
      'Số người bị nạn không thuộc quyền quản lý',
      victimsNotUnderManagement,
      'Tổng số người bị nạn',
      totalVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Lao động nữ bị nạn không thuộc quyền quản lý',
      femaleVictimsNotUnderManagement,
      'Số lao động nữ bị nạn',
      femaleVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Số người chết không thuộc quyền quản lý',
      deathVictimsNotUnderManagement,
      'Số người bị chết',
      deathVictims,
    );
    this.collectMaxRule(
      errors,
      label,
      'Người bị thương nặng không thuộc quyền quản lý',
      severeInjuryVictimsNotUnderManagement,
      'Số người bị thương nặng',
      severeInjuryVictims,
    );

    if (totalAccidents === 0 && totalVictims > 0) {
      errors.push(`${label}: Tổng số người bị nạn phải bằng 0 khi tổng số vụ bằng 0`);
    }

    if (totalAccidents > 0 && totalVictims < 1) {
      errors.push(`${label}: Tổng số người bị nạn phải lớn hơn 0 khi có vụ tai nạn`);
    }

    if (fatalAccidents > deathVictims) {
      errors.push(
        `${label}: Số người bị chết phải lớn hơn hoặc bằng số vụ có người chết`,
      );
    }

    if (deathVictims + severeInjuryVictims > totalVictims) {
      errors.push(
        `${label}: Tổng số người bị chết và bị thương nặng không được lớn hơn tổng số người bị nạn`,
      );
    }

    if (accidentsWithTwoOrMoreVictims > 0 && totalVictims < accidentsWithTwoOrMoreVictims * 2) {
      errors.push(
        `${label}: Tổng số người bị nạn chưa phù hợp với số vụ có từ 2 người bị nạn trở lên`,
      );
    }

    if (
      this.roundMoney(totalCost) !==
      this.roundMoney(medicalCost + salaryPaymentCost + allowanceCost)
    ) {
      errors.push(
        `${label}: Tổng số tiền chi phí phải bằng chi phí y tế + trả lương trong thời gian điều trị + bồi thường/trợ cấp`,
      );
    }
  }

  private collectReportDetailConsistencyErrors(
    report: LaborAccidentReport,
    details: Array<Partial<LaborAccidentReportDetail>>,
    errors: string[],
  ) {
    const accidentDetails = details.filter(
      (detail) => detail.section === LaborAccidentReportDetailSection.ACCIDENT,
    );

    if (!accidentDetails.length) {
      return;
    }

    for (const field of this.getDetailConsistencyFields()) {
      const reportValue = this.metricValue(report, field.reportKey);
      const detailValue = accidentDetails.reduce(
        (sum, detail) => sum + this.metricValue(detail, field.detailKey),
        0,
      );

      if (this.roundMoney(reportValue) !== this.roundMoney(detailValue)) {
        errors.push(
          `Tổng quan báo cáo: ${field.label} phải bằng tổng chi tiết các vụ tai nạn lao động (${this.formatNumber(detailValue)})`,
        );
      }
    }
  }

  private getDetailConsistencyFields() {
    return [
      { label: 'Tổng số vụ', reportKey: 'totalAccidents', detailKey: 'totalAccidents' },
      { label: 'Số vụ có người chết', reportKey: 'fatalAccidents', detailKey: 'fatalAccidents' },
      {
        label: 'Số vụ có từ 2 người bị nạn trở lên',
        reportKey: 'accidentsWithTwoOrMoreVictims',
        detailKey: 'accidentsWithTwoOrMoreVictims',
      },
      { label: 'Tổng số người bị nạn', reportKey: 'totalVictims', detailKey: 'totalVictims' },
      { label: 'Số lao động nữ bị nạn', reportKey: 'femaleVictims', detailKey: 'femaleVictims' },
      { label: 'Số người bị chết', reportKey: 'deathVictims', detailKey: 'deathVictims' },
      { label: 'Số người bị thương nặng', reportKey: 'severeInjuryVictims', detailKey: 'severeInjuryVictims' },
      {
        label: 'Số người bị nạn không thuộc quyền quản lý',
        reportKey: 'victimsNotUnderManagement',
        detailKey: 'victimsNotUnderManagement',
      },
      {
        label: 'Lao động nữ bị nạn không thuộc quyền quản lý',
        reportKey: 'femaleVictimsNotUnderManagement',
        detailKey: 'femaleVictimsNotUnderManagement',
      },
      {
        label: 'Số người chết không thuộc quyền quản lý',
        reportKey: 'deathVictimsNotUnderManagement',
        detailKey: 'deathVictimsNotUnderManagement',
      },
      {
        label: 'Người bị thương nặng không thuộc quyền quản lý',
        reportKey: 'severeInjuryVictimsNotUnderManagement',
        detailKey: 'severeInjuryVictimsNotUnderManagement',
      },
      { label: 'Chi phí y tế', reportKey: 'medicalCost', detailKey: 'medicalCost' },
      {
        label: 'Trả lương trong thời gian điều trị',
        reportKey: 'salaryPaymentCost',
        detailKey: 'salaryPaymentCost',
      },
      { label: 'Bồi thường/trợ cấp', reportKey: 'allowanceCost', detailKey: 'allowanceCost' },
      { label: 'Tổng số tiền chi phí', reportKey: 'totalCost', detailKey: 'totalCost' },
      { label: 'Tổng số ngày nghỉ vì TNLĐ', reportKey: 'totalDaysOff', detailKey: 'daysOff' },
      { label: 'Thiệt hại tài sản', reportKey: 'propertyDamage', detailKey: 'propertyDamage' },
    ];
  }

  private collectMaxRule(
    errors: string[],
    label: string,
    childLabel: string,
    childValue: number,
    parentLabel: string,
    parentValue: number,
  ) {
    if (childValue > parentValue) {
      errors.push(`${label}: ${childLabel} không được lớn hơn ${parentLabel}`);
    }
  }

  private metricValue(source: any, key: string) {
    const value = Number(source?.[key] ?? 0);

    return Number.isFinite(value) ? value : 0;
  }

  private roundMoney(value: number) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private throwValidationErrors(errors: string[]) {
    if (errors.length) {
      throw new BadRequestException(errors);
    }
  }

  private createEmptyMetricTotals(): ReportMetricTotals {
    return {
      totalAccidents: 0,
      fatalAccidents: 0,
      accidentsWithTwoOrMoreVictims: 0,
      totalVictims: 0,
      femaleVictims: 0,
      deathVictims: 0,
      severeInjuryVictims: 0,
      victimsNotUnderManagement: 0,
      femaleVictimsNotUnderManagement: 0,
      deathVictimsNotUnderManagement: 0,
      severeInjuryVictimsNotUnderManagement: 0,
      medicalCost: 0,
      salaryPaymentCost: 0,
      allowanceCost: 0,
      totalCost: 0,
      totalDaysOff: 0,
      propertyDamage: 0,
    };
  }

  private addReportTotals(
    target: ReportMetricTotals,
    report: LaborAccidentReport,
  ) {
    target.totalAccidents += Number(report.totalAccidents) || 0;
    target.fatalAccidents += Number(report.fatalAccidents) || 0;
    target.accidentsWithTwoOrMoreVictims +=
      Number(report.accidentsWithTwoOrMoreVictims) || 0;
    target.totalVictims += Number(report.totalVictims) || 0;
    target.femaleVictims += Number(report.femaleVictims) || 0;
    target.deathVictims += Number(report.deathVictims) || 0;
    target.severeInjuryVictims += Number(report.severeInjuryVictims) || 0;
    target.victimsNotUnderManagement +=
      Number(report.victimsNotUnderManagement) || 0;
    target.femaleVictimsNotUnderManagement +=
      Number(report.femaleVictimsNotUnderManagement) || 0;
    target.deathVictimsNotUnderManagement +=
      Number(report.deathVictimsNotUnderManagement) || 0;
    target.severeInjuryVictimsNotUnderManagement +=
      Number(report.severeInjuryVictimsNotUnderManagement) || 0;
    target.medicalCost += Number(report.medicalCost) || 0;
    target.salaryPaymentCost += Number(report.salaryPaymentCost) || 0;
    target.allowanceCost += Number(report.allowanceCost) || 0;
    target.totalCost += Number(report.totalCost) || 0;
    target.totalDaysOff += Number(report.totalDaysOff) || 0;
    target.propertyDamage += Number(report.propertyDamage) || 0;
  }

  private addDetailTotals(
    target: ReportMetricTotals,
    detail: LaborAccidentReportDetail,
  ) {
    target.totalAccidents += Number(detail.totalAccidents) || 0;
    target.fatalAccidents += Number(detail.fatalAccidents) || 0;
    target.accidentsWithTwoOrMoreVictims +=
      Number(detail.accidentsWithTwoOrMoreVictims) || 0;
    target.totalVictims += Number(detail.totalVictims) || 0;
    target.femaleVictims += Number(detail.femaleVictims) || 0;
    target.deathVictims += Number(detail.deathVictims) || 0;
    target.severeInjuryVictims += Number(detail.severeInjuryVictims) || 0;
    target.victimsNotUnderManagement +=
      Number(detail.victimsNotUnderManagement) || 0;
    target.femaleVictimsNotUnderManagement +=
      Number(detail.femaleVictimsNotUnderManagement) || 0;
    target.deathVictimsNotUnderManagement +=
      Number(detail.deathVictimsNotUnderManagement) || 0;
    target.severeInjuryVictimsNotUnderManagement +=
      Number(detail.severeInjuryVictimsNotUnderManagement) || 0;
    target.medicalCost += Number(detail.medicalCost) || 0;
    target.salaryPaymentCost += Number(detail.salaryPaymentCost) || 0;
    target.allowanceCost += Number(detail.allowanceCost) || 0;
    target.totalCost += Number(detail.totalCost) || 0;
    target.totalDaysOff += Number(detail.daysOff) || 0;
    target.propertyDamage += Number(detail.propertyDamage) || 0;
  }

  private addCatalogSummaryRow(
    target: Map<number, SummaryCatalogRow>,
    catalog: LaborAccidentCatalog | null,
    detail: LaborAccidentReportDetail,
  ) {
    if (!catalog) {
      return;
    }

    let row = target.get(catalog.id);

    if (!row) {
      row = {
        catalog,
        totals: this.createEmptyMetricTotals(),
      };
      target.set(catalog.id, row);
    }

    this.addDetailTotals(row.totals, detail);
  }

  private mapSummaryCatalogRows(target: Map<number, SummaryCatalogRow>) {
    return Array.from(target.values())
      .sort((first, second) => {
        if (first.catalog.level !== second.catalog.level) {
          return first.catalog.level - second.catalog.level;
        }

        return first.catalog.code.localeCompare(second.catalog.code, 'vi', {
          numeric: true,
        });
      })
      .map((row) => ({
        catalog: this.mapCatalog(row.catalog),
        totals: row.totals,
      }));
  }

  private mapSummaryFilters(query: LaborAccidentReportSummaryQueryDto) {
    return {
      reportPeriodId: query.reportPeriodId
        ? this.normalizePositiveInteger(query.reportPeriodId, 'Kỳ báo cáo')
        : null,
      year: query.year ? this.normalizeYear(query.year) : null,
      periodType: query.periodType ?? null,
      periodTypeLabel: query.periodType ? PERIOD_TYPE_LABELS[query.periodType] : null,
      status: query.status ?? null,
      statusLabel: query.status ? REPORT_STATUS_LABELS[query.status] : null,
      provinceCity: this.toTrimmedValue(query.provinceCity) ?? null,
      wardCommune: this.toTrimmedValue(query.wardCommune) ?? null,
    };
  }

  private createOfficeFile(
    html: string,
    filename: string,
    format: OfficeExportFormat,
  ): OfficeExportFile {
    return {
      buffer: Buffer.from(`\uFEFF${html}`, 'utf8'),
      filename,
      contentType:
        format === 'excel'
          ? 'application/vnd.ms-excel; charset=utf-8'
          : 'application/msword; charset=utf-8',
    };
  }

  private createReportFilename(
    report: LaborAccidentReport,
    format: OfficeExportFormat,
  ) {
    const extension = format === 'excel' ? 'xls' : 'doc';
    const periodTypeLabel = report.reportPeriod?.periodType
      ? PERIOD_TYPE_LABELS[report.reportPeriod.periodType]
      : 'ky-bao-cao';
    const filename = [
      'bao-cao-tnld',
      report.taxCode || report.businessName,
      report.reportPeriod?.year,
      periodTypeLabel,
    ]
      .filter(Boolean)
      .join('-');

    return `${this.slugify(filename)}.${extension}`;
  }

  private buildSummaryOfficeHtml(summary: any) {
    const title = 'Báo cáo tổng hợp tình hình tai nạn lao động';

    return this.buildOfficeHtml(title, [
      this.buildSummaryFilterTable(summary),
      this.buildMetricTable('I. Tổng số tai nạn lao động', summary?.totals),
      this.buildCatalogMetricTable(
        '1.1 Phân theo nguyên nhân xảy ra TNLĐ',
        summary?.byAccidentCause,
      ),
      this.buildCatalogMetricTable(
        '1.2 Phân theo yếu tố gây chấn thương',
        summary?.byInjuryFactor,
      ),
      this.buildCatalogMetricTable(
        '1.3 Phân theo nghề nghiệp',
        summary?.byOccupation,
      ),
      this.buildMetricTable(
        '2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ',
        summary?.article39Allowance,
      ),
      this.buildDamageTable(summary?.damage),
    ]);
  }

  private buildReportOfficeHtml(report: any) {
    const details = Array.isArray(report?.details) ? report.details : [];
    const accidentDetails = details.filter(
      (detail) => detail.section === LaborAccidentReportDetailSection.ACCIDENT,
    );
    const article39Details = details.filter(
      (detail) =>
        detail.section === LaborAccidentReportDetailSection.ARTICLE_39_ALLOWANCE,
    );
    const title = `Báo cáo tai nạn lao động - ${
      report?.business?.businessName ?? report?.businessName ?? ''
    }`;

    return this.buildOfficeHtml(title, [
      this.buildReportInfoTable(report),
      this.buildMetricTable(
        'I. Tổng số vụ tai nạn lao động và số nạn nhân tai nạn lao động',
        report,
      ),
      this.buildReportDetailTable('1. Chi tiết các vụ tai nạn lao động', accidentDetails),
      this.buildReportDetailTable(
        '2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ',
        article39Details,
      ),
      this.buildDamageTable(report),
      this.buildAttachmentTable(report?.attachments),
    ]);
  }

  private buildOfficeHtml(title: string, sections: string[]) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4 landscape;
      margin: 0.45in;
      mso-page-orientation: landscape;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #111827;
      background: #ffffff;
      margin: 0;
    }
    .report-wrapper {
      width: 100%;
      max-width: 1500px;
      margin: 0 auto;
    }
    .report-title {
      font-size: 18pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      margin: 0 0 6px;
      color: #0f172a;
    }
    .report-subtitle {
      text-align: center;
      margin: 0 0 16px;
      color: #475569;
      font-size: 10pt;
      font-style: italic;
    }
    .section-title {
      font-size: 12pt;
      font-weight: 700;
      margin: 18px 0 8px;
      color: #0f172a;
      padding: 6px 8px;
      border-left: 4px solid #2563eb;
      background: #eff6ff;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 14px;
      table-layout: fixed;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    th,
    td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
      vertical-align: middle;
      word-wrap: break-word;
      white-space: normal;
      mso-number-format: "\\@";
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      text-align: center;
    }
    .meta-table th,
    .meta-table td {
      height: 28px;
    }
    .meta-label {
      background: #f8fafc;
      font-weight: 700;
      width: 18%;
    }
    .meta-value {
      width: 32%;
    }
    .metric-table th {
      font-size: 9pt;
      line-height: 1.25;
    }
    .metric-table td {
      height: 28px;
    }
    .metric-name {
      text-align: left;
      font-weight: 600;
    }
    .number {
      text-align: right;
      mso-number-format: "#,##0";
    }
    .center {
      text-align: center;
    }
    .muted {
      color: #64748b;
      font-style: italic;
      font-size: 10pt;
    }
    .empty {
      color: #64748b;
      font-style: italic;
      text-align: center;
    }
    .total-row td {
      background: #f8fafc;
      font-weight: 700;
    }
    .signature-table td {
      border: none;
      text-align: center;
      padding-top: 22px;
      height: 90px;
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    <div class="report-title">${this.escapeHtml(title)}</div>
    <div class="report-subtitle">Đơn vị tiền tệ: đồng; số ngày nghỉ: ngày; số liệu thống kê: vụ/người</div>
    ${sections.join('\n')}
  </div>
</body>
</html>`;
  }

  private buildSummaryFilterTable(summary: any) {
    const filters = summary?.filters ?? {};

    return `<div class="section-title">Th&ocirc;ng tin t&#7893;ng h&#7907;p</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tr>
    <td class="meta-label">S&#7889; b&aacute;o c&aacute;o</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(summary?.reportCount))}</td>
    <td class="meta-label">Tr&#7841;ng th&aacute;i</td>
    <td class="meta-value">${filters.statusLabel || filters.status ? this.escapeHtml(filters.statusLabel ?? filters.status) : 'T&#7845;t c&#7843;'}</td>
  </tr>
  <tr>
    <td class="meta-label">N&#259;m</td>
    <td class="meta-value">${filters.year ? this.escapeHtml(filters.year) : 'T&#7845;t c&#7843;'}</td>
    <td class="meta-label">K&#7923; b&aacute;o c&aacute;o</td>
    <td class="meta-value">${filters.periodTypeLabel || filters.periodType ? this.escapeHtml(filters.periodTypeLabel ?? filters.periodType) : 'T&#7845;t c&#7843;'}</td>
  </tr>
  <tr>
    <td class="meta-label">T&#7881;nh/th&agrave;nh ph&#7889;</td>
    <td class="meta-value">${filters.provinceCity ? this.escapeHtml(filters.provinceCity) : 'T&#7845;t c&#7843;'}</td>
    <td class="meta-label">Ph&#432;&#7901;ng/x&atilde;</td>
    <td class="meta-value">${filters.wardCommune ? this.escapeHtml(filters.wardCommune) : 'T&#7845;t c&#7843;'}</td>
  </tr>
</table>`;
  }

  private buildReportInfoTable(report: any) {
    const period = report?.reportPeriod ?? {};
    const business = report?.business ?? {};

    return `<div class="section-title">Th&ocirc;ng tin doanh nghi&#7879;p</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tr>
    <td class="meta-label">T&ecirc;n doanh nghi&#7879;p</td>
    <td class="meta-value" colspan="3">${this.escapeHtml(business.businessName ?? report?.businessName)}</td>
  </tr>
  <tr>
    <td class="meta-label">M&atilde; s&#7889; thu&#7871;</td>
    <td class="meta-value">${this.escapeHtml(business.taxCode ?? report?.taxCode)}</td>
    <td class="meta-label">Lo&#7841;i h&igrave;nh</td>
    <td class="meta-value">${this.escapeHtml(business.businessType ?? report?.businessType)}</td>
  </tr>
  <tr>
    <td class="meta-label">Ng&agrave;nh ngh&#7873;</td>
    <td class="meta-value" colspan="3">${this.escapeHtml(this.joinDisplay([business.industryCode ?? report?.industryCode, business.industryName ?? report?.industryName]))}</td>
  </tr>
  <tr>
    <td class="meta-label">T&ecirc;n b&aacute;o c&aacute;o</td>
    <td class="meta-value">${this.escapeHtml(period.reportName)}</td>
    <td class="meta-label">K&#7923; b&aacute;o c&aacute;o</td>
    <td class="meta-value">${this.escapeHtml(this.joinDisplay([period.year, period.periodTypeLabel ?? period.periodType]))}</td>
  </tr>
  <tr>
    <td class="meta-label">Th&#7901;i gian</td>
    <td class="meta-value">${this.escapeHtml(this.joinDisplay([period.startDate, period.endDate], ' - '))}</td>
    <td class="meta-label">Tr&#7841;ng th&aacute;i</td>
    <td class="meta-value">${this.escapeHtml(report?.statusLabel ?? report?.status)}</td>
  </tr>
  <tr>
    <td class="meta-label">Ng&agrave;y g&#7917;i</td>
    <td class="meta-value">${this.escapeHtml(this.formatDateForOffice(report?.submittedAt))}</td>
    <td class="meta-label">Ng&agrave;y ti&#7871;p nh&#7853;n</td>
    <td class="meta-value">${this.escapeHtml(this.formatDateForOffice(report?.receivedAt))}</td>
  </tr>
</table>
<div class="section-title">Th&ocirc;ng tin lao &#273;&#7897;ng</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tr>
    <td class="meta-label">T&#7893;ng lao &#273;&#7897;ng</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(report?.totalEmployees))}</td>
    <td class="meta-label">Lao &#273;&#7897;ng n&#7919;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(report?.femaleEmployees))}</td>
  </tr>
  <tr>
    <td class="meta-label">T&#7893;ng qu&#7929; l&#432;&#417;ng</td>
    <td class="meta-value number" colspan="3">${this.escapeHtml(this.formatNumber(report?.totalPayroll))}</td>
  </tr>
</table>`;
  }

  private buildMetricTable(title: string, source: any) {
    return `<div class="section-title">${this.escapeHtml(title)}</div>
<table class="metric-table">
  ${this.buildMetricColGroup()}
  ${this.buildMetricHeaderRows()}
  <tr class="total-row">${this.getMetricExportColumns()
    .map((column) => this.numberCell(source?.[column.key]))
    .join('')}</tr>
</table>`;
  }

  private buildCatalogMetricTable(title: string, rows: any[]) {
    const normalizedRows = Array.isArray(rows) ? rows : [];

    return `<div class="section-title">${this.escapeHtml(title)}</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 7%" />
    <col style="width: 25%" />
    ${this.getMetricExportColumns().map(() => '<col style="width: 6.18%" />').join('')}
  </colgroup>
  ${this.buildMetricHeaderRows([
    { labelHtml: 'M&atilde; s&#7889;', width: '7%' },
    { labelHtml: 'T&ecirc;n ch&#7881; ti&ecirc;u th&#7889;ng k&ecirc;', width: '25%' },
  ])}
  ${
    normalizedRows.length
      ? normalizedRows
          .map(
            (row) =>
              `<tr><td class="center">${this.escapeHtml(row?.catalog?.code)}</td><td class="metric-name">${this.escapeHtml(row?.catalog?.name)}</td>${this.getMetricExportColumns()
                .map((column) => this.numberCell(row?.totals?.[column.key]))
                .join('')}</tr>`,
          )
          .join('\n')
      : `<tr><td colspan="${this.getMetricExportColumns().length + 2}" class="empty">Ch&#432;a c&oacute; d&#7919; li&#7879;u</td></tr>`
  }
</table>`;
  }

  private buildReportDetailTable(title: string, details: any[]) {
    const normalizedDetails = Array.isArray(details) ? details : [];
    const damageColumns = [
      { labelHtml: 'Chi ph&iacute;<br/>y t&#7871;', key: 'medicalCost' },
      { labelHtml: 'Tr&#7843; l&#432;&#417;ng<br/>trong TG &#273;i&#7873;u tr&#7883;', key: 'salaryPaymentCost' },
      { labelHtml: 'B&#7891;i th&#432;&#7901;ng/<br/>tr&#7907; c&#7845;p', key: 'allowanceCost' },
      { labelHtml: 'T&#7893;ng<br/>chi ph&iacute;', key: 'totalCost' },
      { labelHtml: 'S&#7889; ng&agrave;y<br/>ngh&#7881;', key: 'daysOff' },
      { labelHtml: 'Thi&#7879;t h&#7841;i<br/>t&agrave;i s&#7843;n', key: 'propertyDamage' },
    ];

    return `<div class="section-title">${this.escapeHtml(title)}</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 4%" />
    <col style="width: 14%" />
    <col style="width: 13%" />
    <col style="width: 13%" />
    <col style="width: 8%" />
    ${this.getMetricExportColumns().map(() => '<col style="width: 4.8%" />').join('')}
    ${damageColumns.map(() => '<col style="width: 6%" />').join('')}
  </colgroup>
  <tr>
    <th rowspan="2">STT</th>
    <th rowspan="2">Nguy&ecirc;n nh&acirc;n x&#7843;y ra TNL&#272;</th>
    <th rowspan="2">Y&#7871;u t&#7889; g&acirc;y ch&#7845;n th&#432;&#417;ng</th>
    <th rowspan="2">Ngh&#7873; nghi&#7879;p</th>
    <th rowspan="2">Ghi ch&uacute;</th>
    <th colspan="3">S&#7889; v&#7909; (v&#7909;)</th>
    <th colspan="8">S&#7889; ng&#432;&#7901;i b&#7883; n&#7841;n (ng&#432;&#7901;i)</th>
    <th colspan="6">Thi&#7879;t h&#7841;i</th>
  </tr>
  <tr>
    ${this.getMetricExportColumns().map((column) => `<th>${column.labelHtml}</th>`).join('')}
    ${damageColumns.map((column) => `<th>${column.labelHtml}</th>`).join('')}
  </tr>
  ${
    normalizedDetails.length
      ? normalizedDetails
          .map(
            (detail, index) => `<tr>
    <td class="center">${index + 1}</td>
    <td>${this.escapeHtml(this.catalogDisplay(detail.accidentCauseCatalog))}</td>
    <td>${this.escapeHtml(this.catalogDisplay(detail.injuryFactorCatalog))}</td>
    <td>${this.escapeHtml(this.catalogDisplay(detail.occupationCatalog))}</td>
    <td>${this.escapeHtml(detail.note)}</td>
    ${this.getMetricExportColumns()
      .map((column) => this.numberCell(detail?.[column.key]))
      .join('')}
    ${damageColumns.map((column) => this.numberCell(detail?.[column.key])).join('')}
  </tr>`,
          )
          .join('\n')
      : `<tr><td colspan="${this.getMetricExportColumns().length + damageColumns.length + 5}" class="empty">Ch&#432;a c&oacute; d&#7919; li&#7879;u</td></tr>`
  }
</table>`;
  }

  private buildDamageTable(source: any) {
    return `<div class="section-title">II. Thi&#7879;t h&#7841;i do tai n&#7841;n lao &#273;&#7897;ng</div>
<table class="meta-table">
  <colgroup>
    <col style="width: 28%" />
    <col style="width: 22%" />
    <col style="width: 28%" />
    <col style="width: 22%" />
  </colgroup>
  <tr>
    <td class="meta-label">T&#7893;ng s&#7889; ng&agrave;y ngh&#7881; v&igrave; TNL&#272;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.totalDaysOff ?? source?.daysOff))}</td>
    <td class="meta-label">Thi&#7879;t h&#7841;i t&agrave;i s&#7843;n</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.propertyDamage))}</td>
  </tr>
  <tr>
    <td class="meta-label">Chi ph&iacute; y t&#7871;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.medicalCost))}</td>
    <td class="meta-label">Tr&#7843; l&#432;&#417;ng trong th&#7901;i gian &#273;i&#7873;u tr&#7883;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.salaryPaymentCost))}</td>
  </tr>
  <tr class="total-row">
    <td class="meta-label">B&#7891;i th&#432;&#7901;ng/tr&#7907; c&#7845;p</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.allowanceCost))}</td>
    <td class="meta-label">T&#7893;ng s&#7889; ti&#7873;n chi ph&iacute;</td>
    <td class="meta-value number">${this.escapeHtml(this.formatNumber(source?.totalCost))}</td>
  </tr>
</table>`;
  }

  private buildAttachmentTable(attachments: any[]) {
    const normalizedAttachments = Array.isArray(attachments) ? attachments : [];

    return `<div class="section-title">T&#7879;p &#273;&iacute;nh k&egrave;m</div>
<table class="metric-table">
  <colgroup>
    <col style="width: 6%" />
    <col style="width: 18%" />
    <col style="width: 24%" />
    <col style="width: 24%" />
    <col style="width: 28%" />
  </colgroup>
  <tr><th>STT</th><th>Lo&#7841;i t&#7879;p</th><th>T&ecirc;n hi&#7875;n th&#7883;</th><th>T&ecirc;n file g&#7889;c</th><th>&#272;&#432;&#7901;ng d&#7851;n</th></tr>
  ${
    normalizedAttachments.length
      ? normalizedAttachments
          .map((attachment, index) =>
            `<tr><td class="center">${index + 1}</td><td>${this.escapeHtml(attachment.type)}</td><td>${this.escapeHtml(attachment.displayName)}</td><td>${this.escapeHtml(attachment.originalName)}</td><td>${this.escapeHtml(attachment.fileUrl)}</td></tr>`,
          )
          .join('\n')
      : '<tr><td colspan="5" class="empty">Ch&#432;a c&oacute; t&#7879;p &#273;&iacute;nh k&egrave;m</td></tr>'
  }
</table>`;
  }

  private buildMetricColGroup() {
    return `<colgroup>${this.getMetricExportColumns()
      .map(() => '<col style="width: 9.09%" />')
      .join('')}</colgroup>`;
  }

  private buildMetricHeaderRows(
    leadingColumns: Array<{ labelHtml: string; width?: string }> = [],
  ) {
    const leadingHeader = leadingColumns
      .map((column) => `<th rowspan="2">${column.labelHtml}</th>`)
      .join('');

    return `<tr>
    ${leadingHeader}
    <th colspan="3">S&#7889; v&#7909; (v&#7909;)</th>
    <th colspan="8">S&#7889; ng&#432;&#7901;i b&#7883; n&#7841;n (ng&#432;&#7901;i)</th>
  </tr>
  <tr>
    ${this.getMetricExportColumns().map((column) => `<th>${column.labelHtml}</th>`).join('')}
  </tr>`;
  }

  private getMetricExportColumns() {
    return [
      { labelHtml: 'T&#7893;ng<br/>s&#7889;', key: 'totalAccidents' },
      { labelHtml: 'C&oacute; ng&#432;&#7901;i<br/>ch&#7871;t', key: 'fatalAccidents' },
      {
        labelHtml: 'C&oacute; t&#7915; 2<br/>ng&#432;&#7901;i b&#7883; n&#7841;n',
        key: 'accidentsWithTwoOrMoreVictims',
      },
      { labelHtml: 'T&#7893;ng<br/>s&#7889;', key: 'totalVictims' },
      { labelHtml: 'Lao &#273;&#7897;ng<br/>n&#7919;', key: 'femaleVictims' },
      { labelHtml: 'Ng&#432;&#7901;i<br/>ch&#7871;t', key: 'deathVictims' },
      { labelHtml: 'Th&#432;&#417;ng<br/>n&#7863;ng', key: 'severeInjuryVictims' },
      { labelHtml: 'B&#7883; n&#7841;n<br/>kh&ocirc;ng QL', key: 'victimsNotUnderManagement' },
      {
        labelHtml: 'Lao &#273;&#7897;ng n&#7919;<br/>kh&ocirc;ng QL',
        key: 'femaleVictimsNotUnderManagement',
      },
      { labelHtml: 'Ch&#7871;t<br/>kh&ocirc;ng QL', key: 'deathVictimsNotUnderManagement' },
      {
        labelHtml: 'Th&#432;&#417;ng n&#7863;ng<br/>kh&ocirc;ng QL',
        key: 'severeInjuryVictimsNotUnderManagement',
      },
    ];
  }

  private tableRow(cells: unknown[], cellTag: 'td' | 'th' = 'td') {
    return `<tr>${cells
      .map((cell) => `<${cellTag}>${this.escapeHtml(cell)}</${cellTag}>`)
      .join('')}</tr>`;
  }

  private numberCell(value: unknown) {
    return `<td class="number">${this.escapeHtml(this.formatNumber(value))}</td>`;
  }

  private formatNumber(value: unknown) {
    const numericValue = Number(value ?? 0);

    return new Intl.NumberFormat('vi-VN').format(
      Number.isFinite(numericValue) ? numericValue : 0,
    );
  }

  private formatDateForOffice(value: unknown) {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('vi-VN');
  }

  private catalogDisplay(catalog: any) {
    if (!catalog) {
      return '';
    }

    return this.joinDisplay([catalog.code, catalog.name]);
  }

  private joinDisplay(values: unknown[], separator = ' - ') {
    return values
      .filter((value) => value !== undefined && value !== null && String(value).trim())
      .map((value) => String(value).trim())
      .join(separator);
  }

  private escapeHtml(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

    return slug || 'bao-cao-tnld';
  }

  private toPositiveNumber(value: string | undefined, defaultValue: number) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      return defaultValue;
    }

    return numberValue;
  }

  private toLikeValue(value: string) {
    return `%${value.trim().toLowerCase()}%`;
  }

  private toTrimmedValue(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const trimmedValue = String(value).trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  private formatDateInput(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.toISOString().slice(0, 10);
  }

  private mapReport(report: LaborAccidentReport, includeDetails: boolean) {
    return {
      id: report.id,
      reportPeriod: {
        id: report.reportPeriod.id,
        reportName: report.reportPeriod.reportName,
        year: report.reportPeriod.year,
        periodType: report.reportPeriod.periodType,
        periodTypeLabel: PERIOD_TYPE_LABELS[report.reportPeriod.periodType],
        startDate: this.formatDateInput(report.reportPeriod.startDate),
        endDate: this.formatDateInput(report.reportPeriod.endDate),
      },
      business: {
        id: report.business?.id ?? null,
        businessName: report.businessName,
        taxCode: report.taxCode,
        businessType: report.businessType,
        industryCode: report.industryCode,
        industryName: report.industryName,
        provinceCity: report.business?.provinceCity ?? null,
        wardCommune: report.business?.wardCommune ?? null,
        address: report.business?.address ?? null,
        phone: report.business?.phone ?? null,
        agencyPhone: report.business?.agencyPhone ?? null,
        email: report.business?.email ?? null,
        representativeName: report.business?.representativeName ?? null,
        representativePhone: report.business?.representativePhone ?? null,
      },
      totalEmployees: Number(report.totalEmployees) || 0,
      femaleEmployees: Number(report.femaleEmployees) || 0,
      totalPayroll: Number(report.totalPayroll) || 0,
      totalAccidents: Number(report.totalAccidents) || 0,
      fatalAccidents: Number(report.fatalAccidents) || 0,
      accidentsWithTwoOrMoreVictims:
        Number(report.accidentsWithTwoOrMoreVictims) || 0,
      totalVictims: Number(report.totalVictims) || 0,
      femaleVictims: Number(report.femaleVictims) || 0,
      deathVictims: Number(report.deathVictims) || 0,
      severeInjuryVictims: Number(report.severeInjuryVictims) || 0,
      victimsNotUnderManagement: Number(report.victimsNotUnderManagement) || 0,
      femaleVictimsNotUnderManagement:
        Number(report.femaleVictimsNotUnderManagement) || 0,
      deathVictimsNotUnderManagement:
        Number(report.deathVictimsNotUnderManagement) || 0,
      severeInjuryVictimsNotUnderManagement:
        Number(report.severeInjuryVictimsNotUnderManagement) || 0,
      medicalCost: Number(report.medicalCost) || 0,
      salaryPaymentCost: Number(report.salaryPaymentCost) || 0,
      allowanceCost: Number(report.allowanceCost) || 0,
      totalCost: Number(report.totalCost) || 0,
      totalDaysOff: Number(report.totalDaysOff) || 0,
      propertyDamage: Number(report.propertyDamage) || 0,
      status: report.status,
      statusLabel: REPORT_STATUS_LABELS[report.status],
      submittedAt: report.submittedAt,
      receivedAt: report.receivedAt,
      rejectReason: report.rejectReason ?? null,
      details: includeDetails
        ? report.details?.map((detail) => this.mapDetail(detail)) ?? []
        : undefined,
      attachments: report.attachments?.map((attachment) => ({
        id: attachment.id,
        type: attachment.type,
        displayName: attachment.displayName,
        originalName: attachment.originalName,
        fileUrl: attachment.fileUrl,
        mimetype: attachment.mimetype,
        size: attachment.size,
        uploadedByUserId: attachment.uploadedByUser?.id ?? null,
        uploadedByUsername: attachment.uploadedByUser?.username ?? null,
        createdAt: attachment.createdAt,
      })) ?? [],
      attachmentCount: report.attachments?.length ?? 0,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private mapDetail(detail: LaborAccidentReportDetail) {
    return {
      id: detail.id,
      section: detail.section,
      orderNo: detail.orderNo,
      accidentCauseCatalog: this.mapCatalog(detail.accidentCauseCatalog),
      injuryFactorCatalog: this.mapCatalog(detail.injuryFactorCatalog),
      occupationCatalog: this.mapCatalog(detail.occupationCatalog),
      note: detail.note,
      totalAccidents: Number(detail.totalAccidents) || 0,
      fatalAccidents: Number(detail.fatalAccidents) || 0,
      accidentsWithTwoOrMoreVictims:
        Number(detail.accidentsWithTwoOrMoreVictims) || 0,
      totalVictims: Number(detail.totalVictims) || 0,
      femaleVictims: Number(detail.femaleVictims) || 0,
      deathVictims: Number(detail.deathVictims) || 0,
      severeInjuryVictims: Number(detail.severeInjuryVictims) || 0,
      victimsNotUnderManagement: Number(detail.victimsNotUnderManagement) || 0,
      femaleVictimsNotUnderManagement:
        Number(detail.femaleVictimsNotUnderManagement) || 0,
      deathVictimsNotUnderManagement:
        Number(detail.deathVictimsNotUnderManagement) || 0,
      severeInjuryVictimsNotUnderManagement:
        Number(detail.severeInjuryVictimsNotUnderManagement) || 0,
      medicalCost: Number(detail.medicalCost) || 0,
      salaryPaymentCost: Number(detail.salaryPaymentCost) || 0,
      allowanceCost: Number(detail.allowanceCost) || 0,
      totalCost: Number(detail.totalCost) || 0,
      daysOff: Number(detail.daysOff) || 0,
      propertyDamage: Number(detail.propertyDamage) || 0,
    };
  }

  private mapCatalog(catalog: LaborAccidentCatalog | null) {
    if (!catalog) {
      return null;
    }

    return {
      id: catalog.id,
      type: catalog.type,
      code: catalog.code,
      name: catalog.name,
      level: catalog.level,
    };
  }

  async bulkReceiveDepartmentReports(userId: number, reportIds: number[]) {
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      throw new BadRequestException('Danh sách báo cáo không được để trống');
    }

    const user = await this.findUser(userId);
    let receivedCount = 0;

    for (const reportId of [...new Set(reportIds)]) {
      if (!Number.isInteger(reportId) || reportId <= 0) {
        continue;
      }

      try {
        const report = await this.findReportByIdForDepartment(reportId);

        if (report.status !== LaborAccidentReportStatus.SUBMITTED) {
          continue;
        }

        this.validateReportReadyToLock(report);
        report.status = LaborAccidentReportStatus.RECEIVED;
        report.receivedAt = new Date();
        report.receivedByUser = user;
        report.rejectReason = null;
        await this.reportRepository.save(report);
        receivedCount += 1;
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          continue;
        }

        throw error;
      }
    }

    return {
      message: `Duyệt thành công ${receivedCount}/${reportIds.length} báo cáo`,
      success: true,
    };
  }

  async bulkRejectDepartmentReports(
    userId: number,
    reportIds: number[],
    rejectReason: string,
  ) {
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      throw new BadRequestException('Danh sách báo cáo không được để trống');
    }

    const normalizedReason = rejectReason?.trim();
    if (!normalizedReason) {
      throw new BadRequestException('Lý do từ chối không được để trống');
    }

    await this.findUser(userId);
    let rejectedCount = 0;

    for (const reportId of [...new Set(reportIds)]) {
      if (!Number.isInteger(reportId) || reportId <= 0) {
        continue;
      }

      try {
        const report = await this.findReportByIdForDepartment(reportId);

        if (report.status !== LaborAccidentReportStatus.SUBMITTED) {
          continue;
        }

        report.status = LaborAccidentReportStatus.REJECTED;
        report.rejectReason = normalizedReason;
        report.receivedAt = null;
        report.receivedByUser = null;
        await this.reportRepository.save(report);
        rejectedCount += 1;
      } catch (error) {
        if (error instanceof NotFoundException) {
          continue;
        }

        throw error;
      }
    }

    return {
      message: `Từ chối thành công ${rejectedCount}/${reportIds.length} báo cáo`,
      success: true,
    };
  }
}

@Controller('labor-accident-reports/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...MANAGEMENT_ROLE_CODES)
@ApiTags('Báo cáo TNLĐ Sở')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  LaborAccidentReportResponseDto,
  LaborAccidentReportListResponseDto,
)
export class LaborAccidentReportAdminController {
  constructor(private readonly reportService: LaborAccidentReportService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách báo cáo TNLĐ cho role Sở',
    description:
      'Mặc định không lấy báo cáo nháp. Truyền status=DRAFT nếu cần kiểm tra dữ liệu test.',
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
  getReports(@Query() query: ListLaborAccidentReportsQueryDto) {
    return this.reportService.getDepartmentReports(query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Báo cáo tổng hợp TNLĐ cho role Sở',
    description:
      'Tổng hợp theo kỳ/năm/địa bàn/trạng thái, kèm nhóm nguyên nhân, yếu tố chấn thương, nghề nghiệp và khoản 2 điều 39.',
  })
  @ApiOkResponse({
    description: 'Báo cáo tổng hợp TNLĐ',
    type: ApiSuccessResponseDto,
  })
  getSummary(@Query() query: LaborAccidentReportSummaryQueryDto) {
    return this.reportService.getDepartmentReportSummary(query);
  }

  @Get('summary/export/excel')
  @ApiOperation({
    summary: 'Xuất Excel báo cáo tổng hợp TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Excel báo cáo tổng hợp TNLĐ',
  })
  async exportSummaryExcel(
    @Query() query: LaborAccidentReportSummaryQueryDto,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentSummary(
      query,
      'excel',
    );

    sendOfficeExport(response, file);
  }

  @Get('summary/export/word')
  @ApiOperation({
    summary: 'Xuất Word báo cáo tổng hợp TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Word báo cáo tổng hợp TNLĐ',
  })
  async exportSummaryWord(
    @Query() query: LaborAccidentReportSummaryQueryDto,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentSummary(
      query,
      'word',
    );

    sendOfficeExport(response, file);
  }

  @Get(':id/export/excel')
  @ApiOperation({
    summary: 'Xuất Excel chi tiết báo cáo TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Excel chi tiết báo cáo TNLĐ',
  })
  async exportReportExcel(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentReport(id, 'excel');

    sendOfficeExport(response, file);
  }

  @Get(':id/export/word')
  @ApiOperation({
    summary: 'Xuất Word chi tiết báo cáo TNLĐ cho role Sở',
  })
  @ApiOkResponse({
    description: 'File Word chi tiết báo cáo TNLĐ',
  })
  async exportReportWord(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportDepartmentReport(id, 'word');

    sendOfficeExport(response, file);
  }

  @Post(':id/receive')
  @ApiOperation({
    summary: 'Sở tiếp nhận báo cáo TNLĐ',
    description:
      'Chỉ tiếp nhận báo cáo đã được doanh nghiệp gửi. Sau khi tiếp nhận, báo cáo bị khóa chỉnh sửa ở phía doanh nghiệp.',
  })
  @ApiOkResponse({
    description: 'Báo cáo sau khi được Sở tiếp nhận',
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
  receiveReport(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportService.receiveDepartmentReport(currentUser.id, id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết báo cáo TNLĐ cho role Sở',
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
  getReportDetail(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getDepartmentReportDetail(id);
  }

  @Post('bulk-receive')
  @ApiOperation({ summary: 'Duyệt hàng loạt báo cáo TNLĐ' })
  bulkReceive(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: BulkReceiveLaborAccidentReportsDto,
  ) {
    return this.reportService.bulkReceiveDepartmentReports(
      currentUser.id,
      body.ids,
    );
  }

  @Post('bulk-reject')
  @ApiOperation({ summary: 'Từ chối hàng loạt báo cáo TNLĐ' })
  bulkReject(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() body: BulkRejectLaborAccidentReportsDto,
  ) {
    return this.reportService.bulkRejectDepartmentReports(
      currentUser.id,
      body.ids,
      body.rejectReason,
    );
  }
}

@Controller('labor-accident-reports/my')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_CODES.EMPLOYEE)
@ApiTags('Báo cáo TNLĐ doanh nghiệp')
@ApiBearerAuth('access-token')
export class LaborAccidentReportBusinessExportController {
  constructor(private readonly reportService: LaborAccidentReportService) {}

  @Get(':id/export/excel')
  @ApiOperation({
    summary: 'Xuất Excel chi tiết báo cáo TNLĐ của doanh nghiệp đang đăng nhập',
  })
  @ApiOkResponse({
    description: 'File Excel chi tiết báo cáo TNLĐ',
  })
  async exportMyReportExcel(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportMyReport(
      currentUser.id,
      id,
      'excel',
    );

    sendOfficeExport(response, file);
  }

  @Get(':id/export/word')
  @ApiOperation({
    summary: 'Xuất Word chi tiết báo cáo TNLĐ của doanh nghiệp đang đăng nhập',
  })
  @ApiOkResponse({
    description: 'File Word chi tiết báo cáo TNLĐ',
  })
  async exportMyReportWord(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: any,
  ) {
    const file = await this.reportService.exportMyReport(
      currentUser.id,
      id,
      'word',
    );

    sendOfficeExport(response, file);
  }
}
