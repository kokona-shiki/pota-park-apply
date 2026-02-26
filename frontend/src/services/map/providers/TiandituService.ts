import { apiClient, requestWithSchema } from '../../apiClient';
import { TiandituPoiResponseSchema, TiandituReverseGeocodeResponseSchema } from '../schemas';
import type { IMapService } from '../IMapService';
import type {
  TileConfig,
  Location,
  GeocodingResult,
  ReverseGeocodingResult,
  GeocodingOptions,
} from '../types';
import { TileProviderType, CoordinateSystem } from '../types';

export class TiandituService implements IMapService {
  private readonly GEOCODING_PROXY_PATH = '/proxy-api/geocoding/tianditu';

  getTileConfig(): TileConfig {
    return {
      provider: TileProviderType.Tianditu,
      url: '/proxy-api/tiles/tianditu/vec/{z}/{x}/{y}.png',
      overlayUrl: '/proxy-api/tiles/tianditu/cva/{z}/{x}/{y}.png',
      attribution: '© 天地图',
      maxZoom: 18,
      minZoom: 1,
      tileSize: 256,
    };
  }

  getCoordinateSystem(): CoordinateSystem {
    return CoordinateSystem.WGS84;
  }

  transformCoordinates(location: Location, targetSystem: CoordinateSystem): Location {
    if (targetSystem === CoordinateSystem.WGS84) {
      return location;
    }
    return location;
  }

  getDefaultCenter(): Location {
    return { latitude: 39.9042, longitude: 116.4074 };
  }

  getDefaultZoom(): number {
    return 13;
  }

  async geocode(query: string, options: GeocodingOptions = {}): Promise<GeocodingResult[]> {
    const postStr = JSON.stringify({
      keyWord: query,
      queryType: '1',
      count: options.limit || 5,
      start: 0,
    });

    const params = new URLSearchParams({
      postStr,
      type: 'query',
    });

    const payload = await requestWithSchema(
      apiClient.get(`${this.GEOCODING_PROXY_PATH}/search?${params.toString()}`),
      TiandituPoiResponseSchema
    );

    if (payload.status !== '0' || !payload.pois) {
      return [];
    }

    return payload.pois.map((poi) => ({
      address: poi.address || poi.name,
      location: {
        latitude: Number.parseFloat(poi.lat),
        longitude: Number.parseFloat(poi.lon),
      },
      displayName: poi.name,
    }));
  }

  async reverseGeocode(
    location: { latitude: number; longitude: number },
    _options: GeocodingOptions = {}
  ): Promise<ReverseGeocodingResult> {
    const params = new URLSearchParams({
      lon: String(location.longitude),
      lat: String(location.latitude),
    });

    const payload = await requestWithSchema(
      apiClient.get(`${this.GEOCODING_PROXY_PATH}/reverse?${params.toString()}`),
      TiandituReverseGeocodeResponseSchema
    );

    if (payload.status !== '0' || !payload.data || payload.data.length === 0) {
      return {
        address: '',
        location,
        components: {},
      };
    }

    const result = payload.data[0];
    const addressInfo = result.address || {};

    return {
      address: result.formatted_address || '',
      location,
      components: {
        country: '中国',
        province: addressInfo.province,
        city: addressInfo.city,
        district: addressInfo.county,
      },
    };
  }
}
