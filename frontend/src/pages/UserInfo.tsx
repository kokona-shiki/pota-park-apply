// src/pages/UserInfo.tsx
import { useContext, useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { AuthContext } from '../App';

function UserInfo() {
  const { user, refreshSession } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleRefreshRole = async () => {
    try {
      setLoading(true);
      await refreshSession();
      alert('刷新成功');
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || '刷新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Box>
      <Typography>用户ID: {user.id}</Typography>
      <Typography>呼号: {user.callsign}</Typography>
      <Typography>邮箱: {user.email}</Typography>
      <Typography>角色: {user.role}</Typography>
      <Typography>状态: {user.is_active ? '启用' : '禁用'}</Typography>

      <Button variant="contained" sx={{ mt: 2 }} onClick={handleRefreshRole} disabled={loading}>
        刷新登录态（更新角色）
      </Button>
    </Box>
  );
}

export default UserInfo;
