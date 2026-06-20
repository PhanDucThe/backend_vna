import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { LaborAccidentReport } from './labor-accident-report.entity';
import { User } from './user.entity';

export enum LaborAccidentReportAttachmentType {
  STAMPED_REPORT = 'STAMPED_REPORT',
  EXPORT_FILE = 'EXPORT_FILE',
  OTHER = 'OTHER',
}

@Entity('labor_accident_report_attachments')
export class LaborAccidentReportAttachment {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => LaborAccidentReport, (report) => report.attachments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'report_id',
  })
  report!: LaborAccidentReport;

  @Column({
    type: 'enum',
    enum: LaborAccidentReportAttachmentType,
    enumName: 'labor_accident_report_attachment_type',
    default: LaborAccidentReportAttachmentType.STAMPED_REPORT,
  })
  type!: LaborAccidentReportAttachmentType;

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

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'uploaded_by_user_id',
  })
  uploadedByUser!: User | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;
}
