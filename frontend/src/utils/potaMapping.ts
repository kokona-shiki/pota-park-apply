// POTA API 数据映射工具函数

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

// 将 locationDesc (ISO-3166 省份代码) 映射为省份代码
export const mapLocationToProvince = (locationDesc: string): string => {
  const locationMap: { [key: string]: string } = {
    'CN-BJ': '11', // 北京
    'CN-TJ': '12', // 天津
    'CN-HE': '13', // 河北
    'CN-SX': '14', // 山西
    'CN-NM': '15', // 内蒙古
    'CN-LN': '21', // 辽宁
    'CN-JL': '22', // 吉林
    'CN-HL': '23', // 黑龙江
    'CN-SH': '31', // 上海
    'CN-JS': '32', // 江苏
    'CN-ZJ': '33', // 浙江
    'CN-AH': '34', // 安徽
    'CN-FJ': '35', // 福建
    'CN-JX': '36', // 江西
    'CN-SD': '37', // 山东
    'CN-HA': '41', // 河南
    'CN-HB': '42', // 湖北
    'CN-HN': '43', // 湖南
    'CN-GD': '44', // 广东
    'CN-GX': '45', // 广西
    'CN-HI': '46', // 海南
    'CN-CQ': '50', // 重庆
    'CN-SC': '51', // 四川
    'CN-GZ': '52', // 贵州
    'CN-YN': '53', // 云南
    'CN-XZ': '54', // 西藏
    'CN-SN': '61', // 陕西
    'CN-GS': '62', // 甘肃
    'CN-QH': '63', // 青海
    'CN-NX': '64', // 宁夏
    'CN-XJ': '65', // 新疆
  };
  
  return locationMap[locationDesc] || '';
};