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

  @ApiProperty({ example: 12, nullable: true })
  accountUserId!: number | null;

  @ApiProperty({ example: '0312345678' })
  accountUsername!: string;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-15T04:00:00.000Z' })
  updatedAt!: string;
}

export class BusinessAccountInfoResponseDto {
  @ApiProperty({
    example: '0312345678',
    description: 'Tai khoan dang nhap mac dinh cua doanh nghiep, bang ma so thue',
  })
  username!: string;

  @ApiProperty({
    example: '12345678',
    description: 'Mat khau mac dinh chi tra ve khi tao moi doanh nghiep',
  })
  password!: string;
}

export class CreatedBusinessResponseDto extends BusinessResponseDto {
  @ApiProperty({ type: BusinessAccountInfoResponseDto })
  accountInfo!: BusinessAccountInfoResponseDto;
}

export class BusinessListResponseDto {
  @ApiProperty({ type: [BusinessResponseDto] })
  items!: BusinessResponseDto[];

  @ApiProperty({ type: ApiResponseMetaDto })
  meta!: ApiResponseMetaDto;
}

export class LaborAccidentReportPeriodResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Báo cáo TNLĐ' })
  reportName!: string;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 'FULL_YEAR' })
  periodType!: string;

  @ApiProperty({ example: 'Cả năm' })
  periodTypeLabel!: string;

  @ApiProperty({ example: '2026-01-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  endDate!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'Hoạt động' })
  statusLabel!: string;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  updatedAt!: string;
}

export class LaborAccidentReportPeriodListResponseDto {
  @ApiProperty({ type: [LaborAccidentReportPeriodResponseDto] })
  items!: LaborAccidentReportPeriodResponseDto[];

  @ApiProperty({ type: ApiResponseMetaDto })
  meta!: ApiResponseMetaDto;
}

export class LaborAccidentCatalogResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'INJURY_FACTOR' })
  type!: string;

  @ApiProperty({ example: 'Yếu tố gây chấn thương' })
  typeLabel!: string;

  @ApiProperty({ example: '4' })
  code!: string;

  @ApiProperty({ example: 'Thiết bị nâng' })
  name!: string;

  @ApiProperty({ example: 1 })
  level!: number;

  @ApiProperty({ example: null, nullable: true })
  parentId!: number | null;

  @ApiProperty({ example: null, nullable: true })
  parentCode!: string | null;

  @ApiProperty({ example: null, nullable: true })
  parentName!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'Sử dụng' })
  statusLabel!: string;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  updatedAt!: string;
}

export class LaborAccidentCatalogListResponseDto {
  @ApiProperty({ type: [LaborAccidentCatalogResponseDto] })
  items!: LaborAccidentCatalogResponseDto[];

  @ApiProperty({ type: ApiResponseMetaDto })
  meta!: ApiResponseMetaDto;
}

export class LaborAccidentReportPeriodSummaryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Báo cáo TNLĐ' })
  reportName!: string;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 'SIX_MONTHS' })
  periodType!: string;

  @ApiProperty({ example: '6 tháng' })
  periodTypeLabel!: string;

  @ApiProperty({ example: '2026-07-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-07-15' })
  endDate!: string;
}

export class LaborAccidentReportBusinessSummaryResponseDto {
  @ApiProperty({ example: 1, nullable: true })
  id!: number | null;

  @ApiProperty({ example: 'Công ty TNHH Kiểm Thử Frontend 2601' })
  businessName!: string;

  @ApiProperty({ example: '0866192601' })
  taxCode!: string;

  @ApiProperty({ example: 'Công ty TNHH 1 thành viên', nullable: true })
  businessType!: string | null;

  @ApiProperty({ example: '4669', nullable: true })
  industryCode!: string | null;

  @ApiProperty({
    example: 'Bán buôn chuyên doanh khác chưa được phân vào đâu',
    nullable: true,
  })
  industryName!: string | null;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh', nullable: true })
  provinceCity!: string | null;

  @ApiProperty({ example: 'Phường Bến Nghé', nullable: true })
  wardCommune!: string | null;

  @ApiProperty({ example: '123 Lê Lợi', nullable: true })
  address!: string | null;

  @ApiProperty({ example: '02812345678', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: '02887654321', nullable: true })
  agencyPhone!: string | null;

  @ApiProperty({ example: 'contact@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'Nguyễn Văn A', nullable: true })
  representativeName!: string | null;

  @ApiProperty({ example: '0901234567', nullable: true })
  representativePhone!: string | null;
}

export class LaborAccidentReportCatalogSummaryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ACCIDENT_CAUSE' })
  type!: string;

  @ApiProperty({ example: '1' })
  code!: string;

  @ApiProperty({
    example: 'Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn',
  })
  name!: string;

  @ApiProperty({ example: 2 })
  level!: number;
}

export class LaborAccidentReportDetailResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ACCIDENT' })
  section!: string;

  @ApiProperty({ example: 1 })
  orderNo!: number;

  @ApiProperty({
    type: LaborAccidentReportCatalogSummaryResponseDto,
    nullable: true,
  })
  accidentCauseCatalog!: LaborAccidentReportCatalogSummaryResponseDto | null;

  @ApiProperty({
    type: LaborAccidentReportCatalogSummaryResponseDto,
    nullable: true,
  })
  injuryFactorCatalog!: LaborAccidentReportCatalogSummaryResponseDto | null;

