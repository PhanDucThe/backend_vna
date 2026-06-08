import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_otps')
export class EmailOtp {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    length: 150,
  })
  email: string;

  @Column({
    name: 'otp_hash',
    type: 'text',
  })
  otpHash: string;

  @Column({
    length: 50,
  })
  purpose: string;

  @Column({
    name: 'is_used',
    default: false,
  })
  isUsed: boolean;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
  })
  expiresAt: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
