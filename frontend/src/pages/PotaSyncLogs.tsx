import React, { useState, useEffect, useCallback } from 'react';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Chip,
} from '@mui/material';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { z } from 'zod';
import { PotaSyncLogSchema, PotaSyncLogsPayloadSchema } from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import { ParkApplicationDetailDialog } from '../components/ParkApplicationDetailDialog';
import type { ParkApplicationDetail } from '../types/parkApplication';

type PotaSyncLog = z.infer<typeof PotaSyncLogSchema>;

const PotaSyncLogs: React.FC = () => {
  const { user } = useAuth(); // 检查用户权限
  const { hasPermission } = usePermission('pota_import');

  // 检查用户是否有访问权限 - 只有有pota_import权限的用户可以访问
  useEffect(() => {
    // 由于后端已经通过 requirePermission('pota_import') 控制访问，
    // 这里主要是为了提供更好的前端体验
    if (user && !hasPermission) {
      // 如果没有pota_import权限，后端API会返回403
    }
  }, [user, hasPermission]);

  const [logs, setLogs] = useState<PotaSyncLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [openDetailsDialog, setOpenDetailsDialog] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<PotaSyncLog | null>(null);
  const [openParksDialog, setOpenParksDialog] = useState<boolean>(false);
  const [selectedParks, setSelectedParks] = useState<PotaSyncLog['parksImported']>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [openParkDetailDialog, setOpenParkDetailDialog] = useState<boolean>(false);
  const [selectedParkDetail, setSelectedParkDetail] = useState<ParkApplicationDetail | null>(null);

  // 获取日志列表
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | null> = {
        page,
        pageSize,
      };

      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }
      if (operationType) {
        params.operationType = operationType;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const payload = await requestWithSchema(
        apiClient.get('/api/pota/sync-logs', { params }),
        PotaSyncLogsPayloadSchema
      );

      setLogs(payload.data);
      setTotalLogs(payload.pagination.total);
      setTotalPages(payload.pagination.totalPages);
    } catch (err) {
      setError('获取同步日志失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, startDate, endDate, operationType, searchTerm]);

  // 使用 useOnceOnMount 替换 useEffect，防止在 StrictMode 下重复执行
  useOnceOnMount(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 处理分页改变
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // 处理查看日志详情
  const handleViewDetails = (log: PotaSyncLog) => {
    setSelectedLog(log);
    setOpenDetailsDialog(true);
  };

  // 处理查看公园列表
  const handleViewParks = (parks: PotaSyncLog['parksImported']) => {
    setSelectedParks(parks);
    setOpenParksDialog(true);
  };

  // 处理查看公园详情
  const handleViewParkDetail = (park: PotaSyncLog['parksImported'][number]) => {
    // 创建一个模拟的公园数据结构用于详情显示
    const parkDetail: ParkApplicationDetail = {
      id: parseInt(park.reference.replace(/[^0-9]/g, ''), 10) || 0, // 提取数字部分作为ID
      park_name: park.name,
      park_type: null, // 这里可能需要从其他地方获取
      province_name: 'CN', // 使用默认值
      provinces: [],
      status: 'pending', // 使用默认值
      created_at: selectedLog?.createdAt || '',
      latitude: undefined,
      longitude: undefined,
      website: undefined,
      description: park.reason || '无描述',
      rejection_reason: park.reason || null,
      pota_notes: `状态: ${park.status}${park.reason ? `, 原因: ${park.reason}` : ''}`,
      pota_synced_at: selectedLog?.syncDate || null,
    };

    setSelectedParkDetail(parkDetail);
    setOpenParkDetailDialog(true);
  };

  // 定义列
  const columns: GridColDef<PotaSyncLog>[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
    },
    {
      field: 'operator',
      headerName: '操作人',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'operationType',
      headerName: '操作类型',
      width: 120,
      renderCell: (params: GridRenderCellParams<PotaSyncLog, PotaSyncLog['operationType']>) => (
        <Chip
          label={params.value === 'auto' ? '自动' : '手动'}
          color={params.value === 'auto' ? 'info' : 'primary'}
          size="small"
        />
      ),
    },
    {
      field: 'syncDate',
      headerName: '同步时间',
      width: 180,
      valueFormatter: (params) => {
        if (!params.value) return '';
        // 简单格式化日期
        return new Date(params.value).toLocaleString('zh-CN');
      },
    },
    {
      field: 'status',
      headerName: '状态',
      width: 120,
      renderCell: (params: GridRenderCellParams<PotaSyncLog, PotaSyncLog['status']>) => {
        let color: 'success' | 'warning' | 'error' | 'default' = 'success';
        let label = '';

        switch (params.value) {
          case 'success':
            color = 'success';
            label = '成功';
            break;
          case 'partial_success':
            color = 'warning';
            label = '部分成功';
            break;
          case 'failed':
            color = 'error';
            label = '失败';
            break;
          default:
            color = 'default';
            label = String(params.value);
        }

        return <Chip label={label} color={color} size="small" />;
      },
    },
    {
      field: 'parksImported',
      headerName: '导入公园数',
      width: 120,
      valueFormatter: (params) => {
        if (!Array.isArray(params.value)) return 0;
        return params.value.length;
      },
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      renderCell: (params: GridRenderCellParams<PotaSyncLog>) => (
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleViewParks(params.row.parksImported)}
          >
            导入公园列表
          </Button>
          <Button variant="outlined" size="small" onClick={() => handleViewDetails(params.row)}>
            详情
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom>
        POTA 同步日志
      </Typography>

      {error && (
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      )}

      <Box display="flex" gap={2} mb={3} alignItems="end">
        <TextField
          label="开始日期"
          type="date"
          size="small"
          value={startDate || ''}
          onChange={(e) => setStartDate(e.target.value || null)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />
        <TextField
          label="结束日期"
          type="date"
          size="small"
          value={endDate || ''}
          onChange={(e) => setEndDate(e.target.value || null)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />

        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>操作类型</InputLabel>
          <Select
            value={operationType}
            label="操作类型"
            onChange={(e) => setOperationType(e.target.value)}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="auto">自动</MenuItem>
            <MenuItem value="manual">手动</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="搜索"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 200 }}
        />

        <Button variant="contained" onClick={fetchLogs}>
          搜索
        </Button>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">总计: {totalLogs} 条记录</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small">
            <InputLabel>每页</InputLabel>
            <Select
              value={pageSize.toString()}
              label="每页"
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              sx={{ width: 100 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
          <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
        </Box>
      </Box>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          disableRowSelectionOnClick
        />
      </div>

      {/* 日志详情对话框 */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>POTA 同步日志详情</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box>
              <Typography variant="body1">
                <strong>ID:</strong> {selectedLog.id}
              </Typography>
              <Typography variant="body1">
                <strong>操作人:</strong> {selectedLog.operator}
              </Typography>
              <Typography variant="body1">
                <strong>操作类型:</strong> {selectedLog.operationType === 'auto' ? '自动' : '手动'}
              </Typography>
              <Typography variant="body1">
                <strong>同步时间:</strong> {new Date(selectedLog.syncDate).toLocaleString('zh-CN')}
              </Typography>
              <Typography variant="body1">
                <strong>状态:</strong>{' '}
                {selectedLog.status === 'success'
                  ? '成功'
                  : selectedLog.status === 'partial_success'
                  ? '部分成功'
                  : '失败'}
              </Typography>
              <Typography variant="body1">
                <strong>导入公园数:</strong> {selectedLog.parksImported.length}
              </Typography>
              <Typography variant="body1">
                <strong>详情:</strong> {selectedLog.details}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 公园列表对话框 */}
      <Dialog
        open={openParksDialog}
        onClose={() => setOpenParksDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>导入的公园列表</DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>POTA ID</TableCell>
                  <TableCell>公园名称</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedParks.map((park, index) => (
                  <TableRow key={index}>
                    <TableCell>{park.reference}</TableCell>
                    <TableCell>{park.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          park.status === 'success'
                            ? '已导入'
                            : park.status === 'failed'
                            ? `未导入 (${park.reason || '未知原因'})`
                            : `跳过 (${park.reason || '未知原因'})`
                        }
                        color={
                          park.status === 'success'
                            ? 'success'
                            : park.status === 'failed'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewParkDetail(park)}
                      >
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParksDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 公园详情对话框 */}
      {selectedParkDetail && (
        <ParkApplicationDetailDialog
          open={openParkDetailDialog}
          onClose={() => setOpenParkDetailDialog(false)}
          application={selectedParkDetail}
        />
      )}
    </Container>
  );
};

export default PotaSyncLogs;
