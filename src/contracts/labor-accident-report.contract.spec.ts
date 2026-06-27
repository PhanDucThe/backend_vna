/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ROLE_CODES } from '../constants/roles.constant';
import { LaborAccidentCatalogController } from '../controllers/labor-accident-catalog.controller';
import { LaborAccidentReportPeriodController } from '../controllers/labor-accident-report-period.controller';
import { LaborAccidentReportController } from '../controllers/labor-accident-report.controller';
import { LaborAccidentReportStatus } from '../entities/labor-accident-report.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { LaborAccidentCatalogService } from '../services/labor-accident-catalog.service';
import { LaborAccidentReportPeriodService } from '../services/labor-accident-report-period.service';
import {
  LaborAccidentReportAdminController,
  LaborAccidentReportService,
} from '../services/labor-accident-report.service';
import { ResponseInterceptor } from '../../libs/shared/interceptors/response.interceptor';

type ContractReport = {
  id: number;
  ownerUserId: number;
  reportPeriodId: number;
  status: LaborAccidentReportStatus;
  rejectReason: string | null;
  details: unknown[];
  attachments: Array<{
    id: number;
    displayName: string;
    originalName: string;
    fileUrl: string;
    mimetype: string;
    size: number;
    createdAt: string;
  }>;
  submittedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<LaborAccidentReportStatus, string> = {
  [LaborAccidentReportStatus.DRAFT]: 'Đang báo cáo',
  [LaborAccidentReportStatus.SUBMITTED]: 'Đang chờ duyệt',
  [LaborAccidentReportStatus.RECEIVED]: 'Đã tiếp nhận',
  [LaborAccidentReportStatus.REJECTED]: 'Từ chối phê duyệt',
};

class HeaderJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();
    const role = String(request.headers['x-role'] ?? '');
    const userId = Number(request.headers['x-user-id'] ?? 0);

    request.user = {
      id: userId,
      username: `user-${userId}`,
      roles: role ? [role] : [],
      permissions: [],
    };
    return userId > 0;
  }
}

class InMemoryReportContractService {
  private readonly reports = new Map<number, ContractReport>();
  private nextId = 1;

  getMyReports(userId: number, query: { page?: string; limit?: string }) {
    return this.list(
      [...this.reports.values()].filter(
        (report) => report.ownerUserId === userId,
      ),
      query,
    );
  }

  getMyReportDetail(userId: number, reportId: number) {
    return {
      message: 'Lấy chi tiết báo cáo thành công',
      data: this.map(this.findOwned(userId, reportId)),
    };
  }

  saveDraft(
    userId: number,
    body: {
      reportPeriodId: string | number;
      details?: string | unknown[];
      attachmentNames?: string;
    },
    files: Express.Multer.File[] = [],
  ) {
    const reportPeriodId = Number(body.reportPeriodId);
    let report = [...this.reports.values()].find(
      (item) =>
        item.ownerUserId === userId &&
        item.reportPeriodId === reportPeriodId,
    );

    if (
      report &&
      report.status !== LaborAccidentReportStatus.DRAFT &&
      report.status !== LaborAccidentReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Chỉ được cập nhật báo cáo nháp hoặc bị từ chối',
      );
    }

    const now = new Date().toISOString();
    if (!report) {
      report = {
        id: this.nextId++,
        ownerUserId: userId,
        reportPeriodId,
        status: LaborAccidentReportStatus.DRAFT,
        rejectReason: null,
        details: [],
        attachments: [],
        submittedAt: null,
        receivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.reports.set(report.id, report);
    }

    report.status = LaborAccidentReportStatus.DRAFT;
    report.rejectReason = null;
    report.updatedAt = now;
    if (body.details !== undefined) {
      report.details =
        typeof body.details === 'string'
          ? (JSON.parse(body.details) as unknown[])
          : body.details;
    }

    const attachmentNames = body.attachmentNames
      ? (JSON.parse(body.attachmentNames) as string[])
      : [];
    for (const [index, file] of files.entries()) {
      report.attachments.push({
        id: report.attachments.length + 1,
        displayName: attachmentNames[index] ?? file.originalname,
        originalName: file.originalname,
        fileUrl: `https://files.example/${file.originalname}`,
        mimetype: file.mimetype,
        size: file.size,
        createdAt: now,
      });
    }

    return {
      message: 'Lưu nháp báo cáo thành công',
      data: this.map(report),
    };
  }

