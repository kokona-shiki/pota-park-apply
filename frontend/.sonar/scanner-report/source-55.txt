import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { ExportAuditLogsResponseSchema } from '../../../shared/schemas/export';

type ExportAuditLog = {
  id: number;
  file_type: 'csv' | 'kmz';
  park_count: number;
  exported_by_callsign: string | null;
  created_at: string;
};

const FILE_TYPE_MAP: { [key: string]: string } = {
  'csv': 'CSV 文件',
  'kmz': 'KMZ 文件',
};

function ExportAuditLogs() {
  const [logs, setLogs] = useState<ExportAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await requestWithSchema(
          apiClient.get('/api/export/audit-logs'),
          ExportAuditLogsResponseSchema
        );
        setLogs(response.data?.logs?.map(log => ({
          ...log,
          exported_by_callsign: log.exported_by_callsign ?? null
        })) || []);
      } catch (err) {
        console.error('获取审计日志失败:', err);
        setError('获取审计日志失败');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const columns: GridColDef<ExportAuditLog>[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
    },
    {
      field: 'file_type',
      headerName: '文件类型',
      width: 120,
      valueGetter: (params) => FILE_TYPE_MAP[params.row.file_type] || params.row.file_type,
    },
    {
      field: 'park_count',
      headerName: '公园数量',
      width: 100,
    },
    {
      field: 'exported_by_callsign',
      headerName: '操作用户',
      width: 150,
    },
    {
      field: 'created_at',
      headerName: '导出时间',
      width: 180,
    },
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          加载中...
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        导出审计日志
      </Typography>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={logs}
          columns={columns}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          disableRowSelectionOnClick
          getRowId={(row) => row.id.toString()}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: '每页行数',
              labelDisplayedRows: ({ count }) => `共 ${count} 条`,
            },
          }}
        />
      </Paper>

      {logs.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          暂无导出记录
        </Alert>
      )}
    </Container>
  );
}

export default ExportAuditLogs;
