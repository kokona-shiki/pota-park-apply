// src/pages/AdminPanel.tsx
import { useState, useEffect, useContext } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Switch,
  Typography,
  Button
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from '../App';

const ROLE_OPTIONS = [
  { value: 'user', label: '普通用户' },
  { value: 'park_reviewer', label: '地图审核员' },
  { value: 'pota_representative', label: 'POTA地图代表' },
  { value: 'system_admin', label: '系统管理员' },
  { value: 'banned', label: '封禁用户(可登录但权限受限)' }
];

function AdminPanel() {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.users || []);
    } catch (e: any) {
      alert(e?.response?.data?.error || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (targetUser: any, newRole: string) => {
    const reason = window.prompt('请输入修改角色理由（必填）');
    if (!reason || !reason.trim()) {
      alert('必须填写理由');
      return;
    }

    try {
      const res = await axios.put(`/api/users/${targetUser.id}/role`, { role: newRole, reason });
      const updated = res.data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(e?.response?.data?.error || '修改角色失败');
    }
  };

  const handleActiveChange = async (targetUser: any, isActive: boolean) => {
    try {
      const res = await axios.put(`/api/users/${targetUser.id}/active`, { isActive });
      const updated = res.data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(e?.response?.data?.error || '封禁/解封失败');
    }
  };

  return (
    <div>
      <Typography variant="h6">系统管理员面板</Typography>
      <Button sx={{ mt: 1, mb: 1 }} variant="outlined" onClick={loadUsers} disabled={loading}>
        刷新列表
      </Button>

      <Paper sx={{ mt: 2 }}>
        <Typography sx={{ p: 2 }}>用户列表</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>呼号</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>启用</TableCell>
                <TableCell>最后登录</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const roleSelectDisabled = isSelf || !u.is_active;

                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.callsign}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={u.role}
                        disabled={roleSelectDisabled}
                        onChange={(e) => handleRoleChange(u, e.target.value as string)}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <MenuItem key={r.value} value={r.value}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!u.is_active} disabled={isSelf} onChange={(e) => handleActiveChange(u, e.target.checked)} />
                    </TableCell>
                    <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}

export default AdminPanel;
