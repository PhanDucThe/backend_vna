import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateLaborAccidentReportPeriodDto,
  LABOR_ACCIDENT_REPORT_NAMES,
  ListLaborAccidentReportPeriodsQueryDto,
  UpdateLaborAccidentReportPeriodDto,
  UpdateLaborAccidentReportPeriodStatusDto,
} from '../dtos/labor-accident-report-period.dto';
import {
  LaborAccidentReportPeriod,
  LaborAccidentReportPeriodType,
} from '../entities/labor-accident-report-period.entity';

const PERIOD_TYPE_LABELS: Record<LaborAccidentReportPeriodType, string> = {
  [LaborAccidentReportPeriodType.FULL_YEAR]: 'Cả năm',
  [LaborAccidentReportPeriodType.SIX_MONTHS]: '6 tháng',
};

@Injectable()
export class LaborAccidentReportPeriodService {
  constructor(
    @InjectRepository(LaborAccidentReportPeriod)
    private readonly reportPeriodRepository: Repository<LaborAccidentReportPeriod>,
  ) {}

  getOptions() {
    return {
      message: 'Lấy tùy chọn cấu hình kỳ báo cáo thành công',
      data: {
        reportNames: LABOR_ACCIDENT_REPORT_NAMES,
        periodTypes: Object.values(LaborAccidentReportPeriodType).map(
          (value) => ({
            value,
            label: PERIOD_TYPE_LABELS[value],
          }),
        ),
        statuses: [
          { value: true, label: 'Hoạt động' },
          { value: false, label: 'Không hoạt động' },
        ],
        dateFormat: 'YYYY-MM-DD',
      },
    };
  }

  async getReportPeriods(query: ListLaborAccidentReportPeriodsQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportPeriodRepository.createQueryBuilder(
      'reportPeriod',
    );

    if (query.reportName?.trim()) {
      queryBuilder.andWhere('LOWER(reportPeriod.reportName) LIKE :reportName', {
        reportName: this.toLikeValue(query.reportName),
      });
    }

    if (query.year?.trim()) {
      queryBuilder.andWhere('reportPeriod.year = :year', {
        year: this.normalizeYear(query.year),
      });
    }

    if (query.periodType) {
      queryBuilder.andWhere('reportPeriod.periodType = :periodType', {
        periodType: query.periodType,
      });
    }

    if (query.startDate?.trim()) {
      queryBuilder.andWhere('reportPeriod.startDate = :startDate', {
        startDate: this.formatDateInput(this.parseDate(query.startDate)),
      });
    }

    if (query.endDate?.trim()) {
      queryBuilder.andWhere('reportPeriod.endDate = :endDate', {
        endDate: this.formatDateInput(this.parseDate(query.endDate)),
      });
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      queryBuilder.andWhere('reportPeriod.isActive = :isActive', {
        isActive: this.toBoolean(query.isActive),
      });
    }

    const [reportPeriods, totalItems] = await queryBuilder
      .orderBy('reportPeriod.year', 'DESC')
      .addOrderBy('reportPeriod.startDate', 'DESC')
      .addOrderBy('reportPeriod.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      message: 'Lấy danh sách cấu hình kỳ báo cáo thành công',
      data: {
        items: reportPeriods.map((reportPeriod) =>
          this.mapReportPeriod(reportPeriod),
        ),
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    };
  }

  async getReportPeriodDetail(id: number) {
    const reportPeriod = await this.findReportPeriod(id);

    return {
      message: 'Lấy chi tiết cấu hình kỳ báo cáo thành công',
      data: this.mapReportPeriod(reportPeriod),
    };
  }

  async createReportPeriod(
    createReportPeriodDto: CreateLaborAccidentReportPeriodDto,
  ) {
    const normalizedPayload = this.normalizePayload(createReportPeriodDto);
    await this.validateUniqueReportPeriod(normalizedPayload);

    const reportPeriod = await this.reportPeriodRepository.save(
      this.reportPeriodRepository.create(normalizedPayload),
    );

    return {
      message: 'Thêm cấu hình kỳ báo cáo thành công',
      data: this.mapReportPeriod(reportPeriod),
    };
  }

  async updateReportPeriod(
    id: number,
    updateReportPeriodDto: UpdateLaborAccidentReportPeriodDto,
  ) {
    const reportPeriod = await this.findReportPeriod(id);
    const normalizedPayload = this.normalizePayload(
      updateReportPeriodDto,
      reportPeriod,
    );

    await this.validateUniqueReportPeriod(normalizedPayload, id);

    Object.assign(reportPeriod, normalizedPayload);
    const savedReportPeriod =
      await this.reportPeriodRepository.save(reportPeriod);

    return {
      message: 'Cập nhật cấu hình kỳ báo cáo thành công',
      data: this.mapReportPeriod(savedReportPeriod),
    };
  }

  async updateReportPeriodStatus(
    id: number,
    body: UpdateLaborAccidentReportPeriodStatusDto,
  ) {
    const reportPeriod = await this.findReportPeriod(id);
    reportPeriod.isActive = this.toBoolean(body.isActive);

    const savedReportPeriod =
      await this.reportPeriodRepository.save(reportPeriod);

    return {
      message: 'Cập nhật trạng thái cấu hình kỳ báo cáo thành công',
      data: this.mapReportPeriod(savedReportPeriod),
    };
  }

  private async findReportPeriod(id: number) {
    const reportPeriod = await this.reportPeriodRepository.findOne({
      where: { id },
    });

    if (!reportPeriod) {
      throw new NotFoundException('Không tìm thấy cấu hình kỳ báo cáo');
    }

    return reportPeriod;
  }

  private normalizePayload(
    payload:
      | CreateLaborAccidentReportPeriodDto
      | UpdateLaborAccidentReportPeriodDto,
    currentValue?: LaborAccidentReportPeriod,
  ) {
    const reportName =
      this.toTrimmedValue(payload.reportName) ?? currentValue?.reportName;
    const year =
      payload.year === undefined
        ? currentValue?.year
        : this.normalizeYear(payload.year);
    const periodType = payload.periodType ?? currentValue?.periodType;
    const currentStartDate = currentValue?.startDate
      ? this.parseDate(currentValue.startDate)
      : undefined;
    const currentEndDate = currentValue?.endDate
      ? this.parseDate(currentValue.endDate)
      : undefined;
    const startDate =
      payload.startDate === undefined
        ? currentStartDate
        : this.parseDate(payload.startDate);
    const endDate =
      payload.endDate === undefined
        ? currentEndDate
        : this.parseDate(payload.endDate);
    const isActive =
      payload.isActive === undefined
        ? (currentValue?.isActive ?? true)
        : this.toBoolean(payload.isActive);

    if (!reportName) {
      throw new BadRequestException('Tên báo cáo không được để trống');
    }

    if (!LABOR_ACCIDENT_REPORT_NAMES.includes(reportName as any)) {
      throw new BadRequestException('Tên báo cáo không hợp lệ');
    }

    if (!year) {
      throw new BadRequestException('Năm báo cáo không được để trống');
    }

    if (
      !periodType ||
      !Object.values(LaborAccidentReportPeriodType).includes(periodType)
    ) {
      throw new BadRequestException('Kỳ báo cáo không hợp lệ');
    }

    if (!startDate) {
      throw new BadRequestException('Ngày bắt đầu không được để trống');
    }

    if (!endDate) {
      throw new BadRequestException('Ngày kết thúc không được để trống');
    }

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc',
      );
    }

