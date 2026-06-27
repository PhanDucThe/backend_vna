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

import { ROLE_CODES } from '../src/constants/roles.constant';
import { AuthController } from '../src/controllers/auth.controller';
import { BusinessProfileController } from '../src/controllers/business-profile.controller';
import { BusinessRegistrationController } from '../src/controllers/business-registration.controller';
import { BusinessController } from '../src/controllers/business.controller';
import { LaborAccidentCatalogController } from '../src/controllers/labor-accident-catalog.controller';
import { LaborAccidentReportPeriodController } from '../src/controllers/labor-accident-report-period.controller';
import { LaborAccidentReportController } from '../src/controllers/labor-accident-report.controller';
import { UserController } from '../src/controllers/user.controller';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/guards/permissions.guard';
import { RolesGuard } from '../src/guards/roles.guard';
import { SelfOrUserManagementGuard } from '../src/guards/self-or-user-management.guard';
import { AuthService } from '../src/services/auth.service';
import { BusinessService } from '../src/services/business.service';
import { LaborAccidentCatalogService } from '../src/services/labor-accident-catalog.service';
import { LaborAccidentReportPeriodService } from '../src/services/labor-accident-report-period.service';
import {
  LaborAccidentReportAdminController,
  LaborAccidentReportService,
} from '../src/services/labor-accident-report.service';
import { UserService } from '../src/services/user.service';
import { HttpExceptionFilter } from '../libs/shared/filters/http-exception.filter';
import { ResponseInterceptor } from '../libs/shared/interceptors/response.interceptor';

const allPermissions = [
  'ADMIN_C_USER_VIEW',
  'ADMIN_C_USER_CREATE',
  'ADMIN_C_USER_UPDATE',
  'ADMIN_C_USER_DELETE',
];

class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = Number(request.headers['x-user-id'] ?? 0);
    const role = String(request.headers['x-role'] ?? '');
    request.user = {
      id: userId,
      username: `user-${userId}`,
      roles: role ? [role] : [],
      permissions: allPermissions,
    };
    return userId > 0;
  }
}

const now = () => new Date().toISOString();

class SmokeAuthService {
  login(body: { username: string }) {
    const isAdmin = body.username === 'admin';
    return {
      message: 'Đăng nhập thành công',
      data: {
        accessToken: `${body.username}-access`,
        refreshToken: `${body.username}-refresh`,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: isAdmin ? 1 : 2,
          username: body.username,
          fullName: isAdmin ? 'Admin' : 'Business User',
          email: `${body.username}@example.com`,
          avatar: null,
          roles: [isAdmin ? 'ADMIN' : 'USER'],
        },
      },
    };
  }
}

type SmokeUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roleCode: 'ADMIN' | 'USER';
  isActive: boolean;
  avatar: string | null;
};

class SmokeUserService {
  private nextId = 3;
  private readonly users: SmokeUser[] = [
    {
      id: 1,
      username: 'admin',
      fullName: 'Admin',
      email: 'admin@example.com',
      roleCode: 'ADMIN',
      isActive: true,
      avatar: null,
    },
    {
      id: 2,
      username: 'user',
      fullName: 'Business User',
      email: 'user@example.com',
      roleCode: 'USER',
      isActive: true,
      avatar: null,
    },
  ];

  getMe(id: number) {
    return { message: 'Profile', data: this.map(this.find(id)) };
  }

