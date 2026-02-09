// src/components/ParkApplicationTable/TableHeader.tsx
import { TableCell, TableRow } from '@mui/material';
import type { Order, OrderBy } from '../../types/parkApplication';
import SortableHeaderCell from './SortableHeaderCell';

interface TableHeaderProps {
  order: Order;
  orderBy: OrderBy;
  onRequestSort: (event: React.MouseEvent<unknown>, property: OrderBy) => void;
  showApplicantCallsign: boolean;
  showActions: boolean;
}

function TableHeader({
  order,
  orderBy,
  onRequestSort,
  showApplicantCallsign,
  showActions,
}: TableHeaderProps) {
  const handleRequestSort = (event: React.MouseEvent<unknown>, property: OrderBy) => {
    if (onRequestSort) {
      onRequestSort(event, property);
    }
  };

  return (
    <TableRow>
      <SortableHeaderCell
        label="申请时间"
        orderBy="created_at"
        currentOrderBy={orderBy}
        order={order}
        width={160}
        onSort={handleRequestSort}
      />

      {showApplicantCallsign && (
        <TableCell
          variant="head"
          sx={{
            whiteSpace: 'nowrap',
            width: 140,
            display: { xs: 'none', sm: 'table-cell' },
            backgroundColor: 'background.paper',
            fontWeight: 600,
          }}
        >
          申请者呼号
        </TableCell>
      )}

      <SortableHeaderCell
        label="省份"
        orderBy="province_name"
        currentOrderBy={orderBy}
        order={order}
        width={280}
        onSort={handleRequestSort}
      />

      <SortableHeaderCell
        label="公园名称"
        orderBy="park_name"
        currentOrderBy={orderBy}
        order={order}
        width={350}
        minWidth={350}
        onSort={handleRequestSort}
      />

      <SortableHeaderCell
        label="状态"
        orderBy="status"
        currentOrderBy={orderBy}
        order={order}
        width={100}
        onSort={handleRequestSort}
      />

      <TableCell
        variant="head"
        sx={{
          whiteSpace: 'nowrap',
          width: 100,
          display: { xs: 'none', md: 'table-cell' },
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        同步到 POTA
      </TableCell>

      <TableCell
        variant="head"
        sx={{
          width: 200,
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        备注
      </TableCell>

      {showActions && (
        <TableCell
          variant="head"
          align="right"
          sx={{
            whiteSpace: 'nowrap',
            width: 280,
            backgroundColor: 'background.paper',
            fontWeight: 600,
          }}
        >
          操作
        </TableCell>
      )}
    </TableRow>
  );
}

export default TableHeader;