// src/components/ParkApplicationDetailDialog/DialogContent.tsx
import { Box, Divider, Alert, Typography, LinearProgress } from '@mui/material';
import { MapContainer, Marker } from 'react-leaflet';
import { UnifiedTileLayer } from '../UnifiedTileLayer';
import ResetViewControl from '../ResetViewControl';
import ParkInfoHeader from './ParkInfoHeader';
import ParkInfoFields from './ParkInfoFields';
import type { ParkApplication } from '../../types/parkApplication';
import { toFiniteNumber, formatDateTime } from '../../utils/parkApplication';
import type { LatLngTuple } from '../../types/leaflet';
import { DEFAULT_DETAIL_MAP_ZOOM } from '../../constants/map';

interface DialogContentProps {
  application: ParkApplication;
  mode: 'detail' | 'review';
  loading: boolean;
  error: string | null;
}

function DialogContent({
  application,
  mode,
  loading,
  error,
}: DialogContentProps) {
  const lat = toFiniteNumber(application.latitude);
  const lon = toFiniteNumber(application.longitude);
  const hasCoordinates = lat !== null && lon !== null;
  const center: LatLngTuple | null = hasCoordinates ? [lat, lon] : null;

  return (
    <>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box>
        <ParkInfoHeader application={application} mode={mode} />

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          申请编号：{String(application.id)} |
          {application.applicant_callsign ? `申请者：${application.applicant_callsign} | ` : ''}
          申请时间：{formatDateTime(application.created_at)}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <ParkInfoFields application={application} />

        {hasCoordinates && center && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                地图
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  height: 320,
                  width: '100%',
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <MapContainer
                  key={`detail-map-${application.id}`}
                  center={center}
                  zoom={DEFAULT_DETAIL_MAP_ZOOM}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <UnifiedTileLayer />
                  <Marker position={center} />
                  <ResetViewControl center={center} zoom={DEFAULT_DETAIL_MAP_ZOOM} />
                </MapContainer>
              </Box>
            </Box>
          </>
        )}

        {!hasCoordinates && (
          <>
            <Divider sx={{ my: 2 }} />
            <Alert severity="warning" variant="outlined">
              缺少经纬度，无法显示地图
            </Alert>
          </>
        )}
      </Box>
    </>
  );
}

export default DialogContent;