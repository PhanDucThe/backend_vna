import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    name: 'token_hash',
    type: 'text',
  })
  tokenHash: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
  })
  expiresAt: Date;

  @Column({
    name: 'is_revoked',
    default: false,
  })
  isRevoked: boolean;

  @Column({
    name: 'user_agent',
    type: 'text',
    nullable: true,
  })
  userAgent: string;

  @Column({
    name: 'ip_address',
    length: 100,
    nullable: true,
  })
  ipAddress: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
