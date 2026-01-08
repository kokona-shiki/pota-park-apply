import { TileProviderType, GeocodingProviderType } from '../services/map/types';

/**
 * 从环境变量读取地图服务提供商
 * @returns 地图服务提供商 (osm, amap, baidu)
 */
export const getMapProvider = (): 'osm' | 'amap' | 'baidu' => {
  const provider = import.meta.env.VITE_MAP_PROVIDER;
  return (provider === 'osm' || provider === 'amap' || provider === 'baidu')
    ? provider
    : 'osm';
};

/**
 * 当前地图配置
 */
export const mapConfig = {
  tileProvider: getMapProvider() as TileProviderType,
  geocodingProvider: getMapProvider() as GeocodingProviderType,
  defaultCenter: {
    latitude: 39.9042,
    longitude: 116.4074
  },
  defaultZoom: 13
};
