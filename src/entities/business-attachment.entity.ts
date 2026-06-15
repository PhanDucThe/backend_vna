import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Business } from './business.entity';

@Entity('business_attachments')
export class BusinessAttachment {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    name: 'display_name',
    length: 150,
  })
  displayName!: string;

  @Column({
    name: 'original_name',
    length: 255,
  })
  originalName!: string;

  @Column({
    name: 'file_url',
    type: 'text',
  })
  fileUrl!: string;

  @Column({
    name: 'public_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  publicId!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  mimetype!: string | null;

  @Column({
    type: 'integer',
    nullable: true,
  })
  size!: number | null;

  @ManyToOne(() => Business, (business) => business.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'business_id',
  })
  business!: Business;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;
}
