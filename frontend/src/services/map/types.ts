/**
 * 地图瓦片提供商类型
 */
export const TileProviderType = {
  OSM: 'osm',
  AMap: 'amap',
  BaiduMap: 'baidu',
  TencentMap: 'tencent',
  Tianditu: 'tianditu'
} as const;

export type TileProviderType = typeof TileProviderType[keyof typeof TileProviderType];

/**
 * 地图瓦片配置
 */
export interface TileConfig {
  provider: TileProviderType;
  url: string;
  attribution: string;
  maxZoom?: number;
  minZoom?: number;
  tileSize?: number;
  overlayUrl?: string;
}

/**
 * 坐标系统
 */
export const CoordinateSystem = {
  WGS84: 'wgs84',
  GCJ02: 'gcj02',
  BD09: 'bd09'
} as const;

export type CoordinateSystem = typeof CoordinateSystem[keyof typeof CoordinateSystem];

/**
 * 地点坐标
 */
export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * 地图视图配置
 */
export interface MapViewConfig {
  center: Location;
  zoom: number;
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
