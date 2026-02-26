import { TileLayer } from 'react-leaflet';
import { ServiceFactory } from '../services/ServiceFactory';
import { TileProviderType } from '../services/map/types';

export function UnifiedTileLayer() {
  const mapService = ServiceFactory.createMapService();
  const tileConfig = mapService.getTileConfig();

  return (
    <>
      <TileLayer
        url={tileConfig.url}
        attribution={tileConfig.attribution}
        maxZoom={tileConfig.maxZoom}
        minZoom={tileConfig.minZoom}
        tileSize={tileConfig.tileSize}
      />
      {tileConfig.provider === TileProviderType.Tianditu && tileConfig.overlayUrl && (
        <TileLayer
          url={tileConfig.overlayUrl}
          maxZoom={tileConfig.maxZoom}
          minZoom={tileConfig.minZoom}
          tileSize={tileConfig.tileSize}
        />
      )}
    </>
  );
}
