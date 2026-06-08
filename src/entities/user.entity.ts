import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    length: 100,
    unique: true,
  })
  username: string;

  @Column({
    length: 255,
  })
  password: string;

  @Column({
    name: 'full_name',
    length: 150,
  })
  fullName: string;

  @Column({
    length: 150,
    unique: true,
  })
  email: string;

  @Column({
    length: 20,
    nullable: true,
  })
  gender: string;

  @Column({
    name: 'date_of_birth',
    type: 'date',
    nullable: true,
  })
  dateOfBirth: Date;

  @Column({
    length: 255,
    nullable: true,
  })
  avatar: string;

  @Column({
    length: 100,
    nullable: true,
  })
  position: string;

  @Column({
    name: 'province_city',
    length: 150,
    nullable: true,
  })
  provinceCity: string;

  @Column({
    name: 'ward_commune',
    length: 150,
    nullable: true,
  })
  wardCommune: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  address: string;

  @Column({
    default: true,
  })
  isActive: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
