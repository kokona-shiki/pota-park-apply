// src/components/ParkApplicationDetailDialog/ParkMap.tsx
import { MapContainer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import type { ParkApplicationDetail } from '../../../types/parkApplication';
import { UnifiedTileLayer } from '../UnifiedTileLayer';
import { ResetViewControl } from '../ParkApplicationDetailDialog';

interface ParkMapProps {
  application: ParkApplicationDetail;
  center: [number, number] | null;
}

function ParkMap({ application, center }: ParkMapProps) {
  if (!center) return null;

  const lat = Number.parseFloat(String(application.latitude));
  const lon = Number.parseFloat(String(application.longitude));

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '300px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <UnifiedTileLayer />
      {center && <Marker position={center} />}
      <ResetViewControl center={center} zoom={13} />
    </MapContainer>
  );
}

export default ParkMap;