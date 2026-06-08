import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class UserSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async onApplicationBootstrap() {
    await this.createDefaultUsers();
  }

  private async createDefaultUsers() {
    const adminRole = await this.roleRepository.findOne({
      where: {
        code: 'ADMIN',
      },
    });

    const userRole = await this.roleRepository.findOne({
      where: {
        code: 'USER',
      },
    });

    if (!adminRole || !userRole) {
      return;
    }

    await this.createUserIfNotExists({
      username: 'admin',
      password: '123456',
      fullName: 'Quản trị viên',
      email: 'admin@gmail.com',
      role: adminRole,
      position: 'Admin hệ thống',
    });

    await this.createUserIfNotExists({
      username: 'user',
      password: '123456',
      fullName: 'Người dùng mẫu',
      email: 'user@gmail.com',
      role: userRole,
      position: 'Khách hàng',
    });
  }

  private async createUserIfNotExists(data: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    role: Role;
    position: string;
  }) {
    const existedUser = await this.userRepository.findOne({
      where: {
        username: data.username,
      },
    });

    if (existedUser) {
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = this.userRepository.create({
      username: data.username,
      password: hashedPassword,
      fullName: data.fullName,
      email: data.email,
      position: data.position,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    const userRole = this.userRoleRepository.create({
      user: savedUser,
      role: data.role,
    });

    await this.userRoleRepository.save(userRole);
  }
}
