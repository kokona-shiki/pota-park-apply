import type { IMapService } from '../IMapService';
import type {
  TileConfig,
  Location,
  GeocodingResult,
  ReverseGeocodingResult,
  GeocodingOptions,
} from '../types';
import { TileProviderType, CoordinateSystem } from '../types';

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
      tileSize: 256,
    };
  }

  getCoordinateSystem(): CoordinateSystem {
    return CoordinateSystem.GCJ02;
  }

  transformCoordinates(location: Location, _targetSystem: CoordinateSystem): Location {
    // 实现坐标转换逻辑 (WGS84 <-> GCJ02)
    // 预留实现
    // _targetSystem 参数保留以符合接口定义，后续实现坐标转换时会使用
    return location;
  }

  getDefaultCenter(): Location {
    return { latitude: 39.9042, longitude: 116.4074 };
  }

  getDefaultZoom(): number {
    return 13;
  }

  async geocode(_query: string, _options: GeocodingOptions = {}): Promise<GeocodingResult[]> {
    // 实现高德地理编码逻辑
    // API 文档: https://lbs.amap.com/api/webservice/guide/api/georegeo
    // 示例请求: /geocode/geo?key=您的Key&address=北京市朝阳区阜通东大街6号
    // 预留实现
    // _query 和 _options 参数保留以符合接口定义，后续实现时会使用
    return [];
  }

  async reverseGeocode(
    location: { latitude: number; longitude: number },
    _options?: GeocodingOptions
  ): Promise<ReverseGeocodingResult> {
    // 实现高德反向地理编码逻辑
    // API 文档: https://lbs.amap.com/api/webservice/guide/api/regeocode
    // 示例请求: /regeocode?key=您的Key&location=116.473195,39.993253
    // 预留实现
    return { address: '', location };
  }
}