    return {
      reportName,
      year,
      periodType,
      startDate,
      endDate,
      isActive,
    };
  }

  private async validateUniqueReportPeriod(
    payload: {
      reportName: string;
      year: number;
      periodType: LaborAccidentReportPeriodType;
    },
    ignoredId?: number,
  ) {
    const queryBuilder = this.reportPeriodRepository
      .createQueryBuilder('reportPeriod')
      .where('reportPeriod.reportName = :reportName', {
        reportName: payload.reportName,
      })
      .andWhere('reportPeriod.year = :year', { year: payload.year })
      .andWhere('reportPeriod.periodType = :periodType', {
        periodType: payload.periodType,
      });

    if (ignoredId) {
      queryBuilder.andWhere('reportPeriod.id != :ignoredId', { ignoredId });
    }

    const existedReportPeriod = await queryBuilder.getOne();

    if (existedReportPeriod) {
      throw new BadRequestException(
        'Cấu hình kỳ báo cáo đã tồn tại trong năm này',
      );
    }
  }

  private normalizeYear(value: string | number) {
    const year = Number(value);

    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new BadRequestException('Năm báo cáo không hợp lệ');
    }

    return year;
  }

  private parseDate(value: string | Date) {
    if (value instanceof Date) {
      return value;
    }

    const dateValue = this.toTrimmedValue(value);

    if (!dateValue) {
      throw new BadRequestException('Ngày không được để trống');
    }

    const ddMmYyyyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue);

    if (ddMmYyyyMatch) {
      const [, day, month, year] = ddMmYyyyMatch;
      return this.createDate(Number(year), Number(month), Number(day));
    }

    const yyyyMmDdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

    if (yyyyMmDdMatch) {
      const [, year, month, day] = yyyyMmDdMatch;
      return this.createDate(Number(year), Number(month), Number(day));
    }

    throw new BadRequestException(
      'Ngày không hợp lệ, vui lòng dùng định dạng YYYY-MM-DD hoặc DD/MM/YYYY',
    );
  }

  private createDate(year: number, month: number, day: number) {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('Ngày không hợp lệ');
    }

    return date;
  }

  private toBoolean(value: string | boolean) {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }

    throw new BadRequestException('Trạng thái không hợp lệ');
  }

  private toPositiveNumber(value: string | undefined, defaultValue: number) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      return defaultValue;
    }

    return numberValue;
  }

  private toLikeValue(value: string) {
    return `%${value.trim().toLowerCase()}%`;
  }

  private toTrimmedValue(value: string | undefined) {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  private formatDateInput(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.toISOString().slice(0, 10);
  }

  private mapReportPeriod(reportPeriod: LaborAccidentReportPeriod) {
    return {
      id: reportPeriod.id,
      reportName: reportPeriod.reportName,
      year: reportPeriod.year,
      periodType: reportPeriod.periodType,
      periodTypeLabel: PERIOD_TYPE_LABELS[reportPeriod.periodType],
      startDate: this.formatDateInput(reportPeriod.startDate),
      endDate: this.formatDateInput(reportPeriod.endDate),
      isActive: reportPeriod.isActive,
      statusLabel: reportPeriod.isActive ? 'Hoạt động' : 'Không hoạt động',
      createdAt: reportPeriod.createdAt,
      updatedAt: reportPeriod.updatedAt,
    };
  }
}
