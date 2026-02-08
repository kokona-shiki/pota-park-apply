// src/components/ParkApplicationDetailDialog.tsx
import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import type { ParkApplicationDetail } from '../types/parkApplication';
import { formatDateTime } from '../utils/parkApplication';
import { UnifiedTileLayer } from './UnifiedTileLayer';
import parkTypeMappingData from '../../../shared/park_type_mapping.json';
import type { ParkTypeMapping } from '../../../shared/schemas';
import ParkInfoHeader from './ParkApplicationDetailDialog/ParkInfoHeader';
import ParkInfoFields from './ParkApplicationDetailDialog/ParkInfoFields';
import ParkMap from './ParkApplicationDetailDialog/ParkMap';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

const PARK_TYPE_MAPPING = parkTypeMappingData as ParkTypeMapping;

const PARK_TYPE_BY_ID = new Map(
  [
    ...PARK_TYPE_MAPPING.chinese_to_english,
    ...(PARK_TYPE_MAPPING.pota_only_types || []),
  ].map((item) => [item.id, { zh: item.chineseName, en: item.englishName }])
);

const DEFAULT_DETAIL_MAP_ZOOM = 13;
type LatLngTuple = [number, number];

function getParkTypeWithEnglish(parkType: string | null | undefined): string {
  if (!parkType) return '';

  const typeById = PARK_TYPE_BY_ID.get(parkType);
  if (typeById) {
    return `${typeById.zh} (${typeById.en})`;
  }

  const mapping = PARK_TYPE_MAPPING.english_to_chinese.find(
    (item) => item.englishName === parkType
  );
  if (mapping && mapping.chineseNames.length > 0) {
    return `${mapping.chineseNames[0]} (${parkType})`;
  }

  const chineseMapping = PARK_TYPE_MAPPING.chinese_to_english.find(
    (item) => item.chineseName === parkType
  );
  if (chineseMapping) {
    return `${chineseMapping.chineseName} (${chineseMapping.englishName})`;
  }

  const potaMapping = (PARK_TYPE_MAPPING.pota_only_types || []).find(
    (item) => item.chineseName === parkType
  );
  if (potaMapping) {
    return `${potaMapping.chineseName} (${potaMapping.englishName})`;
  }

  return parkType;
}

function toFiniteNumber(input: unknown): number | null {
  const n = Number.parseFloat(String(input));
  return Number.isFinite(n) ? n : null;
}

function ResetViewControl({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();
  const [lat, lon] = center;

  useEffect(() => {
    const ResetControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', 'leaflet-control-reset-view', container);

        btn.href = '#';
        btn.title = '回位';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', '回位');

        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2" />
            <line x1="9" y1="1.5" x2="9" y2="5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            <line x1="9" y1="13" x2="9" y2="16.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            <line x1="1.5" y1="9" x2="5" y2="9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            <line x1="13" y1="9" x2="16.5" y2="9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            <circle cx="9" cy="9" r="0.9" fill="currentColor" />
          </svg>
        `;

        btn.style.width = '30px';
        btn.style.height = '30px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.lineHeight = 'normal';
        btn.style.color = '#000';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          map.setView([lat, lon], zoom);
        });

        return container;
      },
    });

    const control = new ResetControl({ position: 'bottomright' }) as L.Control;
    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [map, lat, lon, zoom]);

  return null;
}

interface ParkApplicationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  application: ParkApplicationDetail | null;
  loading?: boolean;
  error?: string | null;
  mode?: 'detail' | 'review';
  showReviewForm?: boolean;
  reviewNotes?: string;
  reviewRejectionReason?: string;
  onReviewNotesChange?: (value: string) => void;
  onReviewRejectionReasonChange?: (value: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  reviewSubmitting?: boolean;
}

export function ParkApplicationDetailDialog({
  open,
  onClose,
  application,
  loading = false,
  error = null,
  mode = 'detail',
  showReviewForm = false,
  reviewNotes = '',
  reviewRejectionReason = '',
  onReviewNotesChange,
  onReviewRejectionReasonChange,
  onApprove,
  onReject,
  reviewSubmitting = false,
}: ParkApplicationDetailDialogProps) {
  if (!application) return null;

  const lat = toFiniteNumber(application.latitude);
  const lon = toFiniteNumber(application.longitude);
  const hasCoordinates = lat !== null && lon !== null;
  const center: LatLngTuple | null = hasCoordinates ? [lat, lon] : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'review' ? '审核申请' : '申请详情'}</DialogTitle>
      <DialogContent dividers>
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

          {showReviewForm && mode === 'review' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                <TextField
                  label="审核备注（必填）"
                  value={reviewNotes}
                  onChange={(e) => onReviewNotesChange?.(e.target.value)}
                  multiline
                  minRows={2}
                />
                <TextField
                  label="拒绝原因（拒绝时必填）"
                  value={reviewRejectionReason}
                  onChange={(e) => onReviewRejectionReasonChange?.(e.target.value)}
                  multiline
                  minRows={2}
                />
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={reviewSubmitting}>
          关闭
        </Button>

        {mode === 'review' && showReviewForm && (
          <>
            <Button onClick={onReject} color="error" disabled={reviewSubmitting}>
              拒绝
            </Button>
            <Button onClick={onApprove} variant="contained" disabled={reviewSubmitting}>
              通过
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}