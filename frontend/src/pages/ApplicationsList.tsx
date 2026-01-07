// src/pages/ApplicationsList.tsx
import { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box
} from '@mui/material';
import axios from 'axios';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

type ParkApplication = {
  id: number;
  dx_entity: string;
  park_name: string;
  province_name: string;
  status: ApplicationStatus;
  created_at: string;

  applicant_callsign: string;

  rejection_reason?: string | null;
  pota_notes?: string | null;
  pota_synced_at?: string | null;
};

function ApplicationsList() {
  const [applications, setApplications] = useState<ParkApplication[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get('/api/park-applications');
        setApplications(res.data?.applications || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || '获取申请列表失败');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return app.status === 'pending';
    if (filter === 'approved') return app.status === 'approved';
    if (filter === 'rejected') return app.status === 'rejected';
    if (filter === 'uploaded') return app.status === 'pota_synced';
    return true;
  });

  const getRowBackgroundColor = (app: ParkApplication) => {
    if (app.status === 'pota_synced') return '#c8e6c9'; // 绿色 - 已上传
    if (app.status === 'rejected') return '#ffcdd2'; // 红色 - 未通过
    if (app.status === 'pending') return '#fff9c4'; // 黄色 - 待审核
    if (app.status === 'approved') return '#ffe0b2'; // 橙色 - 已通过待上传
    return '';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        申请列表（管理员专用）
      </Typography>

      {loading && <Typography sx={{ mb: 2, color: 'text.secondary' }}>加载中...</Typography>}
      {error && (
        <Typography sx={{ mb: 2 }} color="error">
          {error}
        </Typography>
      )}

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>筛选状态</InputLabel>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as string)}>
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="pending">待审核</MenuItem>
            <MenuItem value="approved">已通过</MenuItem>
            <MenuItem value="rejected">未通过</MenuItem>
            <MenuItem value="uploaded">已上传POTA</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>申请者呼号</TableCell>
              <TableCell>申请时间</TableCell>
              <TableCell>POTA编号</TableCell>
              <TableCell>省份</TableCell>
              <TableCell>公园名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>是否上传POTA</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApps.map((app) => (
              <TableRow key={app.id} sx={{ backgroundColor: getRowBackgroundColor(app) }}>
                <TableCell>{app.applicant_callsign}</TableCell>
                <TableCell>{new Date(app.created_at).toLocaleString()}</TableCell>
                <TableCell>{app.dx_entity}</TableCell>
                <TableCell>{app.province_name}</TableCell>
                <TableCell>{app.park_name}</TableCell>
                <TableCell>
                  {app.status === 'pending' && '待审核'}
                  {app.status === 'approved' && '已通过（待上传）'}
                  {app.status === 'pota_synced' && '已上传 POTA'}
                  {app.status === 'rejected' && '未通过'}
                </TableCell>
                <TableCell>{app.status === 'pota_synced' ? '是' : '否'}</TableCell>
                <TableCell>{app.rejection_reason || app.pota_notes || '-'}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" sx={{ mr: 1 }} disabled>
                    详情 / 审核
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && filteredApps.length === 0 && (
        <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>暂无符合条件的申请</Typography>
      )}
    </Paper>
  );
}

export default ApplicationsList;
