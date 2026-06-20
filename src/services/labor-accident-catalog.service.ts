import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateLaborAccidentCatalogDto,
  ListLaborAccidentCatalogsQueryDto,
  UpdateLaborAccidentCatalogDto,
  UpdateLaborAccidentCatalogStatusDto,
} from '../dtos/labor-accident-catalog.dto';
import {
  LaborAccidentCatalog,
  LaborAccidentCatalogType,
} from '../entities/labor-accident-catalog.entity';

export const LABOR_ACCIDENT_CATALOG_TYPE_LABELS: Record<
  LaborAccidentCatalogType,
  string
> = {
  [LaborAccidentCatalogType.ACCIDENT_CAUSE]: 'Nguyên nhân xảy ra TNLĐ',
  [LaborAccidentCatalogType.INJURY_FACTOR]: 'Yếu tố gây chấn thương',
  [LaborAccidentCatalogType.INJURY_TYPE]: 'Loại chấn thương',
  [LaborAccidentCatalogType.OCCUPATION]: 'Danh mục nghề nghiệp',
};

const MAX_LEVEL_BY_TYPE: Record<LaborAccidentCatalogType, number> = {
  [LaborAccidentCatalogType.ACCIDENT_CAUSE]: 2,
  [LaborAccidentCatalogType.INJURY_FACTOR]: 1,
  [LaborAccidentCatalogType.INJURY_TYPE]: 3,
  [LaborAccidentCatalogType.OCCUPATION]: 4,
};

@Injectable()
export class LaborAccidentCatalogService {
  constructor(
    @InjectRepository(LaborAccidentCatalog)
    private readonly catalogRepository: Repository<LaborAccidentCatalog>,
  ) {}

  getCatalogTypes() {
    return {
      message: 'Lấy loại danh mục tai nạn lao động thành công',
      data: Object.values(LaborAccidentCatalogType).map((value) => ({
        value,
        label: LABOR_ACCIDENT_CATALOG_TYPE_LABELS[value],
      })),
    };
  }

  async getCatalogOptions(type?: LaborAccidentCatalogType) {
    if (type && !Object.values(LaborAccidentCatalogType).includes(type)) {
      throw new BadRequestException('Loại danh mục không hợp lệ');
    }

    const queryBuilder = this.catalogRepository
      .createQueryBuilder('catalog')
      .leftJoinAndSelect('catalog.parent', 'parent')
      .where('catalog.isActive = :isActive', { isActive: true });

    if (type) {
      queryBuilder.andWhere('catalog.type = :type', { type });
    }

    const catalogs = await queryBuilder
      .orderBy('catalog.type', 'ASC')
      .addOrderBy('catalog.level', 'ASC')
      .addOrderBy('catalog.code', 'ASC')
      .getMany();

    return {
      message: 'Lấy tùy chọn danh mục tai nạn lao động thành công',
      data: catalogs.map((catalog) => this.mapCatalog(catalog)),
    };
  }

