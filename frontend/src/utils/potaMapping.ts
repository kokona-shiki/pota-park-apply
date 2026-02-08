// src/utils/potaMapping.ts
import parkTypeMappingData from '../../../shared/park_type_mapping.json';
import type { ParkTypeMapping } from '../../../shared/schemas';

const PARK_TYPE_MAPPING = parkTypeMappingData as ParkTypeMapping;

const REGION_BY_ISO = new Map(
  PARK_TYPE_MAPPING.chinese_to_english
    .filter((item) => item.iso3166_2Code)
    .map((item) => [item.iso3166_2Code, item.chineseName])
);

const ISO_BY_NAME = new Map(
  PARK_TYPE_MAPPING.chinese_to_english
    .filter((item) => item.iso3166_2Code)
    .map((item) => [item.chineseName, item.iso3166_2Code])
);

const MUNICIPALITIES = ['北京市', '上海市', '天津市', '重庆市'];
const AUTONOMOUS_REGIONS = ['自治区'];

function normalizeProvinceName(name: string): string {
  return name.trim().replace(/省|市/g, '');
}

function isProvincePart(part: string): boolean {
  return part.includes('省');
}

function isMunicipality(part: string): boolean {
  return MUNICIPALITIES.includes(part);
}

function isAutonomousRegion(part: string): boolean {
  return AUTONOMOUS_REGIONS.some(suffix => part.includes(suffix));
}

function isCityPart(part: string): boolean {
  return part.includes('市') && !part.includes('省');
}

function extractProvinceFromPart(part: string): string {
  if (isProvincePart(part)) {
    return part.replace('省', '');
  }
  if (isMunicipality(part)) {
    return part.replace('市', '');
  }
  if (isAutonomousRegion(part)) {
    return part.replaceAll(/自治区|壮族回族维吾尔藏族蒙古/g, '');
  }
  return '';
}

function findProvinceInParts(parts: string[]): { province: string; index: number } | null {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const province = extractProvinceFromPart(part);
    if (province) {
      return { province, index: i };
    }
  }
  return null;
}

function findCityInParts(parts: string[]): string {
  for (const part of parts.slice(2, 5)) {
    if (isCityPart(part)) {
      return part.replace('市', '');
    }
  }
  return '';
}

export const mapLocationToProvince = (locationDesc: string): string => {
  const code = String(locationDesc || '').trim();
  return REGION_BY_ISO.has(code) ? code : '';
};

export const parseOSMDisplayName = (displayName: string): { province: string; city: string; name: string } | null => {
  const parts = displayName.split(', ').map(p => p.trim());

  if (parts.length < 4) {
    return null;
  }

  const name = parts[0] || '';
  const provinceResult = findProvinceInParts(parts);

  if (!provinceResult) {
    return null;
  }

  const { province } = provinceResult;
  let city = '';

  if (isMunicipality(parts[provinceResult.index])) {
    city = province;
  } else if (!city) {
    city = findCityInParts(parts);
  }

  return { province, city: city || '', name };
};

export const getProvinceCodeFromNames = (provinceName: string): string => {
  const normalized = normalizeProvinceName(provinceName);
  return ISO_BY_NAME.get(normalized) || '';
};

export const getProvinceNameFromCode = (isoCode: string): string => {
  return REGION_BY_ISO.get(isoCode) || '';
};