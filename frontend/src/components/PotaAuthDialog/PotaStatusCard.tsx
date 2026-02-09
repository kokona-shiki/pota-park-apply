import { Card, CardContent, Stack, Typography, Chip, Divider, Button, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import type { PotaStatus } from '../../../../shared/schemas/pota';

interface PotaStatusCardProps {
  status: PotaStatus | null;
  loading: boolean;
  onDisconnect: () => void;
  onConnect: () => void;
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

function getStatusIcon(connected: boolean) {
  return connected ? (
    <CheckCircleIcon color="success" />
  ) : (
    <LinkOffIcon color="disabled" />
  );
}

function getStatusText(connected: boolean) {
  return connected ? '已连接 POTA' : '未连接 POTA';
}

function getStatusChip(connected: boolean) {
  return (
    <Chip label={connected ? '已连接' : '未连接'} color={connected ? 'success' : 'default'} size="small" />
  );
}

function getStatusSection(status: PotaStatus) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      {getStatusIcon(status.connected)}
      <Typography variant="h6">{getStatusText(status.connected)}</Typography>
      {getStatusChip(status.connected)}
    </Stack>
  );
}

function getExpiresSection(status: PotaStatus) {
  if (!status.connected || !status.expiresAt) {
    return null;
  }

  return (
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
  );
}

function getButtonVariant(connected: boolean) {
  return connected ? 'outlined' : 'contained';
}

function getButtonColor(connected: boolean) {
  return connected ? 'error' : 'primary';
}

function getButtonText(connected: boolean) {
  return connected ? '断开 POTA' : '连接 POTA';
}

function getButtonIcon() {
  return <LinkOffIcon />;
}

function getButtonOnClick(connected: boolean, onDisconnect: () => void, onConnect: () => void) {
  return connected ? onDisconnect : onConnect;
}

function getActionButton(connected: boolean, loading: boolean, onDisconnect: () => void, onConnect: () => void) {
  return (
    <Button
      variant={getButtonVariant(connected)}
      color={getButtonColor(connected)}
      startIcon={getButtonIcon()}
      onClick={getButtonOnClick(connected, onDisconnect, onConnect)}
      disabled={loading}
      fullWidth
    >
      {getButtonText(connected)}
    </Button>
  );
}

function getStatusAndExpiresSections(status: PotaStatus) {
  return (
    <>
      {getStatusSection(status)}
      {getExpiresSection(status)}
    </>
  );
}

function ActionSection({ status, loading, onDisconnect, onConnect }: { status: PotaStatus; loading: boolean; onDisconnect: () => void; onConnect: () => void }) {
  return (
    <Stack direction="row" spacing={2}>
      {getActionButton(status.connected, loading, onDisconnect, onConnect)}
    </Stack>
  );
}

function CardContentSection({ status, loading, onDisconnect, onConnect }: { status: PotaStatus; loading: boolean; onDisconnect: () => void; onConnect: () => void }) {
  return (
    <Stack spacing={2}>
      {getStatusAndExpiresSections(status)}
      <Divider />
      <ActionSection status={status} loading={loading} onDisconnect={onDisconnect} onConnect={onConnect} />
    </Stack>
  );
}

function LoadingState() {
  return <Alert severity="info">正在加载连接状态...</Alert>;
}

function EmptyState() {
  return null;
}

function ConnectedState({ status, loading, onDisconnect, onConnect }: { status: PotaStatus; loading: boolean; onDisconnect: () => void; onConnect: () => void }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <CardContentSection status={status} loading={loading} onDisconnect={onDisconnect} onConnect={onConnect} />
      </CardContent>
    </Card>
  );
}

function getCardState(status: PotaStatus | null, loading: boolean, onDisconnect: () => void, onConnect: () => void) {
  if (loading) {
    return <LoadingState />;
  }

  if (!status) {
    return <EmptyState />;
  }

  return <ConnectedState status={status} loading={loading} onDisconnect={onDisconnect} onConnect={onConnect} />;
}

export default function PotaStatusCard({ status, loading, onDisconnect, onConnect }: PotaStatusCardProps) {
  return getCardState(status, loading, onDisconnect, onConnect);
}
