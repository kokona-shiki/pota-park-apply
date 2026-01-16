import type { PotaPark, InternalPark } from './types.js';
import { identifyParkType } from './parkTypeResolver.js';

export const normalizeCsvList = (value?: string) => {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
  // 解析 locationDesc 字段，它包含了多个省份代码，用逗号分隔
  const provinces = potaPark.locationDesc
    ? potaPark.locationDesc
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  // 识别公园类型
  const parkType = resolvedType ?? (await identifyParkType(potaPark));

  const parkName = potaPark.name || potaPark.reference || 'Unknown Park';

  // 提取 POTA 公园类型描述
  const potaParkType = potaPark.parktypeDesc || potaPark.parkTypeDesc || null;

  return {
    park_name: parkName,
    park_type: parkType, // 根据名称识别出的公园类型
    provinces: provinces,
    latitude: potaPark.latitude,
    longitude: potaPark.longitude,
    website: potaPark.website || null,
    description: potaPark.parkComments || '',
    access_methods: normalizeCsvList(potaPark.accessMethods),
    activation_methods: normalizeCsvList(potaPark.activationMethods),
    confirmed_authenticity: true, // POTA 导入的公园默认真实
    pota_ref: potaPark.reference, // 保存原始 POTA 参考 ID
    pota_park_type: potaParkType, // 保存 POTA 的公园类型描述
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
