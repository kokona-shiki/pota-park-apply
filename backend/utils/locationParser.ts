// backend/utils/locationParser.ts
import regionData from '../../shared/region.json';

/**
 * 从公园名称中解析省份信息
 * @param parkName 公园名称
 * @returns 解析出的省份代码数组，为空表示未解析到
 */
export const parseProvincesFromParkName = (parkName: string): string[] => {
  const provinces = regionData as Array<{ name: string; code: string }>;
  const parsedProvinces: string[] = [];
  
  // 按省份名称长度降序排列，优先匹配较长的省份名称（如"内蒙古"）
  const sortedProvinces = [...provinces].sort((a, b) => b.name.length - a.name.length);
  
  for (const province of sortedProvinces) {
    if (parkName.includes(province.name)) {
      parsedProvinces.push(province.code);
    }
  }
  
  return parsedProvinces;
};
