import { Location } from '../map/types';

/**
 * 地理编码服务商类型
 */
export enum GeocodingProviderType {
  OSM = 'osm',              // OpenStreetMap Nominatim
  AMap = 'amap',            // 高德地理编码
  BaiduMap = 'baidu',       // 百度地理编码
  TencentMap = 'tencent'    // 腾讯地理编码
}

/**
 * 地理编码结果
 */
export interface GeocodingResult {
  address: string;
  location: Location;
  displayName?: string;
  boundingBox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

/**
 * 反向地理编码结果
 */
export interface ReverseGeocodingResult {
  address: string;
  location: Location;
  components?: {
    country?: string;
    province?: string;
    city?: string;
    district?: string;
  };
}

/**
 * 地理编码选项
 */
export interface GeocodingOptions {
  limit?: number;
  language?: string;
  country?: string;
}
