import type { MouseEvent } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { ParkApplication, TableColumnConfig, Order, OrderBy } from '../types/parkApplication';
import TableHeader from './ParkApplicationTable/TableHeader';
import ParkAppTableRow from './ParkApplicationTable/TableRow';

interface ParkApplicationTableProps {
  applications: ParkApplication[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order?: Order;
  orderBy?: OrderBy;
  onRequestSort?: (event: MouseEvent<unknown>, property: OrderBy) => void;
  columnConfig: TableColumnConfig;
  onDetailClick: (app: ParkApplication) => void;
  onFlowClick?: (app: ParkApplication) => void;
  onReviewClick?: (app: ParkApplication) => void;
  emptyMessage?: string;
  searchQuery?: string;
}

function getColSpan(showApplicantCallsign: boolean, showActions: boolean) {
  return 5 + (showApplicantCallsign ? 1 : 0) + (showActions ? 1 : 0);
}

function getOnReviewClick(
  showReviewButton: boolean,
  appStatus: string,
  onReviewClick?: (app: ParkApplication) => void
) {
  return showReviewButton && appStatus === 'pending' ? onReviewClick : undefined;
}

function EmptyState({
  colSpan,
  emptyMessage,
  searchQuery,
}: {
  colSpan: number;
  emptyMessage: string;
  searchQuery?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 8 }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
        {searchQuery && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            关键词：{searchQuery}
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ParkApplicationTable({
  applications,
  loading,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  order = 'desc',
  orderBy = 'created_at',
  onRequestSort,
  columnConfig,
  onDetailClick,
  onFlowClick,
  onReviewClick,
  emptyMessage = '暂无符合条件的申请',
  searchQuery,
}: ParkApplicationTableProps) {
  const pagedApps = applications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const showApplicantCallsign = columnConfig.showApplicantCallsign ?? false;
  const showActions = columnConfig.showActions ?? false;
  const showReviewButton = columnConfig.showReviewButton ?? false;

  const colSpan = getColSpan(showApplicantCallsign, showActions);

  return (
    <>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader size="small" aria-label="申请列表" sx={{ minWidth: 800 }}>
          <TableHeader
            order={order}
            orderBy={orderBy}
            onRequestSort={onRequestSort}
            showApplicantCallsign={showApplicantCallsign}
            showActions={showActions}
          />

          <TableBody>
            {!loading && pagedApps.length === 0 ? (
              <EmptyState
                colSpan={colSpan}
                emptyMessage={emptyMessage}
                searchQuery={searchQuery}
              />
            ) : (
              pagedApps.map((app) => (
                <ParkAppTableRow
                  key={app.id}
                  app={app}
                  showApplicantCallsign={showApplicantCallsign}
                  showActions={showActions}
                  onDetailClick={onDetailClick}
                  onFlowClick={onFlowClick}
                  onReviewClick={getOnReviewClick(showReviewButton, app.status, onReviewClick)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={applications.length}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="每页行数"
      />
    </>
  );
}
