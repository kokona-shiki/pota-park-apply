// src/components/ParkApplicationTable/StatusCell.tsx
import { TableCell, Chip } from '@mui/material';

interface StatusCellProps {
  statusMeta: {
    label: string;
    bgcolor: string;
    color: string;
  };
}

function StatusCell({ statusMeta }: StatusCellProps) {
  return (
    <TableCell
      sx={{
        whiteSpace: 'nowrap',
        width: 100,
        backgroundColor: statusMeta.bgcolor,
        color: statusMeta.color,
      }}
    >
      <Chip
        label={statusMeta.label}
        size="small"
        sx={{
          backgroundColor: statusMeta.bgcolor,
          color: statusMeta.color,
        }}
      />
    </TableCell>
  );
}

export default StatusCell;