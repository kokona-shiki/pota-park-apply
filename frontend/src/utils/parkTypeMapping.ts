import parkTypeMappingData from '../../../shared/park_type_mapping.json';
import type { ParkTypeMapping } from '../../../shared/schemas';

const PARK_TYPE_MAPPING = parkTypeMappingData as ParkTypeMapping;

const PARK_TYPE_BY_ID = new Map(
  [
    ...PARK_TYPE_MAPPING.chinese_to_english,
    ...(PARK_TYPE_MAPPING.pota_only_types || []),
    ...(PARK_TYPE_MAPPING.default_pota_type ? [PARK_TYPE_MAPPING.default_pota_type] : []),
  ].map((item) => [item.id, { zh: item.chineseName, en: item.englishName }])
);

/**
 * 获取中英文对照的公园类型显示
 */
export function getParkTypeWithEnglish(parkType: string | null | undefined): string {
  if (!parkType) return '';

  const typeById = PARK_TYPE_BY_ID.get(parkType);
  if (typeById) {
    return `${typeById.zh} (${typeById.en})`;
  }

  return parkType;
}
