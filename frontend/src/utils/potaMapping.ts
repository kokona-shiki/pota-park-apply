// src/utils/potaMapping.ts
import parkTypeMappingData from '../../../shared/park_type_mapping.json';
import type { ParkTypeMapping } from '../../../shared/schemas';

const PARK_TYPE_MAPPING = parkTypeMappingData as ParkTypeMapping;

const REGION_BY_ISO = new Map(
  PARK_TYPE_MAPPING.chinese_to_english
    .filter((item) => item.id)
    .map((item) => [item.id, item.chineseName])
);

const ISO_BY_NAME = new Map(
  PARK_TYPE_MAPPING.chinese_to_english
    .filter((item) => item.id)
    .map((item) => [item.chineseName, item.id])
);

const MUNICIPALITIES = ['北京市', '上海市', '天津市', '重庆市'];
const AUTONOMOUS_REGIONS = ['自治区'];

// 访问方法映射
const ACCESS_METHODS_MAP: Record<string, string> = {
  '汽车': 'Automobile',
  '步行': 'Foot',
  '船只': 'Boat',
  '水上飞机/空中出租车': 'Seaplane/Air Taxi',
  '其他': 'Other',
};

const REVERSE_ACCESS_METHODS_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ACCESS_METHODS_MAP).map(([k, v]) => [v, k])
);

// 激活方法映射
const ACTIVATION_METHODS_MAP: Record<string, string> = {
  '步行': 'Foot',
  '车载': 'Mobile',
  '固定建筑': 'Fixed',
  '露营地': 'Camp',
  '庇护所': 'Shelter',
  '其他': 'Other',
};

const REVERSE_ACTIVATION_METHODS_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVATION_METHODS_MAP).map(([k, v]) => [v, k])
);

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

export const mapAccessMethods = (accessMethods: string): string[] => {
  if (!accessMethods) return [];
  const methods = accessMethods.split(',').map(m => m.trim()).filter(Boolean);
  return methods.map(m => REVERSE_ACCESS_METHODS_MAP[m] || m);
};

export const mapActivationMethods = (activationMethods: string): string[] => {
  if (!activationMethods) return [];
  const methods = activationMethods.split(',').map(m => m.trim()).filter(Boolean);
  return methods.map(m => REVERSE_ACTIVATION_METHODS_MAP[m] || m);
};

export { REVERSE_ACCESS_METHODS_MAP, REVERSE_ACTIVATION_METHODS_MAP };