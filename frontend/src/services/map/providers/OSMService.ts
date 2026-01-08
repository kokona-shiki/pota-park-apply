import { IMapService, TileConfig, TileProviderType, CoordinateSystem, Location } from '../types';

export class OSMService implements IMapService {
  getTileConfig(): TileConfig {
    return {
      provider: TileProviderType.OSM,
      // 使用后端代理路径
      url: '/proxy-api/tiles/osm/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 1,
      tileSize: 256
    };
  }

  getCoordinateSystem(): CoordinateSystem {
    return CoordinateSystem.WGS84;
  }

  transformCoordinates(location: Location, targetSystem: CoordinateSystem): Location {
    // OSM 使用 WGS84,不需要转换
    if (targetSystem === CoordinateSystem.WGS84) {
      return location;
    }
    // 预留坐标转换逻辑
    return location;
  }

  getDefaultCenter(): Location {
    return { latitude: 39.9042, longitude: 116.4074 }; // 北京
  }

  getDefaultZoom(): number {
    return 13;
  }
}
