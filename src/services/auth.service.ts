import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { LoginDto } from '../dtos/login.dto';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,
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
