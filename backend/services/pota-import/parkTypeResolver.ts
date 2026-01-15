import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  PotaPark,
  ParkTypeMappings,
  ParkTypeMappingItem,
  ParkTypeIndex,
  ParkTypeIndexItem,
} from './types.js';

// 缓存公园类型映射
let parkTypeMappings: ParkTypeMappings | null = null;
let parkTypeIndex: ParkTypeIndex | null = null;

/**
 * 加载公园类型映射
 */
export const loadParkTypeMappings = async () => {
  if (parkTypeMappings) {
    return parkTypeMappings;
  }

  try {
    // 获取当前文件的目录路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 构建前端资产文件路径
    const mappingFilePath = path.resolve(__dirname, '../../../shared/park_type_mapping.json');

    const fileContent = await fs.readFile(mappingFilePath, 'utf8');
    const mappings = JSON.parse(fileContent) as ParkTypeMappings;

    parkTypeMappings = mappings;
    return mappings;
  } catch (error) {
    console.error('加载公园类型映射失败:', error.message);
    // 返回一个默认的映射结构，以防文件读取失败
    return {
      chinese_to_english: [],
      english_to_chinese: [],
      pota_only_types: [],
      default_pota_type: undefined,
    };
  }
};

const buildParkTypeIndex = (mappings: ParkTypeMappings): ParkTypeIndex => {
  const allTypes = [
    ...(mappings.chinese_to_english || []),
    ...(mappings.pota_only_types || []),
  ].filter((item) => item?.id);

  const byId = new Map<string, ParkTypeIndexItem>();
  const byEnglish = new Map<string, string[]>();
  const byChinese = new Map<string, string>();

  for (const item of allTypes) {
    byId.set(item.id, { id: item.id, zh: item.chineseName, en: item.englishName });
    byChinese.set(item.chineseName, item.id);
    const ids = byEnglish.get(item.englishName) || [];
    ids.push(item.id);
    byEnglish.set(item.englishName, ids);
  }

  return {
    allTypes,
    byId,
    byEnglish,
    byChinese,
  };
};

const getParkTypeIndex = async () => {
  if (parkTypeIndex) {
    return parkTypeIndex;
  }
  const mappings = await loadParkTypeMappings();
  parkTypeIndex = buildParkTypeIndex(mappings);
  return parkTypeIndex;
};

export const resolveParkTypeId = async (value?: string | null) => {
  if (!value) {
    return null;
  }
  const { byId, byEnglish, byChinese } = await getParkTypeIndex();
  if (byId.has(value)) {
    return value;
  }
  if (byChinese.has(value)) {
    return byChinese.get(value);
  }
  const englishIds = byEnglish.get(value);
  if (englishIds && englishIds.length > 0) {
    return englishIds[0];
  }
  return null;
};

/**
 * 从中文部分识别公园类型
 */
const identifyParkTypeByChinese = (
  chinesePart: string,
  mappings: ParkTypeMappings
): string | null => {
  // 首先检查标准类型
  for (const mapping of mappings.chinese_to_english) {
    if (chinesePart.includes(mapping.chineseName)) {
      console.log(`通过中文关键词识别公园类型: ${mapping.chineseName} -> ${mapping.englishName}`);
      return mapping.id || null;
    }
  }

  // 然后检查POTA专用类型
  if (mappings.pota_only_types) {
    for (const mapping of mappings.pota_only_types) {
      if (chinesePart.includes(mapping.chineseName)) {
        console.log(
          `通过POTA专用中文关键词识别公园类型: ${mapping.chineseName} -> ${mapping.englishName}`
        );
        return mapping.id || null;
      }
    }
  }

  return null;
};

/**
 * 检查英文类型是否匹配
 */
const matchEnglishType = (englishPart: string, englishName: string): boolean => {
  const englishWords = englishName.toLowerCase().split(/\s+/);
  const lowerEnglishPart = englishPart.toLowerCase();

  for (const word of englishWords) {
    if (!lowerEnglishPart.includes(word)) {
      return false;
    }
  }
  return true;
};

/**
 * 从英文部分识别公园类型
 */
