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
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { CloudinaryService } from './cloudinary.service';

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

    if (currentUser.roles.includes('ADMIN')) {
      this.excludeAdminUsers(queryBuilder);
    }

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
      queryBuilder.andWhere(
        '(LOWER(role.code) LIKE :role OR LOWER(role.name) LIKE :role)',
        {
          role: this.toLikeValue(query.role),
        },
      );
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
      message: 'Lay danh sach nguoi dung thanh cong',
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
      throw new NotFoundException('Khong tim thay nguoi dung');
    }

    const roles = user.userRoles.map((userRole) => userRole.role.code);

    return {
      message: 'Lay thong tin nguoi dung thanh cong',
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
    const user = await this.findManageableUser(id, currentUser);

    return {
      message: 'Lay chi tiet nguoi dung thanh cong',
      data: this.mapUserDetail(user),
    };
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUserData,
    file?: Express.Multer.File,
  ) {
    const user = await this.findManageableUser(id, currentUser);

    await this.validateUniqueUsername(id, updateUserDto.username, user.username);
    await this.validateUniqueEmail(id, updateUserDto.email, user.email);

    const requestedRole = await this.getRequestedRole(updateUserDto);

    let avatarUrl = user.avatar;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        this.configService.get<string>('CLOUDINARY_FOLDER_USERS') || 'users',
      );

      avatarUrl = uploadResult.secure_url;
    } else if (updateUserDto.removeAvatar === 'true') {
      avatarUrl = null;
    } else if (updateUserDto.avatar !== undefined) {
      avatarUrl = this.toOptionalString(updateUserDto.avatar, user.avatar);
    }

    user.username = this.toTrimmedValue(updateUserDto.username) ?? user.username;
    user.fullName = this.toTrimmedValue(updateUserDto.fullName) ?? user.fullName;
    user.email = this.toTrimmedValue(updateUserDto.email) ?? user.email;
    user.gender = this.toOptionalString(updateUserDto.gender, user.gender);
    user.position = this.toOptionalString(updateUserDto.position, user.position);
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

    const updatedUser = await this.findManageableUser(id, currentUser);

    return {
      message: 'Cap nhat nguoi dung thanh cong',
      data: this.mapUserDetail(updatedUser),
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
      throw new BadRequestException('Ten dang nhap da ton tai');
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
      throw new BadRequestException('Email da ton tai');
    }
  }

  private async findManageableUser(id: number, currentUser: CurrentUserData) {
    if (!currentUser.roles.includes('ADMIN')) {
      throw new BadRequestException('Ban khong co quyen quan ly nguoi dung');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        userRoles: {
          role: true,
        },
      },
    });

    if (!user || this.isAdminUser(user)) {
      throw new NotFoundException('Khong tim thay nguoi dung');
    }

    return user;
  }

  private async getRequestedRole(updateUserDto: UpdateUserDto) {
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
        throw new BadRequestException('Vai tro khong hop le');
      }

      queryBuilder.where('role.id = :roleId', { roleId: parsedRoleId });
    } else {
      queryBuilder.where(
        'LOWER(role.code) = :roleValue OR LOWER(role.name) = :roleValue',
        {
          roleValue: (roleCode ?? role ?? '').toLowerCase(),
        },
      );
    }

    const requestedRole = await queryBuilder.getOne();

    if (!requestedRole) {
      throw new BadRequestException('Vai tro khong hop le');
    }

    if (requestedRole.code === 'ADMIN') {
      throw new BadRequestException(
        'Khong the gan vai tro quan tri vien tai man quan ly nguoi dung',
      );
    }

    return requestedRole;
  }

  private excludeAdminUsers(queryBuilder: ReturnType<Repository<User>['createQueryBuilder']>) {
    queryBuilder.andWhere(
      `NOT EXISTS (
        SELECT 1
        FROM user_roles admin_user_role
        INNER JOIN roles admin_role ON admin_role.id = admin_user_role.role_id
        WHERE admin_user_role.user_id = "user"."id"
        AND admin_role.code = :excludedRole
      )`,
      { excludedRole: 'ADMIN' },
    );
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
    return user.userRoles?.some((userRole) => userRole.role.code === 'ADMIN');
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
    const roleCodes = roles.map((role) => role.code);

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      position: user.position,
      isActive: user.isActive,
      statusLabel: user.isActive ? 'Dang hoat dong' : 'Da khoa',
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
      statusLabel: user.isActive ? 'Dang hoat dong' : 'Da khoa',
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
        code: userRole.role.code,
        name: userRole.role.name,
      })) ?? []
    );
  }
}