  submitReport(userId: number, reportId: number) {
    const report = this.findOwned(userId, reportId);
    if (
      report.status !== LaborAccidentReportStatus.DRAFT &&
      report.status !== LaborAccidentReportStatus.REJECTED
    ) {
      throw new BadRequestException('Trạng thái báo cáo không hợp lệ');
    }
    if (!report.attachments.length) {
      throw new BadRequestException('Báo cáo phải có file đính kèm');
    }

    report.status = LaborAccidentReportStatus.SUBMITTED;
    report.rejectReason = null;
    report.submittedAt = new Date().toISOString();
    report.updatedAt = report.submittedAt;
    return {
      message: 'Gửi báo cáo thành công',
      data: this.map(report),
    };
  }

  getDepartmentReports(query: { page?: string; limit?: string }) {
    return this.list(
      [...this.reports.values()].filter(
        (report) => report.status !== LaborAccidentReportStatus.DRAFT,
      ),
      query,
    );
  }

  getDepartmentReportDetail(reportId: number) {
    return {
      message: 'Lấy chi tiết báo cáo thành công',
      data: this.map(this.find(reportId)),
    };
  }

  receiveDepartmentReport(_userId: number, reportId: number) {
    const report = this.find(reportId);
    if (report.status !== LaborAccidentReportStatus.SUBMITTED) {
      throw new BadRequestException('Chỉ được tiếp nhận báo cáo đã gửi');
    }

    report.status = LaborAccidentReportStatus.RECEIVED;
    report.receivedAt = new Date().toISOString();
    report.updatedAt = report.receivedAt;
    return {
      message: 'Tiếp nhận báo cáo thành công',
      data: this.map(report),
    };
  }

  bulkReceiveDepartmentReports(_userId: number, reportIds: number[]) {
    let count = 0;
    for (const reportId of reportIds) {
      const report = this.find(reportId);
      if (report.status === LaborAccidentReportStatus.SUBMITTED) {
        report.status = LaborAccidentReportStatus.RECEIVED;
        report.receivedAt = new Date().toISOString();
        count += 1;
      }
    }
    return { message: `Duyệt thành công ${count}/${reportIds.length}` };
  }

  bulkRejectDepartmentReports(
    _userId: number,
    reportIds: number[],
    rejectReason: string,
  ) {
    let count = 0;
    for (const reportId of reportIds) {
      const report = this.find(reportId);
      if (report.status === LaborAccidentReportStatus.SUBMITTED) {
        report.status = LaborAccidentReportStatus.REJECTED;
        report.rejectReason = rejectReason.trim();
        report.receivedAt = null;
        count += 1;
      }
    }
    return { message: `Từ chối thành công ${count}/${reportIds.length}` };
  }

  private list(
    reports: ContractReport[],
    query: { page?: string; limit?: string },
  ) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const totalItems = reports.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const start = (page - 1) * limit;

    return {
      message: 'Lấy danh sách báo cáo thành công',
      data: {
        items: reports.slice(start, start + limit).map((report) =>
          this.map(report),
        ),
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

  private find(reportId: number) {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }
    return report;
  }

  private findOwned(userId: number, reportId: number) {
    const report = this.find(reportId);
    if (report.ownerUserId !== userId) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }
    return report;
  }

