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
      throw new BadRequestException('Vui long chon anh');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File upload phai la anh');
    }

    if (!file.buffer) {
      throw new BadRequestException('Khong doc duoc du lieu anh upload');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(new InternalServerErrorException('Upload anh that bai'));
            return;
          }

          if (!result) {
            reject(
              new InternalServerErrorException(
                'Khong nhan duoc ket qua upload',
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
