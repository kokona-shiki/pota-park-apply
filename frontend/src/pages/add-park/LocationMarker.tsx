import { Marker, useMapEvents } from 'react-leaflet';

import type { MapPOI } from './types';
import { useReverseGeocode } from './useReverseGeocode';

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
  const { fetchProvince } = useReverseGeocode();

  useMapEvents({
    async click(e) {
      if (isPotaPark || mapPOIs.length > 0) return;

      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      updateFormState({ latitude: String(lat), longitude: String(lon) });

      const provinceCode = await fetchProvince(lat, lon);
      if (provinceCode) {
        updateFormState({ province: provinceCode, provinces: [provinceCode] });
      }
    },
  });

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
