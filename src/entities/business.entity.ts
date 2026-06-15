import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BusinessAttachment } from './business-attachment.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    name: 'business_name',
    length: 255,
  })
  businessName!: string;

  @Column({
    name: 'foreign_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  foreignName!: string | null;

  @Column({
    name: 'tax_code',
    length: 50,
    unique: true,
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
    length: 4,
  })
  industryCode!: string;

  @Column({
    name: 'industry_name',
    length: 255,
  })
  industryName!: string;

  @Column({
    name: 'license_issue_date',
    type: 'date',
    nullable: true,
  })
  licenseIssueDate!: Date | null;

  @Column({
    name: 'province_city',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  provinceCity!: string | null;

  @Column({
    name: 'ward_commune',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  wardCommune!: string | null;

  @Column({
    name: 'operating_province_city',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  operatingProvinceCity!: string | null;

  @Column({
    name: 'operating_ward_commune',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  operatingWardCommune!: string | null;

  @Column({
    name: 'business_location',
    type: 'text',
    nullable: true,
  })
  businessLocation!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  address!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phone!: string | null;

  @Column({
    name: 'agency_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  agencyPhone!: string | null;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  email!: string | null;

  @Column({
    name: 'representative_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  representativeName!: string | null;

  @Column({
    name: 'representative_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  representativePhone!: string | null;

  @OneToMany(() => BusinessAttachment, (attachment) => attachment.business)
  attachments!: BusinessAttachment[];

  @Column({
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
