// src/pages/UserInfo.tsx
import { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';
import { getRoleDisplayName } from '../utils/roleDisplay';

function UserInfo() {
  const { user, refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRefreshRole = async () => {
    try {
      setLoading(true);
      await refreshSession();
      alert('刷新成功');
    } catch (e: any) {
      alert(getApiErrorMessage(e, '刷新失败'));
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
      <Typography>角色: {getRoleDisplayName(user.role || '')}</Typography>
      <Typography>状态: {user.is_active ? '启用' : '禁用'}</Typography>

      <Button variant="contained" sx={{ mt: 2 }} onClick={handleRefreshRole} disabled={loading}>
        刷新登录态（更新角色）
      </Button>
    </Box>
  );
}

export default UserInfo;
