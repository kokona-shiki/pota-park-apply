import axios from 'axios';
import type { IMapService } from '../IMapService';
import type {
  TileConfig,
  Location,
  GeocodingResult,
  ReverseGeocodingResult,
  GeocodingOptions,
} from '../types';
import { TileProviderType, CoordinateSystem } from '../types';

export class OSMService implements IMapService {
  private readonly GEOCODING_PROXY_PATH = '/proxy-api/geocoding/osm';

  getTileConfig(): TileConfig {
    return {
      provider: TileProviderType.OSM,
      // 使用后端代理路径
      url: '/proxy-api/tiles/osm/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 1,
      tileSize: 256,
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

  async geocode(query: string, options: GeocodingOptions = {}): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: String(options.limit || 5),
      addressdetails: '1',
    });

    if (options.language) {
      params.append('accept-language', options.language);
    }

    const response = await axios.get<
      Array<{
        display_name: string;
        lat: string;
        lon: string;
        boundingbox?: [string, string, string, string];
      }>
    >(`${this.GEOCODING_PROXY_PATH}/search?${params.toString()}`);

    return response.data.map((item) => ({
      address: item.display_name,
      location: {
        latitude: Number.parseFloat(item.lat),
        longitude: Number.parseFloat(item.lon),
      },
      displayName: item.display_name,
      boundingBox: item.boundingbox
        ? {
            south: Number.parseFloat(item.boundingbox[0]),
            west: Number.parseFloat(item.boundingbox[2]),
            north: Number.parseFloat(item.boundingbox[1]),
            east: Number.parseFloat(item.boundingbox[3]),
          }
        : undefined,
    }));
  }

  async reverseGeocode(
    location: { latitude: number; longitude: number },
    options: GeocodingOptions = {}
  ): Promise<ReverseGeocodingResult> {
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      format: 'json',
      addressdetails: '1',
    });

    if (options.language) {
      params.append('accept-language', options.language);
    }

    const response = await axios.get(`${this.GEOCODING_PROXY_PATH}/reverse?${params.toString()}`);

    return {
      address: response.data.display_name,
      location,
      components: response.data.address,
    };
  }
}
