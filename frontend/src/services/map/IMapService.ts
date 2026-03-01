import type {
  TileConfig,
  CoordinateSystem,
  Location,
  GeocodingResult,
  ReverseGeocodingResult,
  GeocodingOptions,
} from './types';

/**
 * 地图服务接口
 * 包含瓦片服务和地理编码服务
 */
export interface IMapService {
  /**
   * 获取瓦片配置
   */
  getTileConfig(): TileConfig;

  /**
   * 获取坐标系统
   */
  getCoordinateSystem(): CoordinateSystem;

  /**
   * 坐标转换(如需要)
   */
  transformCoordinates(location: Location, targetSystem: CoordinateSystem): Location;

  /**
   * 获取默认中心点
   */
  getDefaultCenter(): Location;

  /**
   * 获取默认缩放级别
   */
  getDefaultZoom(): number;

  /**
   * 正向地理编码: 地址/地点名称 -> 坐标
   */
  geocode(query: string, options?: GeocodingOptions): Promise<GeocodingResult[]>;

  /**
   * 反向地理编码: 坐标 -> 地址
   */
  reverseGeocode(
    location: { latitude: number; longitude: number },
    options?: GeocodingOptions
  ): Promise<ReverseGeocodingResult>;
}
