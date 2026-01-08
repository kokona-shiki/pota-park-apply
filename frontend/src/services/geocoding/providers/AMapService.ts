import { IGeocodingService, GeocodingResult, ReverseGeocodingResult, GeocodingOptions, GeocodingProviderType } from '../types';

/**
 * 高德地理编码服务实现
 * 预留实现,需要时补充完整逻辑
 */
export class AMapGeocodingService implements IGeocodingService {
  private readonly PROXY_PATH = '/proxy-api/geocoding/amap'; // 使用后端代理路径

  async geocode(query: string, options: GeocodingOptions = {}): Promise<GeocodingResult[]> {
    // 实现高德地理编码逻辑
    // API 文档: https://lbs.amap.com/api/webservice/guide/api/georegeo
    // 示例请求: /geocode/geo?key=您的Key&address=北京市朝阳区阜通东大街6号
    // 预留实现
    return [];
  }

  async reverseGeocode(location: { latitude: number; longitude: number }, options: GeocodingOptions = {}): Promise<ReverseGeocodingResult> {
    // 实现高德反向地理编码逻辑
    // API 文档: https://lbs.amap.com/api/webservice/guide/api/regeocode
    // 示例请求: /regeocode?key=您的Key&location=116.473195,39.993253
    // 预留实现
    return { address: '', location };
  }

  getProviderType(): GeocodingProviderType {
    return GeocodingProviderType.AMap;
  }
}
