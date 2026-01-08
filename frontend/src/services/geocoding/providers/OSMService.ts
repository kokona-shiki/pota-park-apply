import axios from 'axios';
import { IGeocodingService, GeocodingResult, ReverseGeocodingResult, GeocodingOptions, GeocodingProviderType } from '../types';

export class OSMGeocodingService implements IGeocodingService {
  private readonly PROXY_PATH = '/proxy-api/geocoding/osm'; // 使用后端代理路径

  async geocode(query: string, options: GeocodingOptions = {}): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: String(options.limit || 5),
      addressdetails: '1'
    });

    if (options.language) {
      params.append('accept-language', options.language);
    }

    const response = await axios.get(`${this.PROXY_PATH}/search?${params.toString()}`);

    return response.data.map((item: any) => ({
      address: item.display_name,
      location: {
        latitude: Number.parseFloat(item.lat),
        longitude: Number.parseFloat(item.lon)
      },
      displayName: item.display_name,
      boundingBox: item.boundingbox ? {
        south: Number.parseFloat(item.boundingbox[0]),
        west: Number.parseFloat(item.boundingbox[2]),
        north: Number.parseFloat(item.boundingbox[1]),
        east: Number.parseFloat(item.boundingbox[3])
      } : undefined
    }));
  }

  async reverseGeocode(location: { latitude: number; longitude: number }, options: GeocodingOptions = {}): Promise<ReverseGeocodingResult> {
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      format: 'json',
      addressdetails: '1'
    });

    if (options.language) {
      params.append('accept-language', options.language);
    }

    const response = await axios.get(`${this.PROXY_PATH}/reverse?${params.toString()}`);

    return {
      address: response.data.display_name,
      location,
      components: response.data.address
    };
  }

  getProviderType(): GeocodingProviderType {
    return GeocodingProviderType.OSM;
  }
}
