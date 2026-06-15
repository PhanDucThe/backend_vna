import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import type {} from 'multer';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'users',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File upload phải là ảnh');
    }

    if (!file.buffer) {
      throw new BadRequestException('Không đọc được dữ liệu ảnh upload');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new InternalServerErrorException('Upload ảnh thất bại'));
            return;
          }

          if (!result) {
            reject(
              new InternalServerErrorException(
                'Không nhận được kết quả upload',
              ),
            );
            return;
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'businesses',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file');
    }

    if (!file.buffer) {
      throw new BadRequestException('Không đọc được dữ liệu file upload');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(new InternalServerErrorException('Upload file thất bại'));
            return;
          }

          if (!result) {
            reject(
              new InternalServerErrorException(
                'Không nhận được kết quả upload file',
              ),
            );
            return;
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
