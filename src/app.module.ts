import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { RoleSeedService } from './services/role-seed.service';
import { UserSeedService } from './services/user-seed.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { CloudinaryService } from './services/cloudinary.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailOtp } from './entities/email-otp.entity';
import { MailService } from './services/mail.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

        entities: [User, Role, UserRole, RefreshToken, EmailOtp],

        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User, Role, UserRole, RefreshToken, EmailOtp]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expires = configService.get<string>('JWT_EXPIRES_IN');
        const expiresIn = expires
          ? isNaN(Number(expires))
            ? (expires as any)
            : Number(expires)
          : undefined;

        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    UserService,
    CloudinaryService,
    MailService,
    JwtAuthGuard,
    RoleSeedService,
    UserSeedService,
  ],
})
export class AppModule {}
