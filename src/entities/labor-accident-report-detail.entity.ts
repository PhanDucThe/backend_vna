import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LaborAccidentCatalog } from './labor-accident-catalog.entity';
import { LaborAccidentReport } from './labor-accident-report.entity';

export enum LaborAccidentReportDetailSection {
  ACCIDENT = 'ACCIDENT',
  ARTICLE_39_ALLOWANCE = 'ARTICLE_39_ALLOWANCE',
}

@Entity('labor_accident_report_details')
@Index(
  'IDX_labor_accident_report_detail_unique',
  ['report', 'section', 'orderNo'],
  { unique: true },
)
export class LaborAccidentReportDetail {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => LaborAccidentReport, (report) => report.details, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'report_id',
  })
  report!: LaborAccidentReport;

  @Column({
    type: 'enum',
    enum: LaborAccidentReportDetailSection,
    enumName: 'labor_accident_report_detail_section',
  })
  section!: LaborAccidentReportDetailSection;

  @Column({
    name: 'order_no',
    type: 'integer',
    default: 1,
  })
  orderNo!: number;

  @ManyToOne(() => LaborAccidentCatalog, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'accident_cause_catalog_id',
  })
  accidentCauseCatalog!: LaborAccidentCatalog | null;

  @ManyToOne(() => LaborAccidentCatalog, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'injury_factor_catalog_id',
  })
  injuryFactorCatalog!: LaborAccidentCatalog | null;

  @ManyToOne(() => LaborAccidentCatalog, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'occupation_catalog_id',
  })
  occupationCatalog!: LaborAccidentCatalog | null;

  @Column({
    name: 'note',
    type: 'text',
    nullable: true,
  })
  note!: string | null;

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
    name: 'days_off',
    type: 'integer',
    default: 0,
  })
  daysOff!: number;

  @Column({
    name: 'property_damage',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  propertyDamage!: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
