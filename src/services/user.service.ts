import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type {} from 'multer';
import { Repository } from 'typeorm';

import type { CurrentUserData } from '../decorators/current-user.decorator';
import { CreateUserDto } from '../dtos/create-user.dto';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { CloudinaryService } from './cloudinary.service';
import { MANAGEMENT_ROLE_CODES, ROLE_CODES } from '../constants/roles.constant';
import {
  mapInternalRoleCodeToApi,
  mapInternalRoleCodesToApi,
  resolveRequestedInternalRoleCode,
  resolveRoleFilterInternalCodes,
} from '../constants/api-role.constant';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    private readonly configService: ConfigService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getUsers(query: ListUsersQueryDto, currentUser: CurrentUserData) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .distinct(true);

    if (query.keyword?.trim()) {
      const keyword = this.toLikeValue(query.keyword);

      queryBuilder.andWhere(
        '(LOWER(user.fullName) LIKE :keyword OR LOWER(user.username) LIKE :keyword OR LOWER(user.email) LIKE :keyword OR LOWER(user.position) LIKE :keyword OR LOWER(role.name) LIKE :keyword OR LOWER(role.code) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.fullName?.trim()) {
      queryBuilder.andWhere('LOWER(user.fullName) LIKE :fullName', {
        fullName: this.toLikeValue(query.fullName),
      });
    }

    if (query.username?.trim()) {
      queryBuilder.andWhere('LOWER(user.username) LIKE :username', {
        username: this.toLikeValue(query.username),
      });
    }

    if (query.email?.trim()) {
      queryBuilder.andWhere('LOWER(user.email) LIKE :email', {
        email: this.toLikeValue(query.email),
      });
    }

    if (query.role?.trim()) {
      const internalRoleCodes = resolveRoleFilterInternalCodes(query.role);

      if (internalRoleCodes) {
        queryBuilder.andWhere('role.code IN (:...roleCodes)', {
          roleCodes: internalRoleCodes,
        });
      } else {
        queryBuilder.andWhere(
          '(LOWER(role.code) LIKE :role OR LOWER(role.name) LIKE :role)',
          {
            role: this.toLikeValue(query.role),
          },
        );
      }
    }

    if (query.position?.trim()) {
      queryBuilder.andWhere('LOWER(user.position) LIKE :position', {
        position: this.toLikeValue(query.position),
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    const [users, totalItems] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách người dùng thành công',
      data: {
        items: users.map((user) => this.mapUserListItem(user)),
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

  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const roles = mapInternalRoleCodesToApi(
      user.userRoles.map((userRole) => userRole.role.code),
    );

    return {
      message: 'Lấy thông tin người dùng thành công',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        dateOfBirth: this.formatDateInput(user.dateOfBirth),
        avatar: user.avatar,
        position: user.position,
        provinceCity: user.provinceCity,
        wardCommune: user.wardCommune,
        address: user.address,
        isActive: user.isActive,
        roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async getUserDetail(id: number, currentUser: CurrentUserData) {
    const user = await this.findUserForManagement(id, currentUser);

    return {
      message: 'Lấy chi tiết người dùng thành công',
      data: this.mapUserDetail(user),
    };
  }

  async createUser(
    createUserDto: CreateUserDto,
    currentUser: CurrentUserData,
    file?: Express.Multer.File,
  ) {
    if (!this.hasManagementRole(currentUser.roles)) {
      throw new BadRequestException('Bạn không có quyền tạo người dùng');
    }

    const username = this.toRequiredString(createUserDto.username);
    const email = this.toRequiredString(createUserDto.email);

    await this.validateUniqueUsername(0, username, '');
    await this.validateUniqueEmail(0, email, '');

    const requestedRole =
      (await this.getRequestedRole(createUserDto, currentUser)) ??
      (await this.getDefaultUserRole());

    let avatarUrl: string | null = null;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        this.configService.get<string>('CLOUDINARY_FOLDER_USERS') || 'users',
      );

      avatarUrl = uploadResult.secure_url;
    }

    const user = this.userRepository.create({
      username,
      password: await bcrypt.hash(
        this.toRequiredString(createUserDto.password),
        10,
      ),
      fullName: this.toRequiredString(createUserDto.fullName),
      email,
      gender: this.toOptionalString(createUserDto.gender, null),
      dateOfBirth: createUserDto.dateOfBirth
        ? new Date(createUserDto.dateOfBirth)
        : null,
      avatar: avatarUrl,
      position: this.toOptionalString(createUserDto.position, null),
      provinceCity: this.toOptionalString(createUserDto.provinceCity, null),
      wardCommune: this.toOptionalString(createUserDto.wardCommune, null),
      address: this.toOptionalString(createUserDto.address, null),
      isActive:
        createUserDto.isActive === undefined
          ? true
          : createUserDto.isActive === 'true',
    });

    const savedUser = await this.userRepository.save(user);

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        user: savedUser,
        role: requestedRole,
      }),
    );

    const createdUser = await this.findUserForManagement(
      savedUser.id,
      currentUser,
    );

    return {
      message: 'Tạo người dùng thành công',
      data: this.mapUserDetail(createdUser),
    };
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUserData,
    file?: Express.Multer.File,
  ) {
    if (id === currentUser.id) {
      return this.updateOwnProfile(id, updateUserDto, file);
    }

    const user = await this.findUserForManagement(id, currentUser);

    if (this.isAdminUser(user) && !this.isCeo(currentUser)) {
      throw new BadRequestException(
        'Chỉ CEO được cập nhật tài khoản quản trị viên',
      );
    }

    await this.validateUniqueUsername(
      id,
      updateUserDto.username,
      user.username,
    );
    await this.validateUniqueEmail(id, updateUserDto.email, user.email);

    const requestedRole = await this.getRequestedRole(
      updateUserDto,
      currentUser,
    );

    const avatarUrl = await this.resolveAvatarUrl(
      user.avatar,
      updateUserDto,
      file,
    );

    user.username =
      this.toTrimmedValue(updateUserDto.username) ?? user.username;
    user.fullName =
      this.toTrimmedValue(updateUserDto.fullName) ?? user.fullName;
    user.email = this.toTrimmedValue(updateUserDto.email) ?? user.email;
    user.gender = this.toOptionalString(updateUserDto.gender, user.gender);
    user.position = this.toOptionalString(
      updateUserDto.position,
      user.position,
    );
    user.provinceCity = this.toOptionalString(
      updateUserDto.provinceCity,
      user.provinceCity,
    );
    user.wardCommune = this.toOptionalString(
      updateUserDto.wardCommune,
      user.wardCommune,
    );
    user.address = this.toOptionalString(updateUserDto.address, user.address);
    user.avatar = avatarUrl;

    if (updateUserDto.password?.trim()) {
      user.password = await bcrypt.hash(updateUserDto.password.trim(), 10);
    }

    if (updateUserDto.dateOfBirth !== undefined) {
      const dateOfBirth = this.toTrimmedValue(updateUserDto.dateOfBirth);
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive === 'true';
    }

    const savedUser = await this.userRepository.save(user);

    if (requestedRole) {
      await this.userRoleRepository
        .createQueryBuilder()
        .delete()
        .from(UserRole)
        .where('user_id = :userId', { userId: savedUser.id })
        .execute();

      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          user: savedUser,
          role: requestedRole,
        }),
      );
    }

    const updatedUser = await this.findUserForManagement(id, currentUser);

    return {
      message: 'Cập nhật người dùng thành công',
      data: this.mapUserDetail(updatedUser),
    };
  }

  private async updateOwnProfile(
    id: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    if (
      updateUserDto.username !== undefined ||
      updateUserDto.password !== undefined ||
      updateUserDto.roleId !== undefined ||
      updateUserDto.roleCode !== undefined ||
      updateUserDto.role !== undefined
    ) {
      throw new BadRequestException(
        'Không được thay đổi tài khoản, mật khẩu hoặc vai trò khi cập nhật hồ sơ',
      );
    }

    const user = await this.findUserById(id);
    await this.validateUniqueEmail(id, updateUserDto.email, user.email);

    user.fullName =
      this.toTrimmedValue(updateUserDto.fullName) ?? user.fullName;
    user.email = this.toTrimmedValue(updateUserDto.email) ?? user.email;
    user.gender = this.toOptionalString(updateUserDto.gender, user.gender);
    user.position = this.toOptionalString(
      updateUserDto.position,
      user.position,
    );
    user.provinceCity = this.toOptionalString(
      updateUserDto.provinceCity,
      user.provinceCity,
    );
    user.wardCommune = this.toOptionalString(
      updateUserDto.wardCommune,
      user.wardCommune,
    );
    user.address = this.toOptionalString(updateUserDto.address, user.address);
    user.avatar = await this.resolveAvatarUrl(
      user.avatar,
      updateUserDto,
      file,
    );

    if (updateUserDto.dateOfBirth !== undefined) {
      const dateOfBirth = this.toTrimmedValue(updateUserDto.dateOfBirth);
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    }

    await this.userRepository.save(user);
    const updatedUser = await this.findUserById(id);

    return {
      message: 'Cập nhật hồ sơ thành công',
      data: this.mapUserDetail(updatedUser),
    };
  }

  private async resolveAvatarUrl(
    currentAvatar: string | null,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        this.configService.get<string>('CLOUDINARY_FOLDER_USERS') || 'users',
      );

      return uploadResult.secure_url;
    }

    if (updateUserDto.removeAvatar === 'true') {
      return null;
    }

    if (updateUserDto.avatar !== undefined) {
      return this.toOptionalString(updateUserDto.avatar, currentAvatar);
    }

    return currentAvatar;
  }

  async deleteUser(id: number, currentUser: CurrentUserData) {
    const user = await this.findManageableUser(id, currentUser);

    await this.userRepository.remove(user);

    return {
      message: 'Xóa người dùng thành công',
      data: {
        id,
      },
    };
  }

  private async validateUniqueUsername(
    id: number,
    username: string | undefined,
    currentUsername: string,
  ) {
    const nextUsername = this.toTrimmedValue(username);

    if (!nextUsername || nextUsername === currentUsername) {
      return;
    }

    const existedUsername = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username: nextUsername })
      .andWhere('user.id != :id', { id })
      .getOne();

    if (existedUsername) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại');
    }
  }

  private async validateUniqueEmail(
    id: number,
    email: string | undefined,
    currentEmail: string,
  ) {
    const nextEmail = this.toTrimmedValue(email);

    if (!nextEmail || nextEmail === currentEmail) {
      return;
    }

    const existedEmail = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: nextEmail })
      .andWhere('user.id != :id', { id })
      .getOne();

    if (existedEmail) {
      throw new BadRequestException('Email đã tồn tại');
    }
  }

  private async findManageableUser(id: number, currentUser: CurrentUserData) {
    const user = await this.findUserForManagement(id, currentUser);

    if (this.isAdminUser(user)) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  private async findUserForManagement(
    id: number,
    currentUser: CurrentUserData,
  ) {
    if (!this.hasManagementRole(currentUser.roles)) {
      throw new BadRequestException('Bạn không có quyền quản lý người dùng');
    }

    return this.findUserById(id);
  }

  private async findUserById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  private async getRequestedRole(
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUserData,
  ) {
    const roleId = this.toTrimmedValue(updateUserDto.roleId);
    const roleCode = this.toTrimmedValue(updateUserDto.roleCode);
    const role = this.toTrimmedValue(updateUserDto.role);

    if (!roleId && !roleCode && !role) {
      return null;
    }

    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    if (roleId) {
      const parsedRoleId = Number(roleId);

      if (!Number.isInteger(parsedRoleId) || parsedRoleId < 1) {
        throw new BadRequestException('Vai trò không hợp lệ');
      }

      queryBuilder.where('role.id = :roleId', { roleId: parsedRoleId });
    } else {
      const requestedRoleCode = resolveRequestedInternalRoleCode(
        roleCode ?? role ?? '',
      );

      queryBuilder.where(
        'LOWER(role.code) = :roleValue OR LOWER(role.name) = :roleValue',
        {
          roleValue: (requestedRoleCode ?? roleCode ?? role ?? '').toLowerCase(),
        },
      );
    }

    const requestedRole = await queryBuilder.getOne();

    if (!requestedRole) {
      throw new BadRequestException('Vai trò không hợp lệ');
    }

    if (this.isManagementRoleCode(requestedRole.code) && !this.isCeo(currentUser)) {
      throw new BadRequestException(
        'Chỉ CEO được gán vai trò quản trị viên',
      );
    }

    return requestedRole;
  }

  private async getDefaultUserRole() {
    const userRole = await this.roleRepository.findOne({
      where: {
        code: ROLE_CODES.EMPLOYEE,
      },
    });

    if (!userRole) {
      throw new BadRequestException('Chưa cấu hình vai trò Employee');
    }

    return userRole;
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

  private toRequiredString(value: string | undefined) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      throw new BadRequestException('Dữ liệu bắt buộc không được để trống');
    }

    return trimmedValue;
  }

  private toOptionalString(
    value: string | undefined,
    currentValue: string | null,
  ) {
    if (value === undefined) {
      return currentValue;
    }

    return value.trim();
  }

  private isAdminUser(user: User) {
    return user.userRoles?.some((userRole) =>
      this.isManagementRoleCode(userRole.role.code),
    );
  }

  private hasManagementRole(roles: string[]) {
    return roles.some((role) => this.isManagementRoleCode(role));
  }

  private isManagementRoleCode(role: string) {
    return (MANAGEMENT_ROLE_CODES as readonly string[]).includes(role);
  }

  private isCeo(currentUser: CurrentUserData) {
    return currentUser.roles.includes(ROLE_CODES.CEO);
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

  private mapUserListItem(user: User) {
    const roles = this.mapRoles(user);
    const roleNames = roles.map((role) => role.name);
    const roleCodes = mapInternalRoleCodesToApi(
      roles.map((role) => role.code),
    );

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      position: user.position,
      isActive: user.isActive,
      statusLabel: user.isActive ? 'Đang hoạt động' : 'Đã khóa',
      roles,
      roleCodes,
      roleNames,
      roleDisplay: roleNames.join(', '),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapUserDetail(user: User) {
    const roles = this.mapRoles(user);
    const primaryRole = roles[0] ?? null;

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      gender: user.gender,
      dateOfBirth: this.formatDateInput(user.dateOfBirth),
      avatar: user.avatar,
      position: user.position,
      provinceCity: user.provinceCity,
      wardCommune: user.wardCommune,
      address: user.address,
      isActive: user.isActive,
      statusLabel: user.isActive ? 'Đang hoạt động' : 'Đã khóa',
      hasPassword: Boolean(user.password),
      roleId: primaryRole?.id ?? null,
      roleCode: primaryRole?.code ?? null,
      roleName: primaryRole?.name ?? null,
      roleDisplay: roles.map((role) => role.name).join(', '),
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapRoles(user: User) {
    return (
      user.userRoles?.map((userRole) => ({
        id: userRole.role.id,
        code: mapInternalRoleCodeToApi(userRole.role.code),
        name: userRole.role.name,
      })) ?? []
    );
  }
}
