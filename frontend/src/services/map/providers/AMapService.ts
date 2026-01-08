import { IMapService, TileConfig, TileProviderType, CoordinateSystem, Location } from '../types';

/**
 * 高德地图服务实现
 * 预留实现,需要时补充完整逻辑
 */
export class AMapService implements IMapService {
  getTileConfig(): TileConfig {
    return {
      provider: TileProviderType.AMap,
      // 使用后端代理路径
      url: '/proxy-api/tiles/amap/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      attribution: '© 高德地图',
      maxZoom: 18,
      minZoom: 1,
      tileSize: 256
    };
  }

  getCoordinateSystem(): CoordinateSystem {
    return CoordinateSystem.GCJ02;
  }

  transformCoordinates(location: Location, targetSystem: CoordinateSystem): Location {
    // 实现坐标转换逻辑 (WGS84 <-> GCJ02)
    // 预留实现
    return location;
  }

  getDefaultCenter(): Location {
    return { latitude: 39.9042, longitude: 116.4074 };
  }

  getDefaultZoom(): number {
    return 13;
  }
}
