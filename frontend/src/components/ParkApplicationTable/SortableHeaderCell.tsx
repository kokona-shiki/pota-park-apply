// src/components/ParkApplicationTable/SortableHeaderCell.tsx
import { TableCell, TableSortLabel } from '@mui/material';
import type { Order, OrderBy } from '../../types/parkApplication';

interface SortableHeaderCellProps {
  label: string;
  orderBy: OrderBy;
  currentOrderBy: OrderBy;
  order: Order;
  width: number;
  minWidth?: number;
  onSort: (event: React.MouseEvent<unknown>, property: OrderBy) => void;
  sx?: Record<string, unknown>;
}

function SortableHeaderCell({
  label,
  orderBy,
  currentOrderBy,
  order,
  width,
  minWidth,
  onSort,
  sx,
}: SortableHeaderCellProps) {
  return (
    <TableCell
      variant="head"
      sx={{
        whiteSpace: 'nowrap',
        width,
        minWidth,
        backgroundColor: 'background.paper',
        fontWeight: 600,
        ...sx,
      }}
    >
      <TableSortLabel
        active={currentOrderBy === orderBy}
        direction={currentOrderBy === orderBy ? order : 'asc'}
        onClick={(e) => onSort(e, orderBy)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

export default SortableHeaderCell;