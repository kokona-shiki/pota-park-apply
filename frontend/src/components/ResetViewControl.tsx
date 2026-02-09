import { useMap } from 'react-leaflet';
import type { LatLngTuple } from '../types/leaflet';

interface ResetViewControlProps {
  center: LatLngTuple;
  zoom: number;
}

function ResetViewControl({ center, zoom }: ResetViewControlProps) {
  const map = useMap();

  const resetView = () => {
    if (map) {
      map.setView(center, zoom);
    }
  };

  return (
    <div className="leaflet-control leaflet-bar">
      <a
        href="#"
        role="button"
        aria-label="重置视图"
        onClick={(e) => {
          e.preventDefault();
          resetView();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          fontSize: '18px',
          textDecoration: 'none',
          color: '#333',
        }}
      >
        ⟲
      </a>
    </div>
  );
}

export default ResetViewControl;
