// backend/utils/distance.ts

/**
 * 经纬度坐标接口
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * 使用Haversine公式计算两个经纬度坐标之间的距离
 * @param coord1 第一个坐标
 * @param coord2 第二个坐标
 * @returns 距离（米）
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  // 地球半径（米）
  const R = 6371000;
  
  // 将角度转换为弧度
  const lat1 = toRadians(coord1.latitude);
  const lon1 = toRadians(coord1.longitude);
  const lat2 = toRadians(coord2.latitude);
  const lon2 = toRadians(coord2.longitude);
  
  // 差值
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  // Haversine公式
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // 距离（米）
  const distance = R * c;
  
  return distance;
};

/**
 * 检查两个坐标是否距离过近
 * @param coord1 第一个坐标
 * @param coord2 第二个坐标
 * @param maxDistance 最大允许距离（米，默认500米）
 * @returns 是否距离过近
 */
export const isNearby = (coord1: Coordinates, coord2: Coordinates, maxDistance: number = 500): boolean => {
  const distance = calculateDistance(coord1, coord2);
  return distance <= maxDistance;
};

/**
 * 将角度转换为弧度
 * @param degrees 角度
 * @returns 弧度
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};