// src/components/ParkApplicationTable/ParkNameCell.tsx
import { Box, Tooltip } from '@mui/material';
import ProvinceChips from './ProvinceChips';

interface ParkNameCellProps {
  provinces: string[] | null;
  parkName: string;
}

function ParkNameCell({ provinces, parkName }: ParkNameCellProps) {
  if (provinces && provinces.length > 0) {
    return <ProvinceChips provinces={provinces} />;
  }

  return (
    <Tooltip title={parkName} arrow>
      <Box sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {parkName}
      </Box>
    </Tooltip>
  );
}

export default ParkNameCell;