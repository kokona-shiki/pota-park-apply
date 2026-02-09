// src/components/ParkApplicationTable/StatusCell.tsx
import { TableCell, Chip } from '@mui/material';

interface StatusCellProps {
  statusMeta: {
    label: string;
    color: 'warning' | 'info' | 'success' | 'error' | 'default';
  };
}

function StatusCell({ statusMeta }: StatusCellProps) {
  return (
    <TableCell
      sx={{
        whiteSpace: 'nowrap',
        width: 100,
      }}
    >
      <Chip label={statusMeta.label} size="small" color={statusMeta.color} />
    </TableCell>
  );
}

export default StatusCell;