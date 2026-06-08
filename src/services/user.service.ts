import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateUserDto } from '../dtos/update-user.dto';
import { User } from '../entities/user.entity';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

    const roles = user.userRoles.map((userRole) => userRole.role.code);

    return {
      message: 'Lấy thông tin người dùng thành công',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
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

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existedEmail = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existedEmail) {
        throw new BadRequestException('Email đã tồn tại');
      }
    }

    let avatarUrl = user.avatar;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'users',
      );

      avatarUrl = uploadResult.secure_url;
    }

    user.fullName = updateUserDto.fullName ?? user.fullName;
    user.email = updateUserDto.email ?? user.email;
    user.gender = updateUserDto.gender ?? user.gender;
    user.position = updateUserDto.position ?? user.position;
    user.provinceCity = updateUserDto.provinceCity ?? user.provinceCity;
    user.wardCommune = updateUserDto.wardCommune ?? user.wardCommune;
    user.address = updateUserDto.address ?? user.address;
    user.avatar = avatarUrl;

    if (updateUserDto.dateOfBirth) {
      user.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive === 'true';
    }

    const savedUser = await this.userRepository.save(user);

    return {
      message: 'Cập nhật người dùng thành công',
      data: {
        id: savedUser.id,
        username: savedUser.username,
        fullName: savedUser.fullName,
        email: savedUser.email,
        gender: savedUser.gender,
        dateOfBirth: savedUser.dateOfBirth,
        position: savedUser.position,
        provinceCity: savedUser.provinceCity,
        wardCommune: savedUser.wardCommune,
        address: savedUser.address,
        avatar: savedUser.avatar,
        isActive: savedUser.isActive,
      },
    };
  }
}
