import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LaborAccidentReportPeriodType {
  FULL_YEAR = 'FULL_YEAR',
  SIX_MONTHS = 'SIX_MONTHS',
}

@Entity('labor_accident_report_periods')
@Index(
  'IDX_labor_accident_report_period_unique',
  ['reportName', 'year', 'periodType'],
  { unique: true },
)
export class LaborAccidentReportPeriod {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    name: 'report_name',
    length: 150,
  })
  reportName!: string;

  @Column({
    type: 'integer',
  })
  year!: number;

  @Column({
    name: 'period_type',
    type: 'enum',
    enum: LaborAccidentReportPeriodType,
    enumName: 'labor_accident_report_period_type',
  })
  periodType!: LaborAccidentReportPeriodType;

  @Column({
    name: 'start_date',
    type: 'date',
  })
  startDate!: Date;

  @Column({
    name: 'end_date',
    type: 'date',
  })
  endDate!: Date;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
