// shared/schemas/parkType.ts

/**
 * 中英文对照的公园类型映射
 */
export interface ChineseToEnglishMapping {
  id: string;
  chineseName: string;
  englishName: string;
}

/**
 * 英文到中文的公园类型映射
 */
export interface EnglishToChineseMapping {
  englishName: string;
  chineseNames: string[];
}

/**
 * POTA专用的公园类型
 */
export interface PotaOnlyType {
  id: string;
  chineseName: string;
  englishName: string;
}

/**
 * 默认的POTA公园类型
 */
export interface DefaultPotaType {
  id: string;
  chineseName: string;
  englishName: string;
}

/**
 * 公园类型映射数据结构
 */
export interface ParkTypeMapping {
  chinese_to_english: ChineseToEnglishMapping[];
  english_to_chinese: EnglishToChineseMapping[];
  pota_only_types?: PotaOnlyType[];
  default_pota_type: DefaultPotaType;
}
