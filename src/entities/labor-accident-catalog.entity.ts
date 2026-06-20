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

export enum LaborAccidentCatalogType {
  ACCIDENT_CAUSE = 'ACCIDENT_CAUSE',
  INJURY_FACTOR = 'INJURY_FACTOR',
  INJURY_TYPE = 'INJURY_TYPE',
  OCCUPATION = 'OCCUPATION',
}

@Entity('labor_accident_catalogs')
@Index('IDX_labor_accident_catalog_unique_code', ['type', 'code'], {
  unique: true,
})
export class LaborAccidentCatalog {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({
    type: 'enum',
    enum: LaborAccidentCatalogType,
    enumName: 'labor_accident_catalog_type',
  })
  type!: LaborAccidentCatalogType;

  @Column({
    length: 50,
  })
  code!: string;

  @Column({
    length: 500,
  })
  name!: string;

  @Column({
    type: 'integer',
    default: 1,
  })
  level!: number;

  @ManyToOne(() => LaborAccidentCatalog, (catalog) => catalog.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'parent_id',
  })
  parent!: LaborAccidentCatalog | null;

  @OneToMany(() => LaborAccidentCatalog, (catalog) => catalog.parent)
  children!: LaborAccidentCatalog[];

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
