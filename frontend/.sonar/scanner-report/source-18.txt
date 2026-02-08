// src/components/ParkApplicationTable.tsx
import type { MouseEvent } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ParkApplication, TableColumnConfig } from '../types/parkApplication';
import { formatDateTime, getStatusMeta, truncateText } from '../utils/parkApplication';
import regionData from '../../../shared/region.json';

type Order = 'asc' | 'desc';
type OrderBy = 'created_at' | 'park_name' | 'province_name' | 'status';

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
  // 计算分页数据
  const pagedApps = applications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // 处理排序
  const handleRequestSort = (event: MouseEvent<unknown>, property: OrderBy) => {
    if (onRequestSort) {
      onRequestSort(event, property);
    }
  };

  // 计算列数（用于空状态显示）
  let colSpan = 5; // 申请时间、省份、公园名称、状态、同步到POTA
  if (columnConfig.showApplicantCallsign) colSpan += 1;
  colSpan += 1; // 备注
  if (columnConfig.showActions) colSpan += 1;

  return (
    <>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader size="small" aria-label="申请列表" sx={{ minWidth: 800 }}>
          <TableHead>
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

              {columnConfig.showApplicantCallsign && (
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

              {columnConfig.showActions && (
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
          </TableHead>

          <TableBody>
            {!loading && pagedApps.length === 0 ? (
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
            ) : (
              pagedApps.map((app) => {
                const statusMeta = getStatusMeta(app.status);
                const notes = app.rejection_reason || app.pota_notes || '';
                const notesPreview = truncateText(notes, 24);
                const showNotesTooltip = !!notes && notesPreview !== notes;

                return (
                  <TableRow
                    key={app.id}
                    hover
                    sx={{
                      height: 'auto',
                      '& td': {
                        py: 1.5,
                      },
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', width: 160 }}>
                      {formatDateTime(app.created_at)}
                    </TableCell>

                    {columnConfig.showApplicantCallsign && (
                      <TableCell
                        sx={{
                          display: { xs: 'none', sm: 'table-cell' },
                          whiteSpace: 'nowrap',
                          width: 140,
                        }}
                      >
                        {app.applicant_callsign || '-'}
                      </TableCell>
                    )}

                    <TableCell sx={{ width: 280, maxWidth: 280, verticalAlign: 'top' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          maxWidth: 280,
                          overflowX: 'auto',
                          '&::-webkit-scrollbar': {
                            display: 'none',
                          },
                          msOverflowStyle: 'none',
                          scrollbarWidth: 'none',
                        }}
                      >
                        {app.provinces && app.provinces.length > 0 ? (
                          (app.provinces as string[]).map((code: string) => {
                            const province = regionData.find(
                              (p: { code: string; name: string }) => p.code === code
                            );
                            return (
                              <Chip
                                key={code}
                                label={`${province ? province.name : ''} (${code})`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            );
                          })
                        ) : (
                          <Typography color="text.secondary">-</Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell sx={{ minWidth: 350 }}>
                      <Tooltip title={app.park_name || ''} placement="top" arrow>
                        <Typography
                          sx={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {app.park_name || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap', width: 100 }}>
                      <Chip
                        size="small"
                        label={statusMeta.label}
                        color={statusMeta.color}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell
                      sx={{
                        display: { xs: 'none', md: 'table-cell' },
                        whiteSpace: 'nowrap',
                        width: 100,
                      }}
                    >
                      {app.status === 'pota_synced' ? '是' : '否'}
                    </TableCell>

                    <TableCell sx={{ width: 200 }}>
                      {notes ? (
                        showNotesTooltip ? (
                          <Tooltip title={notes} placement="top" arrow>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              alignItems="center"
                              sx={{ minWidth: 0 }}
                            >
                              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography noWrap sx={{ color: 'text.secondary', maxWidth: 160 }}>
                                {notesPreview}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        ) : (
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                          >
                            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography noWrap sx={{ color: 'text.secondary', maxWidth: 160 }}>
                              {notesPreview}
                            </Typography>
                          </Stack>
                        )
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>

                    {columnConfig.showActions && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', width: 280 }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          sx={{ justifyContent: 'flex-end', alignItems: { sm: 'center' } }}
                        >
                          {onFlowClick && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => onFlowClick(app)}
                            >
                              流程信息
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onDetailClick(app)}
                          >
                            详情
                          </Button>
                          {columnConfig.showReviewButton &&
                            onReviewClick &&
                            app.status === 'pending' && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => onReviewClick(app)}
                              >
                                审核
                              </Button>
                            )}
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
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
