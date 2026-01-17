import type { PotaPark, InternalPark } from './types.js';
import { identifyParkType } from './parkTypeResolver.js';

export const normalizeCsvList = (value?: string): string => {
  if (typeof value !== 'string') {
    return '[]';
  }
  const array = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return JSON.stringify(array);
};

export const cleanWebsite = (website?: string | null): string | null => {
  if (!website || typeof website !== 'string') {
    return null;
  }
  return website.replace(/`/g, '').trim();
};

export const extractChineseName = (name?: string) => {
  if (typeof name !== 'string') {
    return '';
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return trimmed;
  }
  return trimmed.substring(0, spaceIndex);
};

/**
 * 将 POTA 公园数据转换为系统内部格式
 */
export const transformPotaParkToInternal = async (
  potaPark: PotaPark,
  resolvedType: string | null = null
): Promise<InternalPark> => {
  const provincesArray = potaPark.locationDesc
    ? potaPark.locationDesc
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const parkType = resolvedType ?? (await identifyParkType(potaPark));

  const parkName = potaPark.name || potaPark.reference || 'Unknown Park';

  const potaParkType = potaPark.parktypeDesc || potaPark.parkTypeDesc || null;

  return {
    park_name: parkName,
    park_type: parkType,
    provinces: JSON.stringify(provincesArray),
    latitude: potaPark.latitude,
    longitude: potaPark.longitude,
    website: cleanWebsite(potaPark.website),
    description: potaPark.parkComments || '',
    access_methods: normalizeCsvList(potaPark.accessMethods),
    activation_methods: normalizeCsvList(potaPark.activationMethods),
    confirmed_authenticity: true,
    pota_ref: potaPark.reference,
    pota_park_type: potaParkType,
  };
};

/**
 * 规范化公园数据格式
 */
export const normalizeParksData = (parksData: unknown): PotaPark[] => {
  if (Array.isArray(parksData)) {
    return parksData;
  }

  if (parksData && typeof parksData === 'object') {
    // Check if parksData has a parks property that is an array
    if (Object.hasOwn(parksData, 'parks') && Array.isArray((parksData as any)['parks'])) {
      return (parksData as any)['parks'];
    }

    const possibleArrayKeys = ['data', 'results', 'features'];
    for (const key of possibleArrayKeys) {
      if ((parksData as any)[key] && Array.isArray((parksData as any)[key])) {
        return (parksData as any)[key];
      }
    }
  }

  throw new TypeError('从 POTA API 获取的数据格式不正确，期望数组格式');
};
