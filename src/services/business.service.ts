import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository, EntityManager } from 'typeorm';

import { CreateBusinessDto } from '../dtos/create-business.dto';
import { BUSINESS_TYPES } from '../dtos/create-business.dto';
import { ListBusinessesQueryDto } from '../dtos/list-businesses-query.dto';
import { UpdateBusinessDto } from '../dtos/update-business.dto';
import { BusinessAttachment } from '../entities/business-attachment.entity';
import { Business } from '../entities/business.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { CloudinaryService } from './cloudinary.service';

const DEFAULT_BUSINESS_ACCOUNT_PASSWORD = '12345678';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    @InjectRepository(BusinessAttachment)
    private readonly attachmentRepository: Repository<BusinessAttachment>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    private readonly cloudinaryService: CloudinaryService,

    private readonly configService: ConfigService,
  ) {}

  getBusinessOptions() {
    return {
      message: 'Lấy danh mục doanh nghiệp thành công',
      data: {
        businessTypes: BUSINESS_TYPES,
        taxCodeRules: {
          format: '10 digits or 10 digits-3 digits',
          examples: ['910000888292'.slice(0, 10), '0100109106-001'],
        },
        industryLevel: 4,
        industryCodeRule: 'Mã ngành nghề cấp 4 gồm 4 chữ số theo VSIC',
      },
    };
  }

  async getBusinesses(query: ListBusinessesQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.attachments', 'attachment')
      .distinct(true);

    if (query.keyword?.trim()) {
      const keyword = this.toLikeValue(query.keyword);

      queryBuilder.andWhere(
        '(LOWER(business.businessName) LIKE :keyword OR LOWER(business.taxCode) LIKE :keyword OR LOWER(business.businessType) LIKE :keyword OR LOWER(business.industryCode) LIKE :keyword OR LOWER(business.industryName) LIKE :keyword OR LOWER(business.wardCommune) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.businessName?.trim()) {
      queryBuilder.andWhere(
        'LOWER(business.businessName) LIKE :businessName',
        { businessName: this.toLikeValue(query.businessName) },
      );
    }

    if (query.taxCode?.trim()) {
      queryBuilder.andWhere('LOWER(business.taxCode) LIKE :taxCode', {
        taxCode: this.toLikeValue(query.taxCode),
      });
    }

    if (query.businessType?.trim()) {
      queryBuilder.andWhere(
        'LOWER(business.businessType) LIKE :businessType',
        { businessType: this.toLikeValue(query.businessType) },
      );
    }

    if (query.industryCode?.trim()) {
      queryBuilder.andWhere(
        'LOWER(business.industryCode) LIKE :industryCode',
        { industryCode: this.toLikeValue(query.industryCode) },
      );
    }

    if (query.industryName?.trim()) {
      queryBuilder.andWhere(
        'LOWER(business.industryName) LIKE :industryName',
        { industryName: this.toLikeValue(query.industryName) },
      );
    }

    if (query.wardCommune?.trim()) {
      queryBuilder.andWhere(
        'LOWER(business.wardCommune) LIKE :wardCommune',
        { wardCommune: this.toLikeValue(query.wardCommune) },
      );
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      queryBuilder.andWhere('business.isActive = :isActive', {
        isActive: this.toBoolean(query.isActive),
      });
    }

    const [businesses, totalItems] = await queryBuilder
      .orderBy('business.createdAt', 'DESC')
      .addOrderBy('business.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách doanh nghiệp thành công',
      data: {
        items: businesses.map((business) => this.mapBusiness(business)),
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

  async getBusinessDetail(id: number) {
    const business = await this.findBusiness(id);

    return {
      message: 'Lấy chi tiết doanh nghiệp thành công',
      data: this.mapBusiness(business),
    };
  }

  async createBusiness(
    createBusinessDto: CreateBusinessDto,
    files: Express.Multer.File[] = [],
  ) {
    const taxCode = this.normalizeTaxCode(createBusinessDto.taxCode);

    await this.validateUniqueTaxCode(taxCode);
    await this.validateUniqueBusinessAccount(taxCode, createBusinessDto.email);
    this.validateBusinessPayload(createBusinessDto);

    const createdBusiness = await this.businessRepository.manager.transaction(
      async (tem: EntityManager) => {
        // 1. Create default business user account
        const accountUser = await this.createBusinessAccountTx(
          tem,
          createBusinessDto,
          taxCode,
        );

        // 2. Instantiate and save business entity
        const business = tem.create(Business, {
          businessName: this.toRequiredValue(createBusinessDto.businessName),
          foreignName: this.toOptionalValue(createBusinessDto.foreignName),
          taxCode,
          businessType: this.toRequiredValue(createBusinessDto.businessType),
          industryCode: this.toRequiredValue(createBusinessDto.industryCode),
          industryName: this.toRequiredValue(createBusinessDto.industryName),
          licenseIssueDate: this.toDateValue(createBusinessDto.licenseIssueDate),
          provinceCity: this.toRequiredValue(createBusinessDto.provinceCity),
          wardCommune: this.toRequiredValue(createBusinessDto.wardCommune),
          address: this.toOptionalValue(createBusinessDto.address),
          email: this.toOptionalValue(createBusinessDto.email),
          agencyPhone: this.toOptionalValue(createBusinessDto.agencyPhone),
          operatingProvinceCity: this.toOptionalValue(
            createBusinessDto.operatingProvinceCity,
          ),
          operatingWardCommune: this.toOptionalValue(
            createBusinessDto.operatingWardCommune,
          ),
          businessLocation: this.toOptionalValue(
            createBusinessDto.businessLocation,
          ),
          representativeName: this.toOptionalValue(
            createBusinessDto.representativeName,
          ),
          representativePhone: this.toOptionalValue(
            createBusinessDto.representativePhone,
          ),
          isActive: this.toBoolean(createBusinessDto.isActive, true),
          accountUser,
        });

        const savedBusiness = await tem.save(Business, business);

        // 3. Save attachments
        await this.saveAttachmentsTx(
          tem,
          savedBusiness,
          files,
          createBusinessDto.attachmentNames,
        );

        return savedBusiness;
      },
    );

    const createdBusinessWithRelations = await this.findBusiness(createdBusiness.id);

    return {
      message: 'Thêm doanh nghiệp thành công',
      data: {
        ...this.mapBusiness(createdBusinessWithRelations),
        accountInfo: {
          username: taxCode,
          password: DEFAULT_BUSINESS_ACCOUNT_PASSWORD,
        },
      },
    };
  }

  private async createBusinessAccountTx(
    tem: EntityManager,
    createBusinessDto: CreateBusinessDto,
    taxCode: string,
  ) {
    const userRole = await tem.findOne(Role, {
      where: {
        code: 'USER',
      },
    });

    if (!userRole) {
      throw new BadRequestException('Chua cau hinh vai tro USER');
    }

    const email =
      this.toTrimmedValue(createBusinessDto.email) ||
      `${taxCode}@business.local`;

    const accountUser = await tem.save(
      User,
      tem.create(User, {
        username: taxCode,
        password: await bcrypt.hash(DEFAULT_BUSINESS_ACCOUNT_PASSWORD, 10),
        fullName: this.toRequiredValue(createBusinessDto.businessName),
        email,
        position: 'Doanh nghiep',
        provinceCity: this.toOptionalValue(createBusinessDto.provinceCity),
        wardCommune: this.toOptionalValue(createBusinessDto.wardCommune),
        address: this.toOptionalValue(createBusinessDto.address),
        isActive: true,
      }),
    );

    await tem.save(
      UserRole,
      tem.create(UserRole, {
        user: accountUser,
        role: userRole,
      }),
    );

    return accountUser;
  }

  private async saveAttachmentsTx(
    tem: EntityManager,
    business: Business,
    files: Express.Multer.File[],
    attachmentNames?: string,
  ) {
    if (!files.length) {
      return;
    }

    const names = this.parseAttachmentNames(attachmentNames);
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER_BUSINESSES') ||
      'businesses';

    for (const [index, file] of files.entries()) {
      const uploadResult = await this.cloudinaryService.uploadFile(file, folder);
      const displayName = names[index] || file.originalname;

      // Find and remove existing attachment with same displayName for this business
      const existedAttachment = await tem.findOne(BusinessAttachment, {
        where: {
          business: { id: business.id },
          displayName,
        },
      });

      if (existedAttachment) {
        await tem.remove(BusinessAttachment, existedAttachment);
      }

      await tem.save(
        BusinessAttachment,
        tem.create(BusinessAttachment, {
          business,
          displayName,
          originalName: file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          mimetype: file.mimetype,
          size: file.size,
        }),
      );
    }
  }

  async updateBusiness(
    id: number,
    updateBusinessDto: UpdateBusinessDto,
    files: Express.Multer.File[] = [],
  ) {
    const business = await this.findBusiness(id);
    this.validateBusinessPayload(updateBusinessDto, false);

    const nextTaxCode = updateBusinessDto.taxCode
      ? this.normalizeTaxCode(updateBusinessDto.taxCode)
      : undefined;

    if (nextTaxCode && nextTaxCode !== business.taxCode) {
      await this.validateUniqueTaxCode(nextTaxCode, id);
    }

    const updatedBusiness = await this.businessRepository.manager.transaction(
      async (tem: EntityManager) => {
        if (nextTaxCode && nextTaxCode !== business.taxCode) {
          business.taxCode = nextTaxCode;
        }

        business.businessName =
          this.toTrimmedValue(updateBusinessDto.businessName) ??
          business.businessName;
        business.foreignName = this.toOptionalValue(
          updateBusinessDto.foreignName,
          business.foreignName,
        );
        business.businessType =
          this.toTrimmedValue(updateBusinessDto.businessType) ??
          business.businessType;
        business.industryCode =
          this.toTrimmedValue(updateBusinessDto.industryCode) ??
          business.industryCode;
        business.industryName =
          this.toTrimmedValue(updateBusinessDto.industryName) ??
          business.industryName;
        business.licenseIssueDate =
          updateBusinessDto.licenseIssueDate === undefined
            ? business.licenseIssueDate
            : this.toDateValue(updateBusinessDto.licenseIssueDate);
        business.provinceCity =
          this.toTrimmedValue(updateBusinessDto.provinceCity) ??
          business.provinceCity;
        business.wardCommune =
          this.toTrimmedValue(updateBusinessDto.wardCommune) ??
          business.wardCommune;
        business.address = this.toOptionalValue(
          updateBusinessDto.address,
          business.address,
        );
        business.email = this.toOptionalValue(updateBusinessDto.email, business.email);
        business.agencyPhone = this.toOptionalValue(
          updateBusinessDto.agencyPhone,
          business.agencyPhone,
        );
        business.operatingProvinceCity = this.toOptionalValue(
          updateBusinessDto.operatingProvinceCity,
          business.operatingProvinceCity,
        );
        business.operatingWardCommune = this.toOptionalValue(
          updateBusinessDto.operatingWardCommune,
          business.operatingWardCommune,
        );
        business.businessLocation = this.toOptionalValue(
          updateBusinessDto.businessLocation,
          business.businessLocation,
        );
        business.representativeName = this.toOptionalValue(
          updateBusinessDto.representativeName,
          business.representativeName,
        );
        business.representativePhone = this.toOptionalValue(
          updateBusinessDto.representativePhone,
          business.representativePhone,
        );

        if (updateBusinessDto.isActive !== undefined) {
          business.isActive = this.toBoolean(updateBusinessDto.isActive);
        }

        const saved = await tem.save(Business, business);
        await this.saveAttachmentsTx(tem, saved, files, updateBusinessDto.attachmentNames);

        return saved;
      },
    );

    const updatedBusinessWithRelations = await this.findBusiness(id);

    return {
      message: 'Cập nhật doanh nghiệp thành công',
      data: this.mapBusiness(updatedBusinessWithRelations),
    };
  }

  async updateBusinessStatus(id: number, isActive: string | boolean) {
    const business = await this.findBusiness(id);
    business.isActive = this.toBoolean(isActive);

    const savedBusiness = await this.businessRepository.save(business);

    return {
      message: 'Cập nhật trạng thái doanh nghiệp thành công',
      data: this.mapBusiness(savedBusiness),
    };
  }

  async deleteBusiness(id: number) {
    const business = await this.findBusiness(id);

    await this.businessRepository.manager.transaction(async (tem: EntityManager) => {
      // 1. Delete associated user role entries and the user account
      if (business.accountUser) {
        await tem.createQueryBuilder()
          .delete()
          .from(UserRole)
          .where('user_id = :userId', { userId: business.accountUser.id })
          .execute();

        await tem.remove(User, business.accountUser);
      }

      // 2. Delete attachments
      if (business.attachments && business.attachments.length > 0) {
        await tem.remove(business.attachments);
      }

      // 3. Delete the business itself
      await tem.remove(Business, business);
    });

    return {
      message: 'Xóa doanh nghiệp thành công',
      data: { id },
    };
  }

  async deleteAttachment(businessId: number, attachmentId: number) {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, business: { id: businessId } },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy file đính kèm');
    }

    await this.attachmentRepository.remove(attachment);

    return {
      message: 'Xóa file đính kèm thành công',
      data: { id: attachmentId },
    };
  }

  private async findBusiness(id: number) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: {
        attachments: true,
        accountUser: true,
      },
      order: {
        attachments: {
          id: 'ASC',
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Không tìm thấy doanh nghiệp');
    }

    return business;
  }

  private async validateUniqueTaxCode(taxCode: string, ignoredId?: number) {
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .where('business.taxCode = :taxCode', { taxCode });

    if (ignoredId) {
      queryBuilder.andWhere('business.id != :ignoredId', { ignoredId });
    }

    const existedBusiness = await queryBuilder.getOne();

    if (existedBusiness) {
      throw new BadRequestException('Mã số thuế đã tồn tại');
    }
  }

  private async validateUniqueBusinessAccount(taxCode: string, email?: string) {
    const existedUsername = await this.userRepository.findOne({
      where: {
        username: taxCode,
      },
    });

    if (existedUsername) {
      throw new BadRequestException(
        'Mã số thuế đã được sử dụng làm tài khoản đăng nhập',
      );
    }

    const normalizedEmail = this.toTrimmedValue(email);

    if (!normalizedEmail) {
      return;
    }

    const existedEmail = await this.userRepository.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existedEmail) {
      throw new BadRequestException(
        'Email đã được sử dụng bởi tài khoản khác',
      );
    }
  }

  private async createBusinessAccount(
    createBusinessDto: CreateBusinessDto,
    taxCode: string,
  ) {
    const userRole = await this.roleRepository.findOne({
      where: {
        code: 'USER',
      },
    });

    if (!userRole) {
      throw new BadRequestException('Chưa cấu hình vai trò USER');
    }

    const email =
      this.toTrimmedValue(createBusinessDto.email) ||
      `${taxCode}@business.local`;

    const accountUser = await this.userRepository.save(
      this.userRepository.create({
        username: taxCode,
        password: await bcrypt.hash(DEFAULT_BUSINESS_ACCOUNT_PASSWORD, 10),
        fullName: this.toRequiredValue(createBusinessDto.businessName),
        email,
        position: 'Doanh nghiep',
        provinceCity: this.toOptionalValue(createBusinessDto.provinceCity),
        wardCommune: this.toOptionalValue(createBusinessDto.wardCommune),
        address: this.toOptionalValue(createBusinessDto.address),
        isActive: true,
      }),
    );

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        user: accountUser,
        role: userRole,
      }),
    );

    return accountUser;
  }

  private validateBusinessPayload(
    payload: CreateBusinessDto | UpdateBusinessDto,
    requireAll = true,
  ) {
    const taxCode = this.toTrimmedValue(payload.taxCode);
    const industryCode = this.toTrimmedValue(payload.industryCode);
    const licenseIssueDate = this.toTrimmedValue(payload.licenseIssueDate);

    if ((requireAll || taxCode) && taxCode && !/^\d{10}(-\d{3})?$/.test(taxCode)) {
      throw new BadRequestException(
        'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số',
      );
    }

    if (
      (requireAll || industryCode) &&
      industryCode &&
      !/^\d{4}$/.test(industryCode)
    ) {
      throw new BadRequestException(
        'Mã ngành nghề kinh doanh cấp 4 phải gồm 4 chữ số',
      );
    }

    if (licenseIssueDate) {
      const date = this.toDateValue(licenseIssueDate);

      if (date && date.getTime() > Date.now()) {
        throw new BadRequestException('Ngày cấp GPKD không được lớn hơn hiện tại');
      }
    }

    this.validatePhone(payload.agencyPhone, 'Số điện thoại cơ quan');
    this.validatePhone(payload.representativePhone, 'SĐT liên hệ người đứng đầu');
  }

  private validatePhone(value: string | undefined, label: string) {
    const phone = this.toTrimmedValue(value);

    if (!phone) {
      return;
    }

    if (!/^(0|\+84)(\d{9,10})$/.test(phone.replace(/\s/g, ''))) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
  }

  private async saveAttachments(
    business: Business,
    files: Express.Multer.File[],
    attachmentNames?: string,
  ) {
    if (!files.length) {
      return;
    }

    const names = this.parseAttachmentNames(attachmentNames);
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER_BUSINESSES') ||
      'businesses';

    for (const [index, file] of files.entries()) {
      const uploadResult = await this.cloudinaryService.uploadFile(file, folder);
      const displayName = names[index] || file.originalname;

      await this.attachmentRepository.save(
        this.attachmentRepository.create({
          business,
          displayName,
          originalName: file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          mimetype: file.mimetype,
          size: file.size,
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

  private normalizeTaxCode(value: string) {
    return this.toRequiredValue(value).replace(/\s/g, '');
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

  private toTrimmedValue(value: string | undefined) {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  private toRequiredValue(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new BadRequestException('Dữ liệu bắt buộc không được để trống');
    }

    return trimmedValue;
  }

  private toOptionalValue(
    value: string | undefined,
    currentValue: string | null = null,
  ) {
    if (value === undefined) {
      return currentValue;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private toDateValue(value: string | undefined) {
    const dateValue = this.toTrimmedValue(value);

    if (!dateValue) {
      return null;
    }

    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Ngày cấp GPKD không hợp lệ');
    }

    return parsedDate;
  }

  private toBoolean(value: string | boolean | undefined, defaultValue = false) {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value === 'true';
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

  private mapBusiness(business: Business) {
    return {
      id: business.id,
      businessName: business.businessName,
      foreignName: business.foreignName,
      taxCode: business.taxCode,
      businessType: business.businessType,
      industryCode: business.industryCode,
      industryName: business.industryName,
      industryDisplay: `${business.industryCode} - ${business.industryName}`,
      licenseIssueDate: this.formatDateInput(business.licenseIssueDate),
      provinceCity: business.provinceCity,
      wardCommune: business.wardCommune,
      address: business.address,
      email: business.email,
      agencyPhone: business.agencyPhone,
      operatingProvinceCity: business.operatingProvinceCity,
      operatingWardCommune: business.operatingWardCommune,
      businessLocation: business.businessLocation,
      representativeName: business.representativeName,
      representativePhone: business.representativePhone,
      isActive: business.isActive,
      statusLabel: business.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động',
      attachments:
        business.attachments?.map((attachment) => ({
          id: attachment.id,
          displayName: attachment.displayName,
          originalName: attachment.originalName,
          fileUrl: attachment.fileUrl,
          mimetype: attachment.mimetype,
          size: attachment.size,
          createdAt: attachment.createdAt,
        })) ?? [],
      accountUserId: business.accountUser?.id ?? null,
      accountUsername: business.accountUser?.username ?? business.taxCode,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }
}
