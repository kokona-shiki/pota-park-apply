import { useCallback, useRef } from 'react';
import { ServiceFactory } from '../../services/ServiceFactory';
import { mapConfig } from '../../config/mapConfig';
import { TileProviderType } from '../../services/map/types';
import { getProvinceCodeFromNames } from '../../utils/potaMapping';

const DEBOUNCE_MS = 300;

export const useReverseGeocode = () => {
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProvince = useCallback(
    async (latitude: number, longitude: number): Promise<string | null> => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      return new Promise((resolve) => {
        debounceTimeout.current = setTimeout(async () => {
          try {
            const mapService = ServiceFactory.createMapService();
            const result = await mapService.reverseGeocode(
              { latitude, longitude },
              { language: 'zh' }
            );

            const components = result.components;
            const provider = mapConfig.provider;

            let provinceName = '';
            switch (provider) {
              case TileProviderType.OSM:
                provinceName = components?.state || '';
                break;
              case TileProviderType.Tianditu:
                provinceName = components?.province || '';
                break;
              default:
                provinceName = components?.province || components?.state || '';
            }

            if (provinceName) {
              const provinceCode = getProvinceCodeFromNames(provinceName);
              resolve(provinceCode || null);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        }, DEBOUNCE_MS);
      });
    },
    []
  );

  return { fetchProvince };
};