  private map(report: ContractReport) {
    return {
      id: report.id,
      business: {
        id: report.ownerUserId,
        businessName: `Business ${report.ownerUserId}`,
        taxCode: '0312345678',
      },
      reportPeriod: {
        id: report.reportPeriodId,
        reportName: 'Báo cáo TNLĐ',
        year: 2026,
        periodType: 'SIX_MONTHS',
        periodTypeLabel: '6 tháng',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      },
      details: report.details,
      attachments: report.attachments,
      attachmentCount: report.attachments.length,
      status: report.status,
      statusLabel: STATUS_LABELS[report.status],
      rejectReason: report.rejectReason,
      submittedAt: report.submittedAt,
      receivedAt: report.receivedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}

const periodService = {
  getReportPeriods: jest.fn().mockReturnValue({
    message: 'Danh sách kỳ báo cáo',
    data: {
      items: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
  }),
  createReportPeriod: jest.fn((body: unknown) => ({
    message: 'Tạo kỳ báo cáo',
    data: { id: 1, ...(body as object) },
  })),
  updateReportPeriod: jest.fn((id: number, body: unknown) => ({
    message: 'Cập nhật kỳ báo cáo',
    data: { id, ...(body as object) },
  })),
  updateReportPeriodStatus: jest.fn((id: number, body: unknown) => ({
    message: 'Cập nhật trạng thái kỳ báo cáo',
    data: { id, ...(body as object) },
  })),
};

const catalogService = {
  getCatalogOptions: jest.fn((type: string) => ({
    message: 'Danh sách danh mục',
    data: [{ id: 1, type, code: '1', name: type }],
  })),
};

describe('Labor accident report HTTP contract', () => {
  let app: INestApplication;

  const asRole = (
    httpRequest: request.Test,
    role: string,
    userId: number,
  ) =>
    httpRequest
      .set('x-role', role)
      .set('x-user-id', String(userId));

  beforeAll(async () => {
    const reportService = new InMemoryReportContractService();
    const moduleRef = await Test.createTestingModule({
      controllers: [
        LaborAccidentReportController,
        LaborAccidentReportAdminController,
        LaborAccidentReportPeriodController,
        LaborAccidentCatalogController,
      ],
      providers: [
        RolesGuard,
        {
          provide: LaborAccidentReportService,
          useValue: reportService,
        },
        {
          provide: LaborAccidentReportPeriodService,
          useValue: periodService,
        },
        {
          provide: LaborAccidentCatalogService,
          useValue: catalogService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes period and catalog routes with the expected role contract', async () => {
    const periods = await asRole(
      request(app.getHttpServer()).get(
        '/api/v1/labor-accident-report-periods',
      ),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(200);
    expect(periods.body.data).toEqual(
      expect.objectContaining({
        items: [],
        meta: expect.objectContaining({
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        }),
      }),
    );

    await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-report-periods')
        .send({
          reportName: 'Báo cáo TNLĐ',
          year: 2026,
          periodType: 'SIX_MONTHS',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
        }),
      ROLE_CODES.MANAGER,
      1,
    ).expect(201);
    await asRole(
      request(app.getHttpServer())
        .patch('/api/v1/labor-accident-report-periods/1')
        .send({ periodType: 'FULL_YEAR' }),
      ROLE_CODES.CEO,
      2,
    ).expect(200);
    await asRole(
      request(app.getHttpServer())
        .patch('/api/v1/labor-accident-report-periods/1/status')
        .send({ isActive: false }),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);

    for (const type of [
      'ACCIDENT_CAUSE',
      'INJURY_FACTOR',
      'OCCUPATION',
    ]) {
      await asRole(
        request(app.getHttpServer()).get(
          `/api/v1/labor-accident-catalogs/options?type=${type}`,
        ),
        ROLE_CODES.EMPLOYEE,
        20,
      )
        .expect(200)
        .expect((response) => {
          expect(response.body.data[0].type).toBe(type);
        });
    }
  });

  it('runs draft → submit → receive through multipart HTTP routes', async () => {
    const draft = await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/my/draft')
        .field('reportPeriodId', '1')
        .field(
          'details',
          JSON.stringify([{ section: 'ACCIDENT', orderNo: 1 }]),
        )
        .field('attachmentNames', JSON.stringify(['Báo cáo có dấu mộc']))
        .attach('attachments', Buffer.from('pdf-content'), {
          filename: 'report.pdf',
          contentType: 'application/pdf',
        }),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(201);

    expect(draft.body).toEqual(
      expect.objectContaining({
        success: true,
        statusCode: 201,
        message: expect.any(String),
        timestamp: expect.any(String),
        path: '/api/v1/labor-accident-reports/my/draft',
      }),
    );
    expect(draft.body.data).toEqual(
      expect.objectContaining({
        business: expect.any(Object),
        reportPeriod: expect.objectContaining({
          periodType: 'SIX_MONTHS',
        }),
        details: [{ section: 'ACCIDENT', orderNo: 1 }],
        attachments: [expect.objectContaining({ originalName: 'report.pdf' })],
        status: 'DRAFT',
        statusLabel: expect.any(String),
        rejectReason: null,
        submittedAt: null,
        receivedAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
    const reportId = Number(draft.body.data.id);

    const myList = await asRole(
      request(app.getHttpServer()).get(
        '/api/v1/labor-accident-reports/my?page=1&limit=10',
      ),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(200);
    expect(myList.body.data.meta).toEqual({
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    await asRole(
      request(app.getHttpServer()).get(
        `/api/v1/labor-accident-reports/my/${reportId}`,
      ),
      ROLE_CODES.EMPLOYEE,
      21,
    ).expect(404);

    const submitted = await asRole(
      request(app.getHttpServer())
        .post(`/api/v1/labor-accident-reports/my/${reportId}/submit`)
        .field('attachmentNames', JSON.stringify(['Báo cáo có dấu mộc'])),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(201);
    expect(submitted.body.data.status).toBe('SUBMITTED');

    const adminList = await asRole(
      request(app.getHttpServer()).get(
        '/api/v1/labor-accident-reports/admin',
      ),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
    expect(adminList.body.data.items).toHaveLength(1);
    expect(adminList.body.data.meta.totalItems).toBe(1);

    await asRole(
      request(app.getHttpServer()).get(
        `/api/v1/labor-accident-reports/admin/${reportId}`,
      ),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);

    const received = await asRole(
      request(app.getHttpServer()).post(
        `/api/v1/labor-accident-reports/admin/${reportId}/receive`,
      ),
      ROLE_CODES.MANAGER,
      1,
    ).expect(201);
    expect(received.body.data.status).toBe('RECEIVED');
    expect(received.body.data.receivedAt).toEqual(expect.any(String));
  });

  it('runs reject → edit → resubmit and validates bulk DTOs', async () => {
    const draft = await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/my/draft')
        .field('reportPeriodId', '2')
        .field('details', JSON.stringify([]))
        .attach('attachments', Buffer.from('pdf-content'), {
          filename: 'report-2.pdf',
          contentType: 'application/pdf',
        }),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(201);
    const reportId = Number(draft.body.data.id);

    await asRole(
      request(app.getHttpServer())
        .post(`/api/v1/labor-accident-reports/my/${reportId}/submit`)
        .field('attachmentNames', JSON.stringify(['report-2.pdf'])),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(201);

    const rejected = await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/admin/bulk-reject')
        .send({
          ids: [reportId],
          rejectReason: 'Cần bổ sung số liệu',
        }),
      ROLE_CODES.CEO,
      2,
    ).expect(201);
    expect(rejected.body.success).toBe(true);

    const rejectedDetail = await asRole(
      request(app.getHttpServer()).get(
        `/api/v1/labor-accident-reports/my/${reportId}`,
      ),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(200);
    expect(rejectedDetail.body.data.status).toBe('REJECTED');
    expect(rejectedDetail.body.data.rejectReason).toBe(
      'Cần bổ sung số liệu',
    );

    const edited = await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/my/draft')
        .field('reportPeriodId', '2')
        .field(
          'details',
          JSON.stringify([{ section: 'ACCIDENT', orderNo: 2 }]),
        ),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(201);
    expect(edited.body.data.status).toBe('DRAFT');
    expect(edited.body.data.rejectReason).toBeNull();

    const resubmitted = await asRole(
      request(app.getHttpServer())
        .post(`/api/v1/labor-accident-reports/my/${reportId}/submit`)
        .field('attachmentNames', JSON.stringify(['report-2.pdf'])),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(201);
    expect(resubmitted.body.data.status).toBe('SUBMITTED');

    await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/admin/bulk-receive')
        .send({ ids: [reportId] }),
      ROLE_CODES.MANAGER,
      1,
    ).expect(201);

    await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/admin/bulk-receive')
        .send({ ids: [] }),
      ROLE_CODES.MANAGER,
      1,
    ).expect(400);
    await asRole(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/admin/bulk-reject')
        .send({ ids: [reportId], rejectReason: '' }),
      ROLE_CODES.CEO,
      2,
    ).expect(400);
  });

  it('enforces Role2 for /my and Role1/Role3 for /admin', async () => {
    await asRole(
      request(app.getHttpServer()).get('/api/v1/labor-accident-reports/my'),
      ROLE_CODES.MANAGER,
      1,
    ).expect(403);
    await asRole(
      request(app.getHttpServer()).get(
        '/api/v1/labor-accident-reports/admin',
      ),
      ROLE_CODES.EMPLOYEE,
      20,
    ).expect(403);
  });
});
