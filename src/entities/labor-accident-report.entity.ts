import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Business } from './business.entity';
import { LaborAccidentReportAttachment } from './labor-accident-report-attachment.entity';
import { LaborAccidentReportDetail } from './labor-accident-report-detail.entity';
import { LaborAccidentReportPeriod } from './labor-accident-report-period.entity';
import { User } from './user.entity';

export enum LaborAccidentReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  RECEIVED = 'RECEIVED',
}

@Entity('labor_accident_reports')
@Index('IDX_labor_accident_report_business_period_unique', ['business', 'reportPeriod'], {
  unique: true,
})
export class LaborAccidentReport {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Business, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'business_id',
  })
  business!: Business;

  @ManyToOne(() => LaborAccidentReportPeriod, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'report_period_id',
  })
  reportPeriod!: LaborAccidentReportPeriod;

  @Column({
    name: 'business_name',
    length: 255,
  })
  businessName!: string;

  @Column({
    name: 'tax_code',
    length: 50,
  })
  taxCode!: string;

  @Column({
    name: 'business_type',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  businessType!: string | null;

  @Column({
    name: 'industry_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  industryCode!: string | null;

  @Column({
    name: 'industry_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  industryName!: string | null;

  @Column({
    name: 'total_employees',
    type: 'integer',
    default: 0,
  })
  totalEmployees!: number;

  @Column({
    name: 'female_employees',
    type: 'integer',
    default: 0,
  })
  femaleEmployees!: number;

  @Column({
    name: 'total_payroll',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalPayroll!: number;

  @Column({
    name: 'total_accidents',
    type: 'integer',
    default: 0,
  })
  totalAccidents!: number;

  @Column({
    name: 'fatal_accidents',
    type: 'integer',
    default: 0,
  })
  fatalAccidents!: number;

  @Column({
    name: 'accidents_with_two_or_more_victims',
    type: 'integer',
    default: 0,
  })
  accidentsWithTwoOrMoreVictims!: number;

  @Column({
    name: 'total_victims',
    type: 'integer',
    default: 0,
  })
  totalVictims!: number;

  @Column({
    name: 'female_victims',
    type: 'integer',
    default: 0,
  })
  femaleVictims!: number;

  @Column({
    name: 'death_victims',
    type: 'integer',
    default: 0,
  })
  deathVictims!: number;

  @Column({
    name: 'severe_injury_victims',
    type: 'integer',
    default: 0,
  })
  severeInjuryVictims!: number;

  @Column({
    name: 'victims_not_under_management',
    type: 'integer',
    default: 0,
  })
  victimsNotUnderManagement!: number;

  @Column({
    name: 'female_victims_not_under_management',
    type: 'integer',
    default: 0,
  })
  femaleVictimsNotUnderManagement!: number;

  @Column({
    name: 'death_victims_not_under_management',
    type: 'integer',
    default: 0,
  })
  deathVictimsNotUnderManagement!: number;

  @Column({
    name: 'severe_injury_victims_not_under_management',
    type: 'integer',
    default: 0,
  })
  severeInjuryVictimsNotUnderManagement!: number;

  @Column({
    name: 'medical_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  medicalCost!: number;

  @Column({
    name: 'salary_payment_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  salaryPaymentCost!: number;

  @Column({
    name: 'allowance_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  allowanceCost!: number;

  @Column({
    name: 'total_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalCost!: number;

  @Column({
    name: 'total_days_off',
    type: 'integer',
    default: 0,
  })
  totalDaysOff!: number;

  @Column({
    name: 'property_damage',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  propertyDamage!: number;

  @Column({
    type: 'enum',
    enum: LaborAccidentReportStatus,
    enumName: 'labor_accident_report_status',
    default: LaborAccidentReportStatus.DRAFT,
  })
  status!: LaborAccidentReportStatus;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'created_by_user_id',
  })
  createdByUser!: User | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'submitted_by_user_id',
  })
  submittedByUser!: User | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'received_by_user_id',
  })
  receivedByUser!: User | null;

  @Column({
    name: 'submitted_at',
    type: 'timestamp',
    nullable: true,
  })
  submittedAt!: Date | null;

  @Column({
    name: 'received_at',
    type: 'timestamp',
    nullable: true,
  })
  receivedAt!: Date | null;

  @OneToMany(() => LaborAccidentReportDetail, (detail) => detail.report)
  details!: LaborAccidentReportDetail[];

  @OneToMany(() => LaborAccidentReportAttachment, (attachment) => attachment.report)
  attachments!: LaborAccidentReportAttachment[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
