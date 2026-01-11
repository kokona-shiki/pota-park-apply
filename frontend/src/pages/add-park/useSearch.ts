// src/pages/add-park/useSearch.ts
import { useState } from 'react';
import axios from 'axios';
import type { PotaLookupItem, PotaParkInfo, MapPOI } from './types';
import { mapLocationToProvince, parseOSMDisplayName } from '../../utils/potaMapping';
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
      const searchRes = await axios.get<PotaLookupItem[]>(
        `/proxy-api/pota/lookup?search=${encodeURIComponent(parkName)}`,
        { timeout: 5000 } // 5秒超时
      );

      if (searchRes.data.length === 0) {
        throw new Error('未找到匹配的 POTA 公园');
      }

      // 第二步：获取所有公园的详细信息
      const parksInfo = await Promise.all(
        searchRes.data.map(async (item) => {
          try {
            const parkRes = await axios.get<PotaParkInfo>(
              `/proxy-api/pota/park/${encodeURIComponent(item.value)}`,
              { timeout: 5000 }
            );
            return parkRes.data;
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
        const province = mapLocationToProvince(park.locationDesc);
        const provinceName =
          Object.entries({
            '11': '北京',
            '12': '天津',
            '13': '河北',
            '14': '山西',
            '15': '内蒙古',
            '21': '辽宁',
            '22': '吉林',
            '23': '黑龙江',
            '31': '上海',
            '32': '江苏',
            '33': '浙江',
            '34': '安徽',
            '35': '福建',
            '36': '江西',
            '37': '山东',
            '41': '河南',
            '42': '湖北',
            '43': '湖南',
            '44': '广东',
            '45': '广西',
            '46': '海南',
            '50': '重庆',
            '51': '四川',
            '52': '贵州',
            '53': '云南',
            '54': '西藏',
            '61': '陕西',
            '62': '甘肃',
            '63': '青海',
            '64': '宁夏',
            '65': '新疆',
          }).find(([code]) => code === province)?.[1] || '';

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

      return { pois, parksMap: new Map(validParks.map(park => [park.parkId, park])) };
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
      const results = await mapService.geocode(parkName, { limit: 10 });

      if (!results || results.length === 0) {
        throw new Error('未找到匹配的地点');
      }

      // 转换为 MapPOI 类型
      const pois: MapPOI[] = results.map((item, index) => {
        const parsed = parseOSMDisplayName(item.displayName || item.address);
        return {
          id: index, // 使用索引作为 ID，因为 geocode 结果没有 place_id
          name: item.displayName || item.address,
          displayName: item.displayName || item.address,
          province: parsed?.province || '',
          city: parsed?.city || '',
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