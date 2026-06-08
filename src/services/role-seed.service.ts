import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../entities/role.entity';

@Injectable()
export class RoleSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onApplicationBootstrap() {
    await this.createDefaultRoles();
  }

  private async createDefaultRoles() {
    const roles = [
      {
        code: 'ADMIN',
        name: 'Quản trị viên',
      },
      {
        code: 'USER',
        name: 'Người dùng',
      },
    ];

    for (const role of roles) {
      const existedRole = await this.roleRepository.findOne({
        where: {
          code: role.code,
        },
      });

      if (!existedRole) {
        await this.roleRepository.save(role);
      }
    }
  }
}
