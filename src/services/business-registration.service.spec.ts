import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { validate } from 'class-validator';

import {
  RegisterBusinessDto,
  SendBusinessRegistrationOtpDto,
} from '../dtos/business-registration.dto';
import { BusinessService } from './business.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

function createQueryBuilder(result: unknown = null) {
  const queryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn().mockResolvedValue(result),
  };
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  return queryBuilder;
}

function createService(options?: {
  duplicateTaxCode?: boolean;
  duplicateUsername?: boolean;
  duplicateEmail?: boolean;
  registrationOtp?: Record<string, unknown> | null;
}) {
  const businessQueryBuilder = createQueryBuilder(
    options?.duplicateTaxCode ? { id: 1 } : null,
  );
  const userQueryBuilder = createQueryBuilder(
    options?.duplicateEmail ? { id: 2 } : null,
  );
  const businessRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(businessQueryBuilder),
    manager: {
      transaction: jest.fn(),
    },
  };
  const userRepository = {
    findOne: jest
      .fn()
      .mockResolvedValue(options?.duplicateUsername ? { id: 3 } : null),
    createQueryBuilder: jest.fn().mockReturnValue(userQueryBuilder),
  };
  const emailOtpRepository = {
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((value: Record<string, unknown>) => ({
      id: 10,
      ...value,
    })),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
    delete: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(options?.registrationOtp ?? null),
  };
  const mailService = {
    sendOtpMail: jest.fn().mockResolvedValue({
      success: true,
      mode: 'SMTP',
      messageId: 'mail-id',
    }),
  };
  const service = new BusinessService(
    businessRepository as never,
    {} as never,
    userRepository as never,
    {} as never,
    {} as never,
    emailOtpRepository as never,
    {} as never,
    { get: jest.fn().mockReturnValue(undefined) } as never,
    mailService as never,
  );

  return {
    service,
    businessQueryBuilder,
    userRepository,
    emailOtpRepository,
    mailService,
  };
}

function createRegistrationDto(): RegisterBusinessDto {
  return {
    businessName: 'Công ty kiểm thử',
    taxCode: '0312345678',
    businessType: 'Công ty TNHH 1 thành viên',
    industryCode: '4669',
    industryName: 'Bán buôn',
    provinceCity: 'Thành phố Hồ Chí Minh',
    wardCommune: 'Phường Bến Nghé',
    email: 'business@example.com',
  };
}

describe('Business registration OTP contract', () => {
  beforeEach(() => {
    jest.mocked(bcrypt.hash).mockResolvedValue('otp-hash' as never);
  });

  it.each(['0312345678', '0312345678-001'])(
    'accepts valid tax code %s',
    async (taxCode) => {
      const dto = Object.assign(new SendBusinessRegistrationOtpDto(), {
        email: 'business@example.com',
        taxCode,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each(['031234567', '03123456789', '0312345678-01', 'ABC1234567'])(
    'rejects invalid tax code %s',
    async (taxCode) => {
      const dto = Object.assign(new SendBusinessRegistrationOtpDto(), {
        email: 'business@example.com',
        taxCode,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'taxCode')).toBe(true);
    },
  );

  it('normalizes and checks tax code before sending OTP', async () => {
    const { service, businessQueryBuilder, userRepository, mailService } =
      createService();

    const response = await service.sendBusinessRegistrationOtp({
      email: 'BUSINESS@EXAMPLE.COM',
      taxCode: ' 0312345678 ',
    });

    expect(businessQueryBuilder.where).toHaveBeenCalledWith(
      'business.taxCode = :taxCode',
      { taxCode: '0312345678' },
    );
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { username: '0312345678' },
    });
    expect(mailService.sendOtpMail).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual(
      expect.objectContaining({
        email: 'business@example.com',
        taxCode: '0312345678',
      }),
    );
  });

  it('rejects a duplicate business tax code before sending OTP', async () => {
    const { service, mailService } = createService({
      duplicateTaxCode: true,
    });

    await expect(
      service.sendBusinessRegistrationOtp({
        email: 'business@example.com',
        taxCode: '0312345678',
      }),
    ).rejects.toThrow('Mã số thuế đã tồn tại');
    expect(mailService.sendOtpMail).not.toHaveBeenCalled();
  });

  it('rejects a tax code already used as business username', async () => {
    const { service, mailService } = createService({
      duplicateUsername: true,
    });

    await expect(
      service.sendBusinessRegistrationOtp({
        email: 'business@example.com',
        taxCode: '0312345678',
      }),
    ).rejects.toThrow(
      'Mã số thuế đã được sử dụng làm tài khoản đăng nhập',
    );
    expect(mailService.sendOtpMail).not.toHaveBeenCalled();
  });

  it('sends a fresh unverified and unused OTP', async () => {
    const { service, emailOtpRepository } = createService();

    await service.sendBusinessRegistrationOtp({
      email: 'business@example.com',
      taxCode: '0312345678',
    });

    expect(emailOtpRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        verifiedAt: null,
        isUsed: false,
      }),
    );
  });

  it('confirms registration only with a verified, unexpired OTP for email', async () => {
    const verifiedOtp = {
      id: 10,
      email: 'business@example.com',
      isUsed: false,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    };
    const { service, emailOtpRepository } = createService({
      registrationOtp: verifiedOtp,
    });
    const createBusiness = jest
      .spyOn(service, 'createBusiness')
      .mockResolvedValue({
        message: 'Tạo doanh nghiệp thành công',
        data: { id: 1 },
      } as never);

    const response = await service.confirmBusinessRegistration(
      createRegistrationDto(),
    );

    expect(emailOtpRepository.findOne).toHaveBeenCalledWith({
      where: {
        email: 'business@example.com',
        purpose: 'BUSINESS_REGISTRATION',
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });
    expect(createBusiness).toHaveBeenCalledTimes(1);
    expect(verifiedOtp.isUsed).toBe(true);
    expect(emailOtpRepository.save).toHaveBeenCalledWith(verifiedOtp);
    expect(response.message).toBe(
      'Đăng ký tài khoản doanh nghiệp thành công',
    );
  });

  it('does not confirm registration with an unverified OTP', async () => {
    const { service } = createService({
      registrationOtp: {
        id: 10,
        email: 'business@example.com',
        isUsed: false,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const createBusiness = jest.spyOn(service, 'createBusiness');

    await expect(
      service.confirmBusinessRegistration(createRegistrationDto()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createBusiness).not.toHaveBeenCalled();
  });
});
