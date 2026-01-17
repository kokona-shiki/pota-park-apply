// POTA API 数据映射工具函数
import regionMapping from '../../../shared/region.json';
import type { Region } from '../../../shared/schemas';

const REGION_LIST = regionMapping as Region[];
const REGION_BY_ISO = new Map(REGION_LIST.map((item) => [item.code, item.name]));
const ISO_BY_NAME = new Map(
  REGION_LIST.map((item) => [item.name, item.code])
);

const normalizeProvinceName = (name: string): string => {
  return name
    .replaceAll(/省|市|特别行政区/g, '')
    .replaceAll('自治区', '')
    .trim();
};

// 访问方法中英文映射
const ACCESS_METHODS_MAP: { [key: string]: string } = {
  'Automobile': '汽车',
  'Foot': '步行',
  'Boat': '船只',
  'Seaplane/Airtaxi': '水上飞机/空中出租车',
  'Other': '其他'
};

// 激活方法中英文映射
const ACTIVATION_METHODS_MAP: { [key: string]: string } = {
  'Pedestrian': '步行',
  'Automobile': '车载',
  'Cabin': '固定建筑',
  'Campground': '露营地',
  'Shelter': '庇护所',
  'Other': '其他'
};

// 创建反向映射
const REVERSE_ACCESS_METHODS_MAP: { [key: string]: string } = {};
const REVERSE_ACTIVATION_METHODS_MAP: { [key: string]: string } = {};

Object.keys(ACCESS_METHODS_MAP).forEach(key => {
  REVERSE_ACCESS_METHODS_MAP[ACCESS_METHODS_MAP[key]] = key;
});

Object.keys(ACTIVATION_METHODS_MAP).forEach(key => {
  REVERSE_ACTIVATION_METHODS_MAP[ACTIVATION_METHODS_MAP[key]] = key;
});

// 将 POTA API 的访问方法映射为中文
export const mapAccessMethods = (apiMethods: string): string[] => {
  return apiMethods.split(',').map(method => {
    const trimmedMethod = method.trim();
    return ACCESS_METHODS_MAP[trimmedMethod] || trimmedMethod;
  });
};

// 将 POTA API 的激活方法映射为中文
export const mapActivationMethods = (apiMethods: string): string[] => {
  return apiMethods.split(',').map(method => {
    const trimmedMethod = method.trim();
    return ACTIVATION_METHODS_MAP[trimmedMethod] || trimmedMethod;
  });
};

// 将中英文访问方法映射为包含中英文的对象数组
export const mapAccessMethodsWithBothLangs = (methods: string[]): Array<{ zh: string; en: string }> => {
  return methods.map(method => ({
    zh: method,
    en: REVERSE_ACCESS_METHODS_MAP[method] || method
  }));
};

// 将中英文激活方法映射为包含中英文的对象数组
export const mapActivationMethodsWithBothLangs = (methods: string[]): Array<{ zh: string; en: string }> => {
  return methods.map(method => ({
    zh: method,
    en: REVERSE_ACTIVATION_METHODS_MAP[method] || method
  }));
};

// 将 locationDesc (ISO-3166 省份代码) 映射为 ISO-3166 代码（无效则返回空）
export const mapLocationToProvince = (locationDesc: string): string => {
  const code = String(locationDesc || '').trim();
  return REGION_BY_ISO.has(code) ? code : '';
};

// 从 OSM POI 的 display_name 解析省份和地市
export const parseOSMDisplayName = (displayName: string): { province: string; city: string; name: string } | null => {
  // OSM display_name 格式: "name, district, city, province, postal_code, country"
  // 示例: "横琴花海长廊, 横琴粤澳深度合作区, 香洲区, 珠海市, 广东省, 519000, 中国"

  const parts = displayName.split(', ').map(p => p.trim());

  if (parts.length < 4) {
    return null;
  }

  const name = parts[0] || ''; // POI 名称
  let province = '';
  let city = '';

  // 从后向前解析省份和城市
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];

    // 识别省份 (以"省"结尾)
    if (!province && part.includes('省')) {
      province = part.replace('省', '');
      continue;
    }

    // 识别直辖市 (北京、上海、天津、重庆)
    if (!province && ['北京市', '上海市', '天津市', '重庆市'].includes(part)) {
      province = part.replace('市', '');
      city = province; // 直辖市城市名与省份相同
      continue;
    }

    // 识别自治区
    if (!province && ['自治区'].some(suffix => part.includes(suffix))) {
      province = part.replaceAll(/自治区|壮族回族维吾尔藏族蒙古/g, '');
      continue;
    }

    // 识别城市 (以"市"结尾,且已经找到省份)
    if (province && !city && part.includes('市') && !part.includes('省')) {
      city = part.replace('市', '');
    }
  }

  // 如果没有找到城市,尝试从其他位置查找
  if (!city && parts.length >= 4) {
    // 尝试从索引3或4的位置查找城市名
    for (const part of parts.slice(2, 5)) {
      if (part.includes('市') && !part.includes('省')) {
        city = part.replace('市', '');
        break;
      }
    }
  }

  if (!province) {
    return null;
  }

  return { province, city: city || '', name };
};

// 根据省份和地市名称获取省份代码（ISO-3166 格式）
export const getProvinceCodeFromNames = (provinceName: string): string => {
  const normalized = normalizeProvinceName(provinceName);
  return ISO_BY_NAME.get(normalized) || '';
};

// 根据 ISO-3166 代码获取省份简称
export const getProvinceNameFromCode = (isoCode: string): string => {
  return REGION_BY_ISO.get(isoCode) || '';
};