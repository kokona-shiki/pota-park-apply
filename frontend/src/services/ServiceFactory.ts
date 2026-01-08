import { IMapService, TileProviderType } from './map/IMapService';
import { IGeocodingService, GeocodingProviderType } from './geocoding/IGeocodingService';
import { OSMService } from './map/providers/OSMService';
import { AMapService } from './map/providers/AMapService';
import { OSMGeocodingService } from './geocoding/providers/OSMService';
import { AMapGeocodingService } from './geocoding/providers/AMapService';
import { mapConfig } from '../config/mapConfig';

/**
 * 服务工厂
 * 根据配置创建对应的服务实例
 */
export class ServiceFactory {
  /**
   * 创建地图服务实例
   */
  static createMapService(provider?: TileProviderType): IMapService {
    const targetProvider = provider || mapConfig.tileProvider;

    switch (targetProvider) {
      case TileProviderType.OSM:
        return new OSMService();
      case TileProviderType.AMap:
        return new AMapService();
      default:
        return new OSMService();
    }
  }

  /**
   * 创建地理编码服务实例
   */
  static createGeocodingService(provider?: GeocodingProviderType): IGeocodingService {
    const targetProvider = provider || mapConfig.geocodingProvider;

    switch (targetProvider) {
      case GeocodingProviderType.OSM:
        return new OSMGeocodingService();
      case GeocodingProviderType.AMap:
        return new AMapGeocodingService();
      default:
        return new OSMGeocodingService();
    }
  }
}