  async getCatalogs(query: ListLaborAccidentCatalogsQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.catalogRepository
      .createQueryBuilder('catalog')
      .leftJoinAndSelect('catalog.parent', 'parent');

    if (query.type) {
      queryBuilder.andWhere('catalog.type = :type', { type: query.type });
    }

    if (query.keyword?.trim()) {
      queryBuilder.andWhere(
        '(LOWER(catalog.code) LIKE :keyword OR LOWER(catalog.name) LIKE :keyword)',
        { keyword: this.toLikeValue(query.keyword) },
      );
    }

    if (query.code?.trim()) {
      queryBuilder.andWhere('LOWER(catalog.code) LIKE :code', {
        code: this.toLikeValue(query.code),
      });
    }

    if (query.name?.trim()) {
      queryBuilder.andWhere('LOWER(catalog.name) LIKE :name', {
        name: this.toLikeValue(query.name),
      });
    }

    if (query.level?.trim()) {
      queryBuilder.andWhere('catalog.level = :level', {
        level: this.normalizePositiveInteger(query.level, 'Cấp danh mục'),
      });
    }

    if (query.parentId?.trim()) {
      queryBuilder.andWhere('parent.id = :parentId', {
        parentId: this.normalizePositiveInteger(
          query.parentId,
          'Danh mục cha',
        ),
      });
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      queryBuilder.andWhere('catalog.isActive = :isActive', {
        isActive: this.toBoolean(query.isActive),
      });
    }

    const [catalogs, totalItems] = await queryBuilder
      .orderBy('catalog.type', 'ASC')
      .addOrderBy('catalog.level', 'ASC')
      .addOrderBy('catalog.code', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      message: 'Lấy danh sách danh mục tai nạn lao động thành công',
      data: {
        items: catalogs.map((catalog) => this.mapCatalog(catalog)),
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

  async getCatalogDetail(id: number) {
    const catalog = await this.findCatalog(id);

    return {
      message: 'Lấy chi tiết danh mục tai nạn lao động thành công',
      data: this.mapCatalog(catalog),
    };
  }

  async createCatalog(createCatalogDto: CreateLaborAccidentCatalogDto) {
    const normalizedPayload = await this.normalizePayload(createCatalogDto);
    await this.validateUniqueCatalogCode(
      normalizedPayload.type,
      normalizedPayload.code,
    );

    const catalog = await this.catalogRepository.save(
      this.catalogRepository.create(normalizedPayload),
    );

    const savedCatalog = await this.findCatalog(catalog.id);

    return {
      message: 'Thêm danh mục tai nạn lao động thành công',
      data: this.mapCatalog(savedCatalog),
    };
  }

  async updateCatalog(
    id: number,
    updateCatalogDto: UpdateLaborAccidentCatalogDto,
  ) {
    const catalog = await this.findCatalog(id);
    const normalizedPayload = await this.normalizePayload(
      updateCatalogDto,
      catalog,
    );

    await this.validateUniqueCatalogCode(
      normalizedPayload.type,
      normalizedPayload.code,
      id,
    );

    Object.assign(catalog, normalizedPayload);
    const savedCatalog = await this.catalogRepository.save(catalog);
    const updatedCatalog = await this.findCatalog(savedCatalog.id);

    return {
      message: 'Cập nhật danh mục tai nạn lao động thành công',
      data: this.mapCatalog(updatedCatalog),
    };
  }

  async updateCatalogStatus(
    id: number,
    body: UpdateLaborAccidentCatalogStatusDto,
  ) {
    const catalog = await this.findCatalog(id);
    catalog.isActive = this.toBoolean(body.isActive);

    const savedCatalog = await this.catalogRepository.save(catalog);

    return {
      message: 'Cập nhật trạng thái danh mục tai nạn lao động thành công',
      data: this.mapCatalog(savedCatalog),
    };
  }

  private async findCatalog(id: number) {
    const catalog = await this.catalogRepository.findOne({
      where: { id },
      relations: {
        parent: true,
      },
    });

    if (!catalog) {
      throw new NotFoundException('Không tìm thấy danh mục tai nạn lao động');
    }

    return catalog;
  }

  private async normalizePayload(
    payload: CreateLaborAccidentCatalogDto | UpdateLaborAccidentCatalogDto,
    currentValue?: LaborAccidentCatalog,
  ) {
    const type = payload.type ?? currentValue?.type;
    const code = this.toTrimmedValue(payload.code) ?? currentValue?.code;
    const name = this.toTrimmedValue(payload.name) ?? currentValue?.name;
    const isActive =
      payload.isActive === undefined
        ? (currentValue?.isActive ?? true)
        : this.toBoolean(payload.isActive);

    if (!type || !Object.values(LaborAccidentCatalogType).includes(type)) {
      throw new BadRequestException('Loại danh mục không hợp lệ');
    }

    if (!code) {
      throw new BadRequestException('Mã danh mục không được để trống');
    }

    if (!name) {
      throw new BadRequestException('Tên danh mục không được để trống');
    }

    const parent = await this.resolveParentCatalog(
      payload.parentId,
      type,
      currentValue,
    );
    const level = parent ? parent.level + 1 : 1;

    if (level > MAX_LEVEL_BY_TYPE[type]) {
      throw new BadRequestException(
        `Danh mục ${LABOR_ACCIDENT_CATALOG_TYPE_LABELS[type]} chỉ hỗ trợ tối đa cấp ${MAX_LEVEL_BY_TYPE[type]}`,
      );
    }

    if (type === LaborAccidentCatalogType.INJURY_FACTOR && parent) {
      throw new BadRequestException('Yếu tố gây chấn thương không có danh mục cha');
    }

    return {
      type,
      code,
      name,
      parent,
      level,
      isActive,
    };
  }

  private async resolveParentCatalog(
    parentId: string | number | null | undefined,
    type: LaborAccidentCatalogType,
    currentValue?: LaborAccidentCatalog,
  ) {
    if (parentId === undefined) {
      const currentParent = currentValue?.parent ?? null;

      if (currentParent && currentParent.type !== type) {
        throw new BadRequestException('Danh mục cha phải cùng loại danh mục');
      }

      return currentParent;
    }

    if (parentId === null || parentId === '') {
      return null;
    }

    const normalizedParentId = this.normalizePositiveInteger(
      parentId,
      'Danh mục cha',
    );

    if (currentValue?.id === normalizedParentId) {
      throw new BadRequestException('Danh mục cha không được là chính nó');
    }

    const parent = await this.catalogRepository.findOne({
      where: { id: normalizedParentId },
      relations: {
        parent: true,
      },
    });

    if (!parent) {
      throw new BadRequestException('Danh mục cha không tồn tại');
    }

    if (parent.type !== type) {
      throw new BadRequestException('Danh mục cha phải cùng loại danh mục');
    }

    if (currentValue?.id) {
      await this.ensureParentIsNotDescendant(parent, currentValue.id);
    }

    return parent;
  }

  private async ensureParentIsNotDescendant(
    parent: LaborAccidentCatalog,
    catalogId: number,
  ) {
    let currentParent = parent.parent;

    while (currentParent) {
      if (currentParent.id === catalogId) {
        throw new BadRequestException(
          'Danh mục cha không được thuộc danh mục con của chính nó',
        );
      }

      currentParent = await this.catalogRepository.findOne({
        where: { id: currentParent.id },
        relations: {
          parent: true,
        },
      }).then((catalog) => catalog?.parent ?? null);
    }
  }

  private async validateUniqueCatalogCode(
    type: LaborAccidentCatalogType,
    code: string,
    ignoredId?: number,
  ) {
    const queryBuilder = this.catalogRepository
      .createQueryBuilder('catalog')
      .where('catalog.type = :type', { type })
      .andWhere('LOWER(catalog.code) = :code', { code: code.toLowerCase() });

    if (ignoredId) {
      queryBuilder.andWhere('catalog.id != :ignoredId', { ignoredId });
    }

    const existedCatalog = await queryBuilder.getOne();

    if (existedCatalog) {
      throw new BadRequestException('Mã danh mục đã tồn tại');
    }
  }

  private normalizePositiveInteger(value: string | number, label: string) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 1) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }

    return numberValue;
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

  private mapCatalog(catalog: LaborAccidentCatalog) {
    return {
      id: catalog.id,
      type: catalog.type,
      typeLabel: LABOR_ACCIDENT_CATALOG_TYPE_LABELS[catalog.type],
      code: catalog.code,
      name: catalog.name,
      level: catalog.level,
      parentId: catalog.parent?.id ?? null,
      parentCode: catalog.parent?.code ?? null,
      parentName: catalog.parent?.name ?? null,
      isActive: catalog.isActive,
      statusLabel: catalog.isActive ? 'Sử dụng' : 'Không sử dụng',
      createdAt: catalog.createdAt,
      updatedAt: catalog.updatedAt,
    };
  }
}
