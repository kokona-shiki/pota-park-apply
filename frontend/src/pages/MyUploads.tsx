// src/pages/MyUploads.tsx
import { useState, useEffect, useRef, useContext } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from '../App';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

type ParkApplication = {
  id: number;
  dx_entity: string;
  park_name: string;
  province_name: string;
  status: ApplicationStatus;
  created_at: string;

  rejection_reason?: string | null;
  pota_notes?: string | null;
};

function MyUploads() {
  const { user, isAuthLoading } = useContext(AuthContext);

  const [uploads, setUploads] = useState<ParkApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRequestedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  // 只在用户 ID 真正变化时才重置请求标志
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (currentUserId !== userIdRef.current) {
      userIdRef.current = currentUserId;
      hasRequestedRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    // 等待认证加载完成，且用户已登录时才发起请求
    if (isAuthLoading || !user) return;

    // 使用 ref 确保组件挂载时只请求一次
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get('/api/my-applications');
        setUploads(res.data?.applications || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || '获取我的上传失败');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthLoading, user]);

  const getRowBackgroundColor = (app: ParkApplication) => {
    if (app.status === 'pota_synced') return '#c8e6c9';
    if (app.status === 'rejected') return '#ffcdd2';
    if (app.status === 'pending') return '#fff9c4';
    if (app.status === 'approved') return '#ffe0b2';
    return '';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        我的上传
      </Typography>

      {loading && <Typography sx={{ mb: 2, color: 'text.secondary' }}>加载中...</Typography>}
      {error && (
        <Typography sx={{ mb: 2 }} color="error">
          {error}
        </Typography>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>上传时间</TableCell>
              <TableCell>POTA编号</TableCell>
              <TableCell>省份</TableCell>
              <TableCell>公园名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>是否上传POTA</TableCell>
              <TableCell>备注</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uploads.map((app) => (
              <TableRow key={app.id} sx={{ backgroundColor: getRowBackgroundColor(app) }}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && uploads.length === 0 && (
        <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>您还没有上传任何公园申请</Typography>
      )}
    </Paper>
  );
}

export default MyUploads;
