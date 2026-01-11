import type { IMapService } from './map/IMapService';
import { TileProviderType } from './map/types';
import { OSMService } from './map/providers/OSMService';
import { AMapService } from './map/providers/AMapService';
import { mapConfig } from '../config/mapConfig';

/**
 * 服务工厂
 * 根据配置创建对应的服务实例
 */
export class ServiceFactory {
  /**
   * 创建地图服务实例（包含瓦片服务和地理编码服务）
   */
  static createMapService(provider?: TileProviderType): IMapService {
    const targetProvider = provider || mapConfig.provider;

    switch (targetProvider) {
      case TileProviderType.OSM:
        return new OSMService();
      case TileProviderType.AMap:
        return new AMapService();
      default:
        return new OSMService();
    }
  }
}
