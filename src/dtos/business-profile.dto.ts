import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Matches } from 'class-validator';

import { UpdateBusinessDto } from './update-business.dto';

export class UpdateBusinessProfileDto extends OmitType(UpdateBusinessDto, [
  'taxCode',
  'isActive',
] as const) {}

export class VerifyBusinessProfileEmailOtpDto {
  @ApiProperty({ example: '123456', description: 'OTP gồm đúng 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 chữ số' })
  otp!: string;
}
