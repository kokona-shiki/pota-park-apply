import { TileConfig, CoordinateSystem, Location } from './types';

/**
 * 地图瓦片服务接口
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
}
