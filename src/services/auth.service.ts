import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';

import {
  UpdateChangeGmailDto,
  VerifyChangeGmailOtpDto,
} from '../dtos/change-gmail.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyForgotPasswordOtpDto } from '../dtos/verify-forgot-password-otp.dto';
import { EmailOtp } from '../entities/email-otp.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { JwtSignOptions } from '@nestjs/jwt';
import { MailService } from './mail.service';

const RESET_PASSWORD_PURPOSE = 'RESET_PASSWORD';
const CHANGE_GMAIL_PURPOSE = 'CHANGE_GMAIL';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    @InjectRepository(EmailOtp)
    private readonly emailOtpRepository: Repository<EmailOtp>,

    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,

    private readonly mailService: MailService,
  ) {}

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const { username, password, rememberMe } = loginDto;

    const user = await this.userRepository.findOne({
      where: {
        username,
      },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const roles = user.userRoles.map((userRole) => userRole.role.code);

    const payload = {
      sub: user.id,
      username: user.username,
      roles,
    };

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'vna_access_secret_key';

    const accessExpiresIn = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) || '15m') as JwtSignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshExpiresIn = (
      rememberMe
        ? this.configService.get<string>('JWT_REFRESH_REMEMBER_EXPIRES_IN') ||
          '30d'
        : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '1d'
    ) as JwtSignOptions['expiresIn'];

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'vna_refresh_secret_key';

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh_token',
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = this.calculateRefreshTokenExpiresAt(Boolean(rememberMe));

    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent,
      ipAddress,
      user,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      message: 'Đăng nhập thành công',
      data: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 15 * 60,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          roles,
        },
      },
    };
  }

  async requestForgotPassword(body: ForgotPasswordDto) {
    const user = await this.findUserByEmail(body.email);

    if (!user) {
      throw new NotFoundException('Email chưa đăng ký trong hệ thống');
    }

    const otp = this.generateOtp();
    const expireMinutes = this.getOtpExpireMinutes();
    const normalizedEmail = this.normalizeEmail(user.email);

    await this.emailOtpRepository.update(
      {
        email: normalizedEmail,
        purpose: RESET_PASSWORD_PURPOSE,
        isUsed: false,
      },
      { isUsed: true },
    );

    const emailOtp = this.emailOtpRepository.create({
      email: normalizedEmail,
      userId: user.id,
      pendingEmail: null,
      otpHash: await bcrypt.hash(otp, 10),
      purpose: RESET_PASSWORD_PURPOSE,
      attempts: 0,
      isUsed: false,
      expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
    });

    const savedOtp = await this.emailOtpRepository.save(emailOtp);

    const sent = await this.mailService.sendOtpMail({
      to: user.email,
      subject: 'Khoi phuc mat khau',
      title: 'Khôi phục mật khẩu',
      name: user.fullName,
      username: user.username,
      otp,
      expireMinutes,
      description: `Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản ${user.username}.`,
      template: 'forgot-password',
    });

    if (!sent.success) {
      await this.emailOtpRepository.delete(savedOtp.id);
      throw new BadRequestException('Gửi email không thành công');
    }

    return {
      message:
        sent.mode === 'DEV_FALLBACK'
          ? 'DEV_FALLBACK: OTP đã được log ra console backend'
          : 'Mã OTP đã được gửi về email',
      data: {
        email: user.email,
        expiresInSeconds: expireMinutes * 60,
        mailMode: sent.mode,
        messageId: sent.messageId || null,
      },
    };
  }

  async verifyForgotPasswordOtp(body: VerifyForgotPasswordOtpDto) {
    const user = await this.findUserByEmail(body.email);

    if (!user) {
      throw new NotFoundException('Email chưa đăng ký trong hệ thống');
    }

    const emailOtp = await this.findLatestOtp(
      this.normalizeEmail(user.email),
      RESET_PASSWORD_PURPOSE,
    );

    await this.assertValidOtp(emailOtp, body.otp);

    return {
      message: 'Xác thực OTP thành công',
      data: null,
    };
  }

  async resetPassword(body: ResetPasswordDto) {
    if (body.newPassword !== body.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const user = await this.findUserByEmail(body.email);

    if (!user) {
      throw new NotFoundException('Email chưa đăng ký trong hệ thống');
    }

    const emailOtp = await this.findLatestOtp(
      this.normalizeEmail(user.email),
      RESET_PASSWORD_PURPOSE,
    );

    const validOtp = await this.assertValidOtp(emailOtp, body.otp);

    user.password = await bcrypt.hash(body.newPassword, 10);
    await this.userRepository.save(user);

    validOtp.isUsed = true;
    await this.emailOtpRepository.save(validOtp);

    return {
      message: 'Khôi phục mật khẩu thành công',
      data: null,
    };
  }

  async sendChangeGmailOtp(user: User) {
    const otp = this.generateOtp();
    const expireMinutes = this.getOtpExpireMinutes();
    const currentEmail = this.normalizeEmail(user.email);

    await this.emailOtpRepository
      .createQueryBuilder()
      .update(EmailOtp)
      .set({ isUsed: true })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('purpose = :purpose', { purpose: CHANGE_GMAIL_PURPOSE })
      .andWhere('is_used = :isUsed', { isUsed: false })
      .execute();

    const emailOtp = this.emailOtpRepository.create({
      email: currentEmail,
      userId: user.id,
      pendingEmail: null,
      otpHash: await bcrypt.hash(otp, 10),
      purpose: CHANGE_GMAIL_PURPOSE,
      attempts: 0,
      isUsed: false,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
    });

    const savedOtp = await this.emailOtpRepository.save(emailOtp);

    const sent = await this.mailService.sendOtpMail({
      to: user.email,
      subject: 'Xác thực đổi Gmail',
      title: 'Xác thực đổi Gmail',
      name: user.fullName,
      username: user.username,
      otp,
      expireMinutes,
      description: `Bạn vừa yêu cầu đổi Gmail cho tài khoản ${user.username}.`,
      template: 'change-email',
    });

    if (!sent.success) {
      await this.emailOtpRepository.delete(savedOtp.id);
      throw new BadRequestException('Không gửi được OTP');
    }

    return {
      message:
        sent.mode === 'DEV_FALLBACK'
          ? 'DEV_FALLBACK: OTP đã được log ra console backend'
          : 'Gửi OTP thành công',
      data: {
        email: user.email,
        expiresInSeconds: expireMinutes * 60,
        mailMode: sent.mode,
        messageId: sent.messageId || null,
      },
    };
  }

  async verifyChangeGmailOtp(user: User, body: VerifyChangeGmailOtpDto) {
    const emailOtp = await this.emailOtpRepository.findOne({
      where: {
        userId: user.id,
        email: this.normalizeEmail(user.email),
        purpose: CHANGE_GMAIL_PURPOSE,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const validOtp = await this.assertValidOtp(emailOtp, body.otp);

    validOtp.verifiedAt = new Date();
    await this.emailOtpRepository.save(validOtp);

    return {
      message: 'Xác thực OTP thành công',
      data: null,
    };
  }

  async updateChangeGmail(user: User, body: UpdateChangeGmailDto) {
    const newEmail = this.normalizeEmail(body.newEmail);
    await this.assertNewEmailCanBeUsed(user, newEmail);

    const emailOtp = await this.emailOtpRepository.findOne({
      where: {
        userId: user.id,
        email: this.normalizeEmail(user.email),
        purpose: CHANGE_GMAIL_PURPOSE,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const verifiedOtp = this.assertVerifiedChangeGmailOtp(emailOtp);

    user.email = newEmail;
    await this.userRepository.save(user);

    verifiedOtp.pendingEmail = newEmail;
    verifiedOtp.isUsed = true;
    await this.emailOtpRepository.save(verifiedOtp);

    return {
      message: 'Đổi Gmail thành công',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        isActive: user.isActive,
      },
    };
  }

  private async assertNewEmailCanBeUsed(user: User, newEmail: string) {
    if (this.normalizeEmail(user.email) === newEmail) {
      throw new BadRequestException(
        'Email mới không được trùng email hiện tại',
      );
    }

    const existedUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: newEmail })
      .andWhere('user.id != :userId', { userId: user.id })
      .getOne();

    if (existedUser) {
      throw new BadRequestException('Email đã được sử dụng');
    }
  }

  private assertVerifiedChangeGmailOtp(emailOtp: EmailOtp | null): EmailOtp {
    if (!emailOtp || emailOtp.isUsed || !emailOtp.verifiedAt) {
      throw new BadRequestException(
        'Vui lòng xác thực OTP trước khi đổi Gmail',
      );
    }

    if (emailOtp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP đã hết hạn');
    }

    return emailOtp;
  }

  private async assertValidOtp(
    emailOtp: EmailOtp | null,
    otp: string,
  ): Promise<EmailOtp> {
    if (!emailOtp || emailOtp.isUsed) {
      throw new BadRequestException('OTP không tồn tại hoặc không hợp lệ');
    }

    if (emailOtp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP đã hết hạn');
    }

    if (emailOtp.attempts >= this.getOtpMaxAttempts()) {
      throw new BadRequestException('OTP đã vượt quá số lần thử');
    }

    const isOtpMatch = await bcrypt.compare(otp, emailOtp.otpHash);

    if (!isOtpMatch) {
      emailOtp.attempts += 1;
      await this.emailOtpRepository.save(emailOtp);

      if (emailOtp.attempts >= this.getOtpMaxAttempts()) {
        throw new BadRequestException('OTP đã vượt quá số lần thử');
      }

      throw new BadRequestException('OTP không đúng');
    }

    return emailOtp;
  }

  private async findLatestOtp(email: string, purpose: string) {
    return this.emailOtpRepository.findOne({
      where: {
        email,
        purpose,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private findUserByEmail(email: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', {
        email: this.normalizeEmail(email),
      })
      .getOne();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private generateOtp(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private getOtpExpireMinutes() {
    const value = Number(this.configService.get<string>('OTP_EXPIRE_MINUTES'));
    return Number.isFinite(value) && value > 0 ? value : 5;
  }

  private getOtpMaxAttempts() {
    const value = Number(this.configService.get<string>('OTP_MAX_ATTEMPTS'));
    return Number.isFinite(value) && value > 0 ? value : 5;
  }

  private calculateRefreshTokenExpiresAt(rememberMe: boolean): Date {
    const now = new Date();

    if (rememberMe) {
      now.setDate(now.getDate() + 30);
    } else {
      now.setDate(now.getDate() + 1);
    }

    return now;
  }
}