  @ApiProperty({
    type: LaborAccidentReportCatalogSummaryResponseDto,
    nullable: true,
  })
  occupationCatalog!: LaborAccidentReportCatalogSummaryResponseDto | null;

  @ApiProperty({ example: null, nullable: true })
  note!: string | null;

  @ApiProperty({ example: 1 })
  totalAccidents!: number;

  @ApiProperty({ example: 1 })
  fatalAccidents!: number;

  @ApiProperty({ example: 1 })
  accidentsWithTwoOrMoreVictims!: number;

  @ApiProperty({ example: 10 })
  totalVictims!: number;

  @ApiProperty({ example: 5 })
  femaleVictims!: number;

  @ApiProperty({ example: 5 })
  deathVictims!: number;

  @ApiProperty({ example: 10 })
  severeInjuryVictims!: number;

  @ApiProperty({ example: 0 })
  victimsNotUnderManagement!: number;

  @ApiProperty({ example: 0 })
  femaleVictimsNotUnderManagement!: number;

  @ApiProperty({ example: 0 })
  deathVictimsNotUnderManagement!: number;

  @ApiProperty({ example: 0 })
  severeInjuryVictimsNotUnderManagement!: number;

  @ApiProperty({ example: 2000000 })
  medicalCost!: number;

  @ApiProperty({ example: 2000000 })
  salaryPaymentCost!: number;

  @ApiProperty({ example: 2000000 })
  allowanceCost!: number;

  @ApiProperty({ example: 6000000 })
  totalCost!: number;

  @ApiProperty({ example: 20 })
  daysOff!: number;

  @ApiProperty({ example: 20000000 })
  propertyDamage!: number;
}

export class LaborAccidentReportAttachmentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'STAMPED_REPORT' })
  type!: string;

  @ApiProperty({ example: 'Báo cáo TNLĐ có dấu mộc' })
  displayName!: string;

  @ApiProperty({ example: 'baocaoTNLD.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../baocaoTNLD.pdf' })
  fileUrl!: string;

  @ApiProperty({ example: 'application/pdf', nullable: true })
  mimetype!: string | null;

  @ApiProperty({ example: 245760, nullable: true })
  size!: number | null;

  @ApiProperty({ example: 12, nullable: true })
  uploadedByUserId!: number | null;

  @ApiProperty({ example: '0866192601', nullable: true })
  uploadedByUsername!: string | null;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  createdAt!: string;
}

export class LaborAccidentReportResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: LaborAccidentReportPeriodSummaryResponseDto })
  reportPeriod!: LaborAccidentReportPeriodSummaryResponseDto;

  @ApiProperty({ type: LaborAccidentReportBusinessSummaryResponseDto })
  business!: LaborAccidentReportBusinessSummaryResponseDto;

  @ApiProperty({ example: 10 })
  totalEmployees!: number;

  @ApiProperty({ example: 5 })
  femaleEmployees!: number;

  @ApiProperty({ example: 10000000 })
  totalPayroll!: number;

  @ApiProperty({ example: 2 })
  totalAccidents!: number;

  @ApiProperty({ example: 1 })
  fatalAccidents!: number;

  @ApiProperty({ example: 1 })
  accidentsWithTwoOrMoreVictims!: number;

  @ApiProperty({ example: 10 })
  totalVictims!: number;

  @ApiProperty({ example: 5 })
  femaleVictims!: number;

  @ApiProperty({ example: 5 })
  deathVictims!: number;

  @ApiProperty({ example: 10 })
  severeInjuryVictims!: number;

  @ApiProperty({ example: 0 })
  victimsNotUnderManagement!: number;

  @ApiProperty({ example: 0 })
  femaleVictimsNotUnderManagement!: number;

  @ApiProperty({ example: 0 })
  deathVictimsNotUnderManagement!: number;

  @ApiProperty({ example: 0 })
  severeInjuryVictimsNotUnderManagement!: number;

  @ApiProperty({ example: 2000000 })
  medicalCost!: number;

  @ApiProperty({ example: 2000000 })
  salaryPaymentCost!: number;

  @ApiProperty({ example: 2000000 })
  allowanceCost!: number;

  @ApiProperty({ example: 6000000 })
  totalCost!: number;

  @ApiProperty({ example: 20 })
  totalDaysOff!: number;

  @ApiProperty({ example: 20000000 })
  propertyDamage!: number;

  @ApiProperty({ example: 'DRAFT' })
  status!: string;

  @ApiProperty({ example: 'Đang báo cáo' })
  statusLabel!: string;

  @ApiProperty({ example: null, nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  receivedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  rejectReason!: string | null;

  @ApiProperty({ type: [LaborAccidentReportDetailResponseDto] })
  details!: LaborAccidentReportDetailResponseDto[] | undefined;

  @ApiProperty({ type: [LaborAccidentReportAttachmentResponseDto] })
  attachments!: LaborAccidentReportAttachmentResponseDto[];

  @ApiProperty({ example: 1 })
  attachmentCount!: number;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-19T04:00:00.000Z' })
  updatedAt!: string;
}

export class LaborAccidentReportListResponseDto {
  @ApiProperty({ type: [LaborAccidentReportResponseDto] })
  items!: LaborAccidentReportResponseDto[];

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

export class RefreshAccessTokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({
    example: 900,
    description: 'Thời gian sống của access token tính bằng giây',
  })
  expiresIn!: number;
}
