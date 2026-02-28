// src/pages/add-park/useSearch.ts
import { useState } from 'react';
import { z } from 'zod';
import { PotaLookupItemSchema, PotaParkInfoSchema } from '../../../../shared/schemas/potaExternal';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import type { PotaParkInfo, MapPOI } from './types';
import {
  mapLocationToProvince,
  parseOSMDisplayName,
  getProvinceNameFromCode,
} from '../../utils/potaMapping';
import { buildDisplayName, hasOverlap } from '../../utils/poiNameUtils';
import { ServiceFactory } from '../../services/ServiceFactory';

export const useSearch = () => {
  const [searchingPota, setSearchingPota] = useState(false);
  const [searchingMap, setSearchingMap] = useState(false);

  const handleSearchPOTA = async (parkName: string) => {
    if (!parkName.trim()) {
      throw new Error('请输入公园名称');
    }

    setSearchingPota(true);

    try {
      // 第一步：搜索公园列表
      const searchRes = await requestWithSchema(
        apiClient.get(`/proxy-api/pota/lookup?search=${encodeURIComponent(parkName)}`, {
          timeout: 5000,
        }),
        z.array(PotaLookupItemSchema)
      );

      if (searchRes.length === 0) {
        throw new Error('未找到匹配的 POTA 公园');
      }

      // 第二步：获取所有公园的详细信息
      const parksInfo = await Promise.all(
        searchRes.map(async (item) => {
          try {
            return await requestWithSchema(
              apiClient.get(`/proxy-api/pota/park/${encodeURIComponent(item.value)}`, {
                timeout: 5000,
              }),
              PotaParkInfoSchema
            );
          } catch (err) {
            console.error(`Failed to fetch park ${item.value}:`, err);
            return null;
          }
        })
      );

      const validParks = parksInfo.filter((park): park is PotaParkInfo => park !== null);

      if (validParks.length === 0) {
        throw new Error('未获取到有效的 POTA 公园信息');
      }

      // 转换为 MapPOI 格式
      const pois: MapPOI[] = validParks.map((park) => {
        const provinceCode = mapLocationToProvince(park.locationDesc);
        const provinceName = getProvinceNameFromCode(provinceCode);

        return {
          id: park.parkId, // 使用真正的 parkId 作为唯一标识
          name: park.name,
          displayName: park.name,
          province: provinceName,
          city: '',
          lat: park.latitude,
          lon: park.longitude,
        };
      });

      return { pois, parksMap: new Map(validParks.map((park) => [park.parkId, park])) };
    } finally {
      setSearchingPota(false);
    }
  };

  const handleSearchMap = async (parkName: string) => {
    if (!parkName.trim()) {
      throw new Error('请输入公园名称');
    }

    setSearchingMap(true);

    try {
      const mapService = ServiceFactory.createMapService();
      const results = await mapService.geocode(parkName, { limit: 5 });

      if (!results || results.length === 0) {
        throw new Error('未找到匹配的地点');
      }

      const filteredResults = results.filter((item) =>
        hasOverlap(item.displayName || item.address, parkName)
      );

      if (filteredResults.length === 0) {
        throw new Error('未找到匹配的地点');
      }

      const pois: MapPOI[] = filteredResults.slice(0, 5).map((item, index) => {
        const province = item.province || parseOSMDisplayName(item.displayName || item.address)?.province || '';
        const city = item.city || parseOSMDisplayName(item.displayName || item.address)?.city || '';
        const displayName = buildDisplayName(
          item.displayName || item.address,
          province,
          city
        );

        return {
          id: index,
          name: item.displayName || item.address,
          displayName,
          province,
          city,
          lat: item.location.latitude,
          lon: item.location.longitude,
        };
      });

      return pois;
    } finally {
      setSearchingMap(false);
    }
  };

  return {
    searchingPota,
    searchingMap,
    handleSearchPOTA,
    handleSearchMap,
  };
};
