// src/components/UnifiedTileLayer.tsx
import { TileLayer } from 'react-leaflet';
import { ServiceFactory } from '../services/ServiceFactory';

/**
 * 统一的地图瓦片图层组件
 * 使用 mapConfig 统一管理瓦片服务，方便整体替换
 */
export function UnifiedTileLayer() {
  const mapService = ServiceFactory.createMapService();
  const tileConfig = mapService.getTileConfig();

  return (
    <TileLayer
      url={tileConfig.url}
      attribution={tileConfig.attribution}
      maxZoom={tileConfig.maxZoom}
      minZoom={tileConfig.minZoom}
      tileSize={tileConfig.tileSize}
    />
  );
}