const identifyParkTypeByEnglish = (
  englishPart: string,
  mappings: ParkTypeMappings
): string | null => {
  const possibleTypes: Array<{ typeId: string; englishName: string; length: number }> = [];

  // 检查标准英文类型
  for (const mapping of mappings.english_to_chinese || []) {
    if (matchEnglishType(englishPart, mapping.englishName)) {
      possibleTypes.push({
        typeId: mapping.id,
        englishName: mapping.englishName,
        length: mapping.englishName.length,
      });
    }
  }

  // 检查POTA专用类型
  if (mappings.pota_only_types) {
    for (const mapping of mappings.pota_only_types) {
      if (matchEnglishType(englishPart, mapping.englishName)) {
        possibleTypes.push({
          typeId: mapping.id,
          englishName: mapping.englishName,
          length: mapping.englishName.length,
        });
      }
    }
  }

  if (possibleTypes.length === 0) {
    return null;
  }

  // 按长度降序排序，选择最长的匹配
  possibleTypes.sort((a, b) => b.length - a.length);

  const maxLength = possibleTypes[0].length;
  const longestMatches = possibleTypes.filter((item) => item.length === maxLength);

  if (longestMatches.length === 1) {
    console.log(`通过英文部分识别公园类型: ${longestMatches[0].englishName}`);
    return longestMatches[0].typeId || null;
  }

  // 如果有多个相同长度的匹配，返回第一个
  const matchedTypes = longestMatches.map((item) => item.englishName);
  console.log(`发现多个相同长度的匹配类型: ${matchedTypes.join(', ')}`);
  return longestMatches[0].typeId || null;
};

/**
 * 通过默认类型识别公园类型
 */
const identifyParkTypeByDefault = (
  chinesePart: string,
  englishPart: string,
  mappings: ParkTypeMappings
): string | null => {
  const defaultPotaType = mappings.default_pota_type;
  if (!defaultPotaType) {
    return null;
  }

  if (chinesePart.includes(defaultPotaType.chineseName)) {
    console.log(
      `通过默认中文关键词识别公园类型: ${defaultPotaType.chineseName} -> ${defaultPotaType.englishName}`
    );
    return defaultPotaType.id || null;
  }

  if (englishPart.includes(defaultPotaType.englishName)) {
    console.log(
      `通过默认英文关键词识别公园类型: ${defaultPotaType.englishName} -> ${defaultPotaType.chineseName}`
    );
    return defaultPotaType.id || null;
  }

  return null;
};

/**
 * 根据公园名称识别公园类型
 * @param {Object} potaPark - POTA 公园数据
 * @returns {string|null} - 识别出的公园类型ID，如果无法识别则返回 null
 */
export const identifyParkType = async (potaPark: PotaPark) => {
  const mappings = await loadParkTypeMappings();

  const rawName = typeof potaPark?.name === 'string' ? potaPark.name.trim() : '';
  let rawTypeDesc = '';
  if (typeof potaPark?.parktypeDesc === 'string') {
    rawTypeDesc = potaPark.parktypeDesc.trim();
  } else if (typeof potaPark?.parkTypeDesc === 'string') {
    rawTypeDesc = potaPark.parkTypeDesc.trim();
  }

  if (!rawName && !rawTypeDesc) {
    return null;
  }

  let chinesePart = rawName;
  let englishPart = rawTypeDesc;

  if (!englishPart && rawName.includes(' ')) {
    const spaceIndex = rawName.indexOf(' ');
    if (spaceIndex !== -1) {
      chinesePart = rawName.substring(0, spaceIndex);
      englishPart = rawName.substring(spaceIndex + 1);
    }
  }

  // 从中文部分识别
  const chineseMatch = identifyParkTypeByChinese(chinesePart, mappings);
  if (chineseMatch) {
    return chineseMatch;
  }

  // 从英文部分识别
  if (englishPart) {
    const englishMatch = identifyParkTypeByEnglish(englishPart, mappings);
    if (englishMatch) {
      return englishMatch;
    }
    console.log(`英文部分无法匹配任何类型: ${englishPart}`);
  }

  // 通过默认类型识别
  const defaultMatch = identifyParkTypeByDefault(chinesePart, englishPart, mappings);
  if (defaultMatch) {
    return defaultMatch;
  }

  // 如果没有匹配的类型，返回 null
  console.log(
    `无法识别公园类型，英文部分: ${englishPart || 'N/A'}，中文部分: ${chinesePart || 'N/A'}`
  );
  return null;
};
