import { TileProviderType } from '../services/map/types';

export const getMapProvider = (): 'osm' | 'amap' | 'baidu' | 'tianditu' => {
  const provider = import.meta.env.VITE_MAP_PROVIDER;
  return (provider === 'osm' || provider === 'amap' || provider === 'baidu' || provider === 'tianditu')
    ? provider
    : 'osm';
};

export const mapConfig = {
  provider: getMapProvider() as TileProviderType,
  defaultCenter: {
    latitude: 39.9042,
    longitude: 116.4074,
  },
  defaultZoom: 13,
};
