import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  LaborAccidentCatalog,
  LaborAccidentCatalogType,
} from '../entities/labor-accident-catalog.entity';

type CatalogSeedItem = {
  type: LaborAccidentCatalogType;
  code: string;
  name: string;
  parentCode?: string;
  isActive?: boolean;
};

const LABOR_ACCIDENT_CATALOG_SEEDS: CatalogSeedItem[] = [
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: 'A',
    name: 'Do người sử dụng lao động',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '1',
    name: 'Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn',
    parentCode: 'A',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '2',
    name: 'Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt',
    parentCode: 'A',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '3',
    name: 'Tổ chức lao động không hợp lý',
    parentCode: 'A',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '4',
    name: 'Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ',
    parentCode: 'A',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '5',
    name: 'Không có quy trình an toàn hoặc biện pháp làm việc an toàn',
    parentCode: 'A',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '6',
    name: 'Điều kiện làm việc không tốt',
    parentCode: 'A',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: 'B',
    name: 'Do người lao động',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '7',
    name: 'Vi phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn',
    parentCode: 'B',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '8',
    name: 'Không sử dụng phương tiện bảo vệ cá nhân',
    parentCode: 'B',
  },
  {
    type: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    code: '9',
    name: 'Khách quan khó tránh/ Nguyên nhân chưa kể đến',
    parentCode: 'B',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '1',
    name: 'Điện',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '2',
    name: 'Phóng xạ',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '3',
    name: 'Thiết bị áp lực',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '4',
    name: 'Thiết bị nâng',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '5',
    name: 'Bộ phận truyền động, chuyển động của máy, thiết bị gây cán, cuốn, đè, ép, kẹp, cắt, va đập,...',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '6',
    name: 'Vật văng bắn',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '7',
    name: 'Vật rơi, đổ, sập',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '8',
    name: 'Sập đổ công trình, giàn giáo',
  },
  {
    type: LaborAccidentCatalogType.INJURY_FACTOR,
    code: '9',
    name: 'Sập lò, sập đất đá',
  },
  {
    type: LaborAccidentCatalogType.INJURY_TYPE,
    code: '1',
    name: 'Đầu, mặt, cổ',
  },
  {
    type: LaborAccidentCatalogType.INJURY_TYPE,
    code: '11',
    name: 'Các chấn thương sọ não hở hoặc kín',
    parentCode: '1',
  },
  {
    type: LaborAccidentCatalogType.INJURY_TYPE,
    code: '110',
    name: 'Bị thương vào cổ, tác hại đến thanh quản và thực quản',
    parentCode: '11',
  },
  {
    type: LaborAccidentCatalogType.OCCUPATION,
    code: '1',
    name: 'Nhà lãnh đạo trong các ngành, các cấp và các đơn vị',
  },
  {
    type: LaborAccidentCatalogType.OCCUPATION,
    code: '11',
    name: 'Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương và địa phương ...',
    parentCode: '1',
  },
  {
    type: LaborAccidentCatalogType.OCCUPATION,
    code: '111',
    name: 'Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương',
    parentCode: '11',
  },
  {
    type: LaborAccidentCatalogType.OCCUPATION,
    code: '1111',
    name: 'Trưởng ban, Phó Trưởng ban và tương đương trở lên thuộc cấp Trung ương',
    parentCode: '111',
  },
  {
    type: LaborAccidentCatalogType.OCCUPATION,
    code: '103',
    name: 'Công nhân',
  },
];

@Injectable()
export class LaborAccidentCatalogSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(LaborAccidentCatalog)
    private readonly catalogRepository: Repository<LaborAccidentCatalog>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultCatalogs();
  }

  private async seedDefaultCatalogs() {
    const catalogByKey = new Map<string, LaborAccidentCatalog>();

    for (const seedItem of LABOR_ACCIDENT_CATALOG_SEEDS) {
      const key = this.toKey(seedItem.type, seedItem.code);
      const existedCatalog = await this.catalogRepository.findOne({
        where: {
          type: seedItem.type,
          code: seedItem.code,
        },
        relations: {
          parent: true,
        },
      });

      if (existedCatalog) {
        catalogByKey.set(key, existedCatalog);
        continue;
      }

      const parent = seedItem.parentCode
        ? await this.findParent(seedItem.type, seedItem.parentCode, catalogByKey)
        : null;

      const catalog = this.catalogRepository.create({
        type: seedItem.type,
        code: seedItem.code,
        name: seedItem.name,
        parent,
        level: parent ? parent.level + 1 : 1,
        isActive: seedItem.isActive ?? true,
      });

      const savedCatalog = await this.catalogRepository.save(catalog);
      catalogByKey.set(key, savedCatalog);
    }
  }

  private async findParent(
    type: LaborAccidentCatalogType,
    parentCode: string,
    catalogByKey: Map<string, LaborAccidentCatalog>,
  ) {
    const key = this.toKey(type, parentCode);
    const cachedParent = catalogByKey.get(key);

    if (cachedParent) {
      return cachedParent;
    }

    const parent = await this.catalogRepository.findOne({
      where: {
        type,
        code: parentCode,
      },
      relations: {
        parent: true,
      },
    });

    if (parent) {
      catalogByKey.set(key, parent);
    }

    return parent;
  }

  private toKey(type: LaborAccidentCatalogType, code: string) {
    return `${type}:${code}`;
  }
}
