import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 25 })
  totalItems!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;
}

export class ApiSuccessResponseDto<TData = unknown> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Thanh cong' })
  message!: string;

  @ApiProperty()
  data!: TData;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/users?page=1&limit=10' })
  path!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Du lieu khong hop le',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/businesses' })
  path!: string;
}

export class RoleResponseDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'USER' })
  code!: string;

  @ApiProperty({ example: 'Nguoi dung' })
  name!: string;
}

export class UserListItemResponseDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ example: 'user01' })
  username!: string;

  @ApiProperty({ example: 'user01@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../avatar.jpg', nullable: true })
  avatar!: string | null;

  @ApiProperty({ example: 'Chuyen vien', nullable: true })
  position!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'Dang hoat dong' })
  statusLabel!: string;

  @ApiProperty({ type: [RoleResponseDto] })
  roles!: RoleResponseDto[];

  @ApiProperty({ example: ['USER'] })
  roleCodes!: string[];

  @ApiProperty({ example: ['Nguoi dung'] })
  roleNames!: string[];

  @ApiProperty({ example: 'Nguoi dung' })
  roleDisplay!: string;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  updatedAt!: string;
}

export class UserDetailResponseDto extends UserListItemResponseDto {
  @ApiProperty({ example: 'Nam', nullable: true })
  gender!: string | null;

  @ApiProperty({ example: '1995-06-01', nullable: true })
  dateOfBirth!: string | null;

  @ApiProperty({ example: 'Thanh pho Ho Chi Minh', nullable: true })
  provinceCity!: string | null;

  @ApiProperty({ example: 'Phuong Go Vap', nullable: true })
  wardCommune!: string | null;

  @ApiProperty({ example: '123 Le Loi', nullable: true })
  address!: string | null;

  @ApiProperty({ example: true })
  hasPassword!: boolean;

  @ApiProperty({ example: 2, nullable: true })
  roleId!: number | null;

  @ApiProperty({ example: 'USER', nullable: true })
  roleCode!: string | null;

  @ApiProperty({ example: 'Nguoi dung', nullable: true })
  roleName!: string | null;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserListItemResponseDto] })
  items!: UserListItemResponseDto[];

  @ApiProperty({ type: ApiResponseMetaDto })
  meta!: ApiResponseMetaDto;
}

export class BusinessAttachmentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Giay phep kinh doanh' })
  displayName!: string;

  @ApiProperty({ example: 'GPKD.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../GPKD.pdf' })
  fileUrl!: string;

  @ApiProperty({ example: 'application/pdf', nullable: true })
  mimetype!: string | null;

  @ApiProperty({ example: 245760, nullable: true })
  size!: number | null;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  createdAt!: string;
}

export class BusinessResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Cong ty co phan cong nghe quoc te VNA' })
  businessName!: string;

  @ApiProperty({ example: 'VNA International Technology Joint Stock Company', nullable: true })
  foreignName!: string | null;

  @ApiProperty({ example: '0312345678' })
  taxCode!: string;

  @ApiProperty({ example: 'Cong ty TNHH 1 thanh vien' })
  businessType!: string;

  @ApiProperty({ example: '4669' })
  industryCode!: string;

  @ApiProperty({ example: 'Ban buon chuyen doanh khac chua duoc phan vao dau' })
  industryName!: string;

  @ApiProperty({ example: '4669 - Ban buon chuyen doanh khac chua duoc phan vao dau' })
  industryDisplay!: string;

  @ApiProperty({ example: '2020-01-01', nullable: true })
  licenseIssueDate!: string | null;

  @ApiProperty({ example: 'Thanh pho Ho Chi Minh' })
  provinceCity!: string;

  @ApiProperty({ example: 'Phuong Hiep Binh Phuoc' })
  wardCommune!: string;

  @ApiProperty({ example: '162 duong so 2, khu do thi Van Phuc', nullable: true })
  address!: string | null;

  @ApiProperty({ example: 'vna@gmail.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '02812345678', nullable: true })
  agencyPhone!: string | null;

  @ApiProperty({ example: 'Thanh pho Ho Chi Minh', nullable: true })
  operatingProvinceCity!: string | null;

  @ApiProperty({ example: 'Phuong Hiep Binh Phuoc', nullable: true })
  operatingWardCommune!: string | null;

  @ApiProperty({ example: '162 duong so 2, khu do thi Van Phuc', nullable: true })
  businessLocation!: string | null;

  @ApiProperty({ example: 'Nguyen Van A', nullable: true })
  representativeName!: string | null;

  @ApiProperty({ example: '0909123456', nullable: true })
  representativePhone!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'Dang hoat dong' })
  statusLabel!: string;

  @ApiProperty({ type: [BusinessAttachmentResponseDto] })
  attachments!: BusinessAttachmentResponseDto[];

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  updatedAt!: string;
}

export class BusinessListResponseDto {
  @ApiProperty({ type: [BusinessResponseDto] })
  items!: BusinessResponseDto[];

  @ApiProperty({ type: ApiResponseMetaDto })
  meta!: ApiResponseMetaDto;
}

export class LoginUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: 'Quan tri vien' })
  fullName!: string;

  @ApiProperty({ example: 'admin@gmail.com' })
  email!: string;

  @ApiProperty({ example: null, nullable: true })
  avatar!: string | null;

  @ApiProperty({ example: ['ADMIN'] })
  roles!: string[];
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: LoginUserResponseDto })
  user!: LoginUserResponseDto;
}
