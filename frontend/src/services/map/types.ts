/**
 * 地图瓦片提供商类型
 */
export enum TileProviderType {
  OSM = 'osm',              // OpenStreetMap
  AMap = 'amap',            // 高德地图
  BaiduMap = 'baidu',       // 百度地图
  TencentMap = 'tencent'    // 腾讯地图
}

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
}

/**
 * 坐标系统
 */
export enum CoordinateSystem {
  WGS84 = 'wgs84',      // 国际通用
  GCJ02 = 'gcj02',      // 国测局坐标(高德/腾讯)
  BD09 = 'bd09'         // 百度坐标
}

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
