import type { IMapService } from './map/IMapService';
import { TileProviderType } from './map/types';
import { OSMService } from './map/providers/OSMService';
import { AMapService } from './map/providers/AMapService';
import { TiandituService } from './map/providers/TiandituService';
import { mapConfig } from '../config/mapConfig';

export class ServiceFactory {
  static createMapService(provider?: TileProviderType): IMapService {
    const targetProvider = provider || mapConfig.provider;

    switch (targetProvider) {
      case TileProviderType.OSM:
        return new OSMService();
      case TileProviderType.AMap:
        return new AMapService();
      case TileProviderType.Tianditu:
        return new TiandituService();
      default:
        return new OSMService();
    }
  }
}
