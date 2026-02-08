// src/components/ParkApplicationDetailDialog/ParkInfoHeader.tsx
import { Stack, Typography, Chip } from '@mui/material';
import { getStatusMeta } from '../../../utils/parkApplication';
import type { ParkApplicationDetail } from '../../../types/parkApplication';

interface ParkInfoHeaderProps {
  application: ParkApplicationDetail;
  mode: 'detail' | 'review';
}

function ParkInfoHeader({ application, mode }: ParkInfoHeaderProps) {
  const statusMeta = getStatusMeta(application.status);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ sm: 'center' }}
      gap={1}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, minWidth: 0 }}
        noWrap
        title={application.park_name}
      >
        {application.park_name}
      </Typography>
      <Chip size="small" label={statusMeta.label} color={statusMeta.color} />
    </Stack>
  );
}

export default ParkInfoHeader;