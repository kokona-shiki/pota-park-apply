// src/components/ParkApplicationDetailDialog/ParkMap.tsx
import { MapContainer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { UnifiedTileLayer } from '../UnifiedTileLayer';
import { ResetViewControl } from '../ParkApplicationDetailDialog';

interface ParkMapProps {
  center: [number, number] | null;
}

function ParkMap({ center }: ParkMapProps) {
  if (!center) return null;

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