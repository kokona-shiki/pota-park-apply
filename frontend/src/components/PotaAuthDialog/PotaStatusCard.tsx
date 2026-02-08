// src/components/PotaAuthDialog/PotaStatusCard.tsx
import { Card, CardContent, Stack, Typography, Chip, Divider, Button, Alert, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import type { PotaStatus } from '../../../shared/schemas/pota';

interface PotaStatusCardProps {
  status: PotaStatus | null;
  loading: boolean;
  onDisconnect: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

function formatExpiresAt(expiresAt: string | null) {
  if (!expiresAt) return '-';
  const date = new Date(expiresAt);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function PotaStatusCard({ status, loading, onDisconnect, onConnect, onDisconnect }: PotaStatusCardProps) {
  if (loading) {
    return <Alert severity="info">正在加载连接状态...</Alert>;
  }

  if (!status) {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {status.connected ? (
              <>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">已连接 POTA</Typography>
                <Chip label="已连接" color="success" size="small" />
              </>
            ) : (
              <>
                <LinkOffIcon color="disabled" />
                <Typography variant="h6">未连接 POTA</Typography>
                <Chip label="未连接" color="default" size="small" />
              </>
            )}
          </Stack>

          {status.connected && status.expiresAt && (
            <>
              <Divider />
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Token 过期时间：{formatExpiresAt(status.expiresAt)}
                </Typography>
                {status.willExpireSoon && (
                  <Alert severity="info" variant="outlined">
                    Token 即将过期，系统会自动刷新
                  </Alert>
                )}
              </Stack>
            </>
          )}

          <Divider />
          <Stack direction="row" spacing={2}>
            {status.connected ? (
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={onDisconnect}
                disabled={loading}
                fullWidth
              >
                断开 POTA
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<LinkOffIcon />}
                onClick={onConnect}
                disabled={loading}
                fullWidth
              >
                连接 POTA
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default PotaStatusCard;