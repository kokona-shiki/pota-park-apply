import { apiClient, requestWithSchema } from '../../apiClient';
import { TiandituSearchResponseSchema, TiandituGeocoderResponseSchema } from '../schemas';
import type { IMapService } from '../IMapService';
import type {
  TileConfig,
  Location,
  GeocodingResult,
  ReverseGeocodingResult,
  GeocodingOptions,
} from '../types';
import { TileProviderType, CoordinateSystem } from '../types';

const CHINA_MAP_BOUND = '73.66,3.86,135.05,53.55';

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
      count: options.limit || 10,
      start: 0,
      mapBound: CHINA_MAP_BOUND,
      level: 12,
    });

    const params = new URLSearchParams({
      postStr,
      type: 'query',
    });

    const payload = await requestWithSchema(
      apiClient.get(`${this.GEOCODING_PROXY_PATH}/v2/search?${params.toString()}`),
      TiandituSearchResponseSchema
    );

    const statusInfo = payload.status;
    if (!statusInfo || statusInfo.infocode !== 1000 || !payload.pois) {
      return [];
    }

    return payload.pois.map((poi) => {
      const [lon, lat] = poi.lonlat.split(',');
      return {
        address: poi.address || poi.name,
        location: {
          latitude: Number.parseFloat(lat),
          longitude: Number.parseFloat(lon),
        },
        displayName: poi.name,
      };
    });
  }

  async reverseGeocode(
    location: { latitude: number; longitude: number },
    _options: GeocodingOptions = {}
  ): Promise<ReverseGeocodingResult> {
    const postStr = JSON.stringify({
      lon: location.longitude,
      lat: location.latitude,
      ver: 1,
    });

    const params = new URLSearchParams({
      postStr,
      type: 'geocode',
    });

    const payload = await requestWithSchema(
      apiClient.get(`${this.GEOCODING_PROXY_PATH}/geocoder?${params.toString()}`),
      TiandituGeocoderResponseSchema
    );

    if (payload.status !== '0' || !payload.result) {
      return {
        address: '',
        location,
        components: {},
      };
    }

    const result = payload.result;
    const addressComponent = result.addressComponent || {};

    return {
      address: result.formatted_address || '',
      location,
      components: {
        country: '中国',
        province: addressComponent.province,
        city: addressComponent.city,
        district: addressComponent.county,
      },
    };
  }
}
