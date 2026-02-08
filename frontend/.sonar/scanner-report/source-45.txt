
import { Marker, useMapEvents } from 'react-leaflet';

import type { MapPOI } from './types';

// LocationMarker 组件
interface LocationMarkerProps {
  isPotaPark: boolean;
  mapPOIs: MapPOI[];
  updateFormState: (
    state: Partial<Record<string, string | boolean | [number, number] | number | string[]>>
  ) => void;
  latitude: string;
  longitude: string;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({
  isPotaPark,
  mapPOIs,
  updateFormState,
  latitude,
  longitude,
}) => {
  useMapEvents({
    click(e) {
      // 如果有地图搜索结果,不允许点击修改位置
      if (isPotaPark || mapPOIs.length > 0) return;
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      updateFormState({ latitude: String(lat), longitude: String(lon) });
      // 移除 setMapCenter 调用，不重置地图中心
    },
  });

  // 显示手动选择的标记（当没有地图搜索结果时）
  if (mapPOIs.length === 0) {
    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    return <Marker position={[lat, lon]} />;
  }

  return null;
};

export default LocationMarker;
