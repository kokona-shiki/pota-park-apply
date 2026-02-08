// src/components/ParkApplicationTable/TableHeader.tsx
import { TableCell, TableRow, TableSortLabel } from '@mui/material';
import type { Order, OrderBy } from '../ParkApplicationTable';

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

  let colSpan = 5;
  if (showApplicantCallsign) colSpan += 1;
  colSpan += 1;
  if (showActions) colSpan += 1;

  return (
    <TableRow>
      <TableCell
        variant="head"
        sx={{
          whiteSpace: 'nowrap',
          width: 160,
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        {onRequestSort ? (
          <TableSortLabel
            active={orderBy === 'created_at'}
            direction={orderBy === 'created_at' ? order : 'asc'}
            onClick={(e) => handleRequestSort(e, 'created_at')}
          >
            申请时间
          </TableSortLabel>
        ) : (
          '申请时间'
        )}
      </TableCell>

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

      <TableCell
        variant="head"
        sx={{
          whiteSpace: 'nowrap',
          width: 280,
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        {onRequestSort ? (
          <TableSortLabel
            active={orderBy === 'province_name'}
            direction={orderBy === 'province_name' ? order : 'asc'}
            onClick={(e) => handleRequestSort(e, 'province_name')}
          >
            省份
          </TableSortLabel>
        ) : (
          '省份'
        )}
      </TableCell>

      <TableCell
        variant="head"
        sx={{
          minWidth: 350,
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        {onRequestSort ? (
          <TableSortLabel
            active={orderBy === 'park_name'}
            direction={orderBy === 'park_name' ? order : 'asc'}
            onClick={(e) => handleRequestSort(e, 'park_name')}
          >
            公园名称
          </TableSortLabel>
        ) : (
          '公园名称'
        )}
      </TableCell>

      <TableCell
        variant="head"
        sx={{
          whiteSpace: 'nowrap',
          width: 100,
          backgroundColor: 'background.paper',
          fontWeight: 600,
        }}
      >
        {onRequestSort ? (
          <TableSortLabel
            active={orderBy === 'status'}
            direction={orderBy === 'status' ? order : 'asc'}
            onClick={(e) => handleRequestSort(e, 'status')}
          >
            状态
          </TableSortLabel>
        ) : (
          '状态'
        )}
      </TableCell>

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