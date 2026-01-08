import { GeocodingResult, ReverseGeocodingResult, GeocodingOptions, GeocodingProviderType } from './types';

/**
 * 地理编码服务接口
 */
export interface IGeocodingService {
  /**
   * 正向地理编码: 地址/地点名称 -> 坐标
   */
  geocode(query: string, options?: GeocodingOptions): Promise<GeocodingResult[]>;

  /**
   * 反向地理编码: 坐标 -> 地址
   */
  reverseGeocode(location: { latitude: number; longitude: number }, options?: GeocodingOptions): Promise<ReverseGeocodingResult>;

  /**
   * 获取服务提供商类型
   */
  getProviderType(): GeocodingProviderType;
}