  getUsers() {
    return {
      message: 'Users',
      data: {
        items: this.users.map((user) => this.map(user)),
        meta: {
          page: 1,
          limit: 10,
          totalItems: this.users.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    };
  }

  getUserDetail(id: number) {
    return { message: 'User detail', data: this.map(this.find(id)) };
  }

  createUser(body: Record<string, string>) {
    const user: SmokeUser = {
      id: this.nextId++,
      username: body.username,
      fullName: body.fullName,
      email: body.email,
      roleCode: body.roleCode === 'ADMIN' ? 'ADMIN' : 'USER',
      isActive: body.isActive !== 'false',
      avatar: null,
    };
    this.users.push(user);
    return { message: 'Created user', data: this.map(user) };
  }

  updateUser(id: number, body: Record<string, string>) {
    const user = this.find(id);
    user.fullName = body.fullName ?? user.fullName;
    user.email = body.email ?? user.email;
    user.isActive =
      body.isActive === undefined ? user.isActive : body.isActive === 'true';
    return { message: 'Updated user', data: this.map(user) };
  }

  deleteUser(id: number) {
    const index = this.users.findIndex((user) => user.id === id);
    if (index < 0) throw new NotFoundException();
    this.users.splice(index, 1);
    return { message: 'Deleted user', data: { id } };
  }

  private find(id: number) {
    const user = this.users.find((item) => item.id === id);
    if (!user) throw new NotFoundException();
    return user;
  }

  private map(user: SmokeUser) {
    return {
      ...user,
      roles: [{ id: user.roleCode === 'ADMIN' ? 1 : 2, code: user.roleCode }],
      roleCodes: [user.roleCode],
      roleCode: user.roleCode,
      createdAt: now(),
      updatedAt: now(),
    };
  }
}

type SmokeBusiness = {
  id: number;
  businessName: string;
  taxCode: string;
  email: string;
  isActive: boolean;
};

class SmokeBusinessService {
  private nextId = 2;
  private otpVerified = false;
  private readonly businesses: SmokeBusiness[] = [
    {
      id: 1,
      businessName: 'Existing Business',
      taxCode: '0312345678',
      email: 'business@example.com',
      isActive: true,
    },
  ];

  getBusinesses() {
    return {
      message: 'Businesses',
      data: {
        items: this.businesses.map((item) => this.map(item)),
        meta: {
          page: 1,
          limit: 10,
          totalItems: this.businesses.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    };
  }

  getBusinessDetail(id: number) {
    return { message: 'Business', data: this.map(this.find(id)) };
  }

  createBusiness(body: Record<string, string>) {
    const business = this.create(body);
    return { message: 'Created business', data: this.map(business) };
  }

  updateBusiness(id: number, body: Record<string, string>) {
    const business = this.find(id);
    business.businessName = body.businessName ?? business.businessName;
    return { message: 'Updated business', data: this.map(business) };
  }

  updateBusinessStatus(id: number, isActive: boolean) {
    const business = this.find(id);
    business.isActive = Boolean(isActive);
    return { message: 'Updated status', data: this.map(business) };
  }

  deleteBusiness(id: number) {
    const index = this.businesses.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException();
    this.businesses.splice(index, 1);
    return { message: 'Deleted business', data: { id } };
  }

  deleteAttachment(_businessId: number, attachmentId: number) {
    return { message: 'Deleted attachment', data: { id: attachmentId } };
  }

  sendBusinessRegistrationOtp(body: { email: string; taxCode?: string }) {
    return {
      message: 'OTP sent',
      data: {
        email: body.email,
        taxCode: body.taxCode ?? null,
        expiresInSeconds: 300,
      },
    };
  }

  verifyBusinessRegistrationOtp(body: { email: string }) {
    this.otpVerified = true;
    return {
      message: 'OTP verified',
      data: { email: body.email, verified: true },
    };
  }

  confirmBusinessRegistration(body: Record<string, string>) {
    if (!this.otpVerified) throw new BadRequestException();
    const business = this.create(body);
    return {
      message: 'Registered business',
      data: this.map(business),
    };
  }

  getMyBusiness(userId: number) {
    return {
      message: 'My business',
      data: this.map(this.find(userId === 2 ? 1 : userId)),
    };
  }

  updateMyBusiness(userId: number, body: Record<string, string>) {
    return this.updateBusiness(userId === 2 ? 1 : userId, body);
  }

  sendBusinessProfileEmailOtp() {
    return {
      message: 'OTP sent',
      data: { email: 'business@example.com', expiresInSeconds: 300 },
    };
  }

  verifyBusinessProfileEmailOtp() {
    return { message: 'OTP verified', data: { verified: true } };
  }

  private create(body: Record<string, string>) {
    const business: SmokeBusiness = {
      id: this.nextId++,
      businessName: body.businessName,
      taxCode: body.taxCode,
      email: body.email ?? `${body.taxCode}@business.local`,
      isActive: true,
    };
    this.businesses.push(business);
    return business;
  }

  private find(id: number) {
    const business = this.businesses.find((item) => item.id === id);
    if (!business) throw new NotFoundException();
    return business;
  }

  private map(business: SmokeBusiness) {
    return {
      ...business,
      businessType: 'Công ty TNHH 1 thành viên',
      industryCode: '4669',
      industryName: 'Bán buôn',
      industryDisplay: '4669 - Bán buôn',
      provinceCity: 'Hồ Chí Minh',
      wardCommune: 'Bến Nghé',
      statusLabel: business.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động',
      attachments: [],
      createdAt: now(),
      updatedAt: now(),
    };
  }
}

class SmokePeriodService {
  getReportPeriods() {
    return {
      message: 'Periods',
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
    };
  }
  createReportPeriod(body: object) {
    return { message: 'Created period', data: { id: 1, ...body } };
  }
  updateReportPeriod(id: number, body: object) {
    return { message: 'Updated period', data: { id, ...body } };
  }
  updateReportPeriodStatus(id: number, body: object) {
    return { message: 'Updated period status', data: { id, ...body } };
  }
}

class SmokeCatalogService {
  getCatalogOptions(type: string) {
    return {
      message: 'Catalog options',
      data: [{ id: 1, type, code: '1', name: type }],
    };
  }
}

type SmokeReport = {
  id: number;
  ownerId: number;
  periodId: number;
  status: 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'REJECTED';
  rejectReason: string | null;
  attachments: object[];
};

class SmokeReportService {
  private nextId = 1;
  private readonly reports: SmokeReport[] = [];

  saveDraft(userId: number, body: Record<string, string>, files: object[]) {
    const periodId = Number(body.reportPeriodId);
    let report = this.reports.find(
      (item) => item.ownerId === userId && item.periodId === periodId,
    );
    if (!report) {
      report = {
        id: this.nextId++,
        ownerId: userId,
        periodId,
        status: 'DRAFT',
        rejectReason: null,
        attachments: [],
      };
      this.reports.push(report);
    }
    report.status = 'DRAFT';
    report.rejectReason = null;
    report.attachments.push(...files);
    return { message: 'Saved draft', data: this.map(report) };
  }

  submitReport(userId: number, id: number) {
    const report = this.findOwned(userId, id);
    if (!['DRAFT', 'REJECTED'].includes(report.status)) {
      throw new BadRequestException();
    }
    report.status = 'SUBMITTED';
    return { message: 'Submitted', data: this.map(report) };
  }

  getMyReports(userId: number) {
    return this.list(
      this.reports.filter((item) => item.ownerId === userId),
    );
  }
  getMyReportDetail(userId: number, id: number) {
    return { message: 'Report', data: this.map(this.findOwned(userId, id)) };
  }
  getDepartmentReports() {
    return this.list(
      this.reports.filter((item) => item.status !== 'DRAFT'),
    );
  }
  getDepartmentReportDetail(id: number) {
    return { message: 'Report', data: this.map(this.find(id)) };
  }
  receiveDepartmentReport(_userId: number, id: number) {
    const report = this.find(id);
    if (report.status !== 'SUBMITTED') throw new BadRequestException();
    report.status = 'RECEIVED';
    return { message: 'Received', data: this.map(report) };
  }
  bulkRejectDepartmentReports(
    _userId: number,
    ids: number[],
    reason: string,
  ) {
    for (const id of ids) {
      const report = this.find(id);
      if (report.status === 'SUBMITTED') {
        report.status = 'REJECTED';
        report.rejectReason = reason;
      }
    }
    return { message: 'Rejected', data: { ids } };
  }
  bulkReceiveDepartmentReports(_userId: number, ids: number[]) {
    for (const id of ids) {
      const report = this.find(id);
      if (report.status === 'SUBMITTED') report.status = 'RECEIVED';
    }
    return { message: 'Received', data: { ids } };
  }

  private list(reports: SmokeReport[]) {
    return {
      message: 'Reports',
      data: {
        items: reports.map((item) => this.map(item)),
        meta: {
          page: 1,
          limit: 10,
          totalItems: reports.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    };
  }
  private find(id: number) {
    const report = this.reports.find((item) => item.id === id);
    if (!report) throw new NotFoundException();
    return report;
  }
  private findOwned(userId: number, id: number) {
    const report = this.find(id);
    if (report.ownerId !== userId) throw new NotFoundException();
    return report;
  }
  private map(report: SmokeReport) {
    return {
      id: report.id,
      business: { id: report.ownerId, businessName: 'Business' },
      reportPeriod: {
        id: report.periodId,
        periodType: 'SIX_MONTHS',
      },
      details: [],
      attachments: report.attachments,
      status: report.status,
      statusLabel: report.status,
      rejectReason: report.rejectReason,
      submittedAt: report.status === 'DRAFT' ? null : now(),
      receivedAt: report.status === 'RECEIVED' ? now() : null,
      createdAt: now(),
      updatedAt: now(),
    };
  }
}

describe('Frontend/backend integration smoke (e2e)', () => {
  let app: INestApplication;

  const auth = (
    testRequest: request.Test,
    role: string,
    userId: number,
  ) =>
    testRequest
      .set('x-role', role)
      .set('x-user-id', String(userId));

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [
        AuthController,
        UserController,
        BusinessController,
        BusinessProfileController,
        BusinessRegistrationController,
        LaborAccidentReportPeriodController,
        LaborAccidentCatalogController,
        LaborAccidentReportController,
        LaborAccidentReportAdminController,
      ],
      providers: [
        RolesGuard,
        PermissionsGuard,
        SelfOrUserManagementGuard,
        { provide: AuthService, useClass: SmokeAuthService },
        { provide: UserService, useClass: SmokeUserService },
        { provide: BusinessService, useClass: SmokeBusinessService },
        {
          provide: LaborAccidentReportPeriodService,
          useClass: SmokePeriodService,
        },
        {
          provide: LaborAccidentCatalogService,
          useClass: SmokeCatalogService,
        },
        {
          provide: LaborAccidentReportService,
          useClass: SmokeReportService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in ADMIN and USER and gets/updates profile', async () => {
    for (const username of ['admin', 'user']) {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password: '123456', rememberMe: true })
        .expect(201);
      expect(login.body.data.user.roles).toEqual([
        username === 'admin' ? 'ADMIN' : 'USER',
      ]);
      expect(login.body).toEqual(
        expect.objectContaining({
          success: true,
          statusCode: 201,
          message: expect.any(String),
          timestamp: expect.any(String),
          path: '/api/v1/auth/login',
        }),
      );
    }

    const invalidLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin' })
      .expect(400);
    expect(invalidLogin.body).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        data: null,
        timestamp: expect.any(String),
        path: '/api/v1/auth/login',
      }),
    );

    await auth(
      request(app.getHttpServer()).get('/api/v1/users/me'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(200);
    const updated = await auth(
      request(app.getHttpServer())
        .patch('/api/v1/users/2')
        .field('fullName', 'Updated Profile')
        .field('isActive', 'false'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(200);
    expect(updated.body.data.fullName).toBe('Updated Profile');
  });

  it('runs user CRUD', async () => {
    const created = await auth(
      request(app.getHttpServer())
        .post('/api/v1/users')
        .field('username', 'created-user')
        .field('password', '123456')
        .field('fullName', 'Created User')
        .field('email', 'created@example.com')
        .field('roleCode', 'USER'),
      ROLE_CODES.CEO,
      1,
    ).expect(201);
    const id = Number(created.body.data.id);

    await auth(
      request(app.getHttpServer()).get('/api/v1/users'),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
    await auth(
      request(app.getHttpServer()).get(`/api/v1/users/${id}`),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/users/${id}`)
        .field('fullName', 'Edited User'),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
    await auth(
      request(app.getHttpServer()).delete(`/api/v1/users/${id}`),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
  });

  it('runs business CRUD and OTP registration', async () => {
    const created = await auth(
      request(app.getHttpServer())
        .post('/api/v1/businesses')
        .field('businessName', 'Created Business')
        .field('taxCode', '0312345679')
        .field('businessType', 'Công ty TNHH 1 thành viên')
        .field('industryCode', '4669')
        .field('industryName', 'Bán buôn')
        .field('provinceCity', 'Hồ Chí Minh')
        .field('wardCommune', 'Bến Nghé'),
      ROLE_CODES.MANAGER,
      1,
    ).expect(201);
    const id = Number(created.body.data.id);
    await auth(
      request(app.getHttpServer()).get('/api/v1/businesses'),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/businesses/${id}`)
        .field('businessName', 'Edited Business'),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);
    await auth(
      request(app.getHttpServer()).delete(`/api/v1/businesses/${id}`),
      ROLE_CODES.MANAGER,
      1,
    ).expect(200);

    const email = 'registered@example.com';
    const taxCode = '0312345680';
    await request(app.getHttpServer())
      .post('/api/v1/businesses/register/send-otp')
      .send({ email, taxCode })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/businesses/register/verify-otp')
      .send({ email, otp: '123456' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/businesses/register/confirm')
      .field('businessName', 'Registered Business')
      .field('taxCode', taxCode)
      .field('businessType', 'Công ty TNHH 1 thành viên')
      .field('industryCode', '4669')
      .field('industryName', 'Bán buôn')
      .field('provinceCity', 'Hồ Chí Minh')
      .field('wardCommune', 'Bến Nghé')
      .field('email', email)
      .expect(201);
  });

  it('smokes report periods and catalogs', async () => {
    await auth(
      request(app.getHttpServer()).get(
        '/api/v1/labor-accident-report-periods',
      ),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(200);
    await auth(
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
    await auth(
      request(app.getHttpServer()).get(
        '/api/v1/labor-accident-catalogs/options?type=ACCIDENT_CAUSE',
      ),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(200);
  });

  it('runs draft/submit/receive and reject/edit/resubmit reports', async () => {
    const firstDraft = await auth(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/my/draft')
        .field('reportPeriodId', '1')
        .field('details', '[]')
        .attach('attachments', Buffer.from('report'), 'report.pdf'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(201);
    const firstId = Number(firstDraft.body.data.id);
    await auth(
      request(app.getHttpServer())
        .post(`/api/v1/labor-accident-reports/my/${firstId}/submit`)
        .field('attachmentNames', '["report.pdf"]'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(201);
    await auth(
      request(app.getHttpServer()).post(
        `/api/v1/labor-accident-reports/admin/${firstId}/receive`,
      ),
      ROLE_CODES.MANAGER,
      1,
    ).expect(201);

    const secondDraft = await auth(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/my/draft')
        .field('reportPeriodId', '2')
        .field('details', '[]')
        .attach('attachments', Buffer.from('report'), 'report-2.pdf'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(201);
    const secondId = Number(secondDraft.body.data.id);
    await auth(
      request(app.getHttpServer())
        .post(`/api/v1/labor-accident-reports/my/${secondId}/submit`)
        .field('attachmentNames', '["report-2.pdf"]'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(201);
    await auth(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/admin/bulk-reject')
        .send({ ids: [secondId], rejectReason: 'Bổ sung dữ liệu' }),
      ROLE_CODES.CEO,
      1,
    ).expect(201);
    await auth(
      request(app.getHttpServer())
        .post('/api/v1/labor-accident-reports/my/draft')
        .field('reportPeriodId', '2')
        .field('details', '[]'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(201);
    await auth(
      request(app.getHttpServer())
        .post(`/api/v1/labor-accident-reports/my/${secondId}/submit`)
        .field('attachmentNames', '["report-2.pdf"]'),
      ROLE_CODES.EMPLOYEE,
      2,
    ).expect(201);
  });
});
