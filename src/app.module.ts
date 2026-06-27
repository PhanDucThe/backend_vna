import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { BusinessAttachment } from './entities/business-attachment.entity';
import { Business } from './entities/business.entity';
import { RoleSeedService } from './services/role-seed.service';
import { UserSeedService } from './services/user-seed.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { BusinessProfileController } from './controllers/business-profile.controller';
import { BusinessRegistrationController } from './controllers/business-registration.controller';
import { AuthService } from './services/auth.service';
import { BusinessController } from './controllers/business.controller';
import { BusinessService } from './services/business.service';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { CloudinaryService } from './services/cloudinary.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailOtp } from './entities/email-otp.entity';
import { MailService } from './services/mail.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

// Labor Accident Imports
import { LaborAccidentCatalog } from './entities/labor-accident-catalog.entity';
import { LaborAccidentReportAttachment } from './entities/labor-accident-report-attachment.entity';
import { LaborAccidentReportDetail } from './entities/labor-accident-report-detail.entity';
import { LaborAccidentReport } from './entities/labor-accident-report.entity';
import { LaborAccidentReportPeriod } from './entities/labor-accident-report-period.entity';

import { LaborAccidentCatalogController } from './controllers/labor-accident-catalog.controller';
import { LaborAccidentReportPeriodController } from './controllers/labor-accident-report-period.controller';
import { LaborAccidentReportController } from './controllers/labor-accident-report.controller';

import { LaborAccidentCatalogService } from './services/labor-accident-catalog.service';
import { LaborAccidentReportPeriodService } from './services/labor-accident-report-period.service';
import {
  LaborAccidentReportService,
  LaborAccidentReportAdminController,
  LaborAccidentReportBusinessExportController,
} from './services/labor-accident-report.service';
import { LaborAccidentCatalogSeedService } from './services/labor-accident-catalog-seed.service';

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

        entities: [
          User,
          Role,
          UserRole,
          RefreshToken,
          EmailOtp,
          Business,
          BusinessAttachment,
          LaborAccidentCatalog,
          LaborAccidentReportAttachment,
          LaborAccidentReportDetail,
          LaborAccidentReport,
          LaborAccidentReportPeriod,
        ],

        synchronize: true,
      }),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      RefreshToken,
      EmailOtp,
      Business,
      BusinessAttachment,
      LaborAccidentCatalog,
      LaborAccidentReportAttachment,
      LaborAccidentReportDetail,
      LaborAccidentReport,
      LaborAccidentReportPeriod,
    ]),
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
  controllers: [
    AuthController,
    UserController,
    BusinessProfileController,
    BusinessRegistrationController,
    BusinessController,
    LaborAccidentCatalogController,
    LaborAccidentReportPeriodController,
    LaborAccidentReportController,
    LaborAccidentReportAdminController,
    LaborAccidentReportBusinessExportController,
  ],
  providers: [
    AuthService,
    UserService,
    BusinessService,
    CloudinaryService,
    MailService,
    JwtAuthGuard,
    RolesGuard,
    JwtStrategy,
    RoleSeedService,
    UserSeedService,
    LaborAccidentCatalogService,
    LaborAccidentReportPeriodService,
    LaborAccidentReportService,
    LaborAccidentCatalogSeedService,
  ],
})
export class AppModule { }
