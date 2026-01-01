// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Select,
  MenuItem,
  Switch,
  Typography,   // ← 新增这一行
} from '@mui/material';
import axios from 'axios';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [applyOpen, setApplyOpen] = useState(true);

useEffect(() => {
    // 前端开发阶段临时 mock 数据
    setUsers([
      { id: 1, username: '系统管理员', callsign: 'BH1AAA', user_group: 'sysadmin', disabled: false, last_logins: ['192.168.1.1'] },
      { id: 2, username: '北京管理员', callsign: 'BH1BBB', user_group: 'admin', disabled: false, last_logins: ['203.0.113.5'] },
      { id: 3, username: '普通用户', callsign: 'BH1CCC', user_group: 'user', disabled: true, last_logins: [] },
    ]);

    setAdmins([
      { id: 1, username: '北京管理员', managed_regions: ['CN-BJ', 'CN-TJ'] },
      { id: 2, username: '新疆管理员', managed_regions: ['CN-XJ'] },
    ]);

    setApplyOpen(true);
  }, []);

  const handleUserUpdate = (id, field, value) => {
    axios.patch(`/api/user/${id}`, { [field]: value });
  };

  const handleAdminRegions = (id, regions) => {
    axios.patch(`/api/admin/${id}`, { managed_regions: regions });
  };

  const handleToggleApply = () => {
    setApplyOpen(!applyOpen);
    // PATCH to server
  };

  return (
    <div>
      <Switch checked={applyOpen} onChange={handleToggleApply} /> 申请入口开启
      <Paper sx={{ mt: 2 }}>
        <Typography>用户列表</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>用户名</TableCell>
                <TableCell>用户组</TableCell>
                <TableCell>禁用</TableCell>
                <TableCell>最后5次IP</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Select value={u.user_group} onChange={(e) => handleUserUpdate(u.id, 'user_group', e.target.value)}>
                      <MenuItem value="user">用户</MenuItem>
                      <MenuItem value="admin">地图管理员</MenuItem>
                      <MenuItem value="sysadmin">系统管理员</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.disabled} onChange={(e) => handleUserUpdate(u.id, 'disabled', e.target.checked)} />
                  </TableCell>
                  <TableCell>{u.last_logins.join(', ')}</TableCell>
                  <TableCell><Button>更改密码</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Paper sx={{ mt: 2 }}>
        <Typography>管理员列表</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>用户名</TableCell>
                <TableCell>管理区域</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admins.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.id}</TableCell>
                  <TableCell>{a.username}</TableCell>
                  <TableCell>
                    <Select multiple value={a.managed_regions || []} onChange={(e) => handleAdminRegions(a.id, e.target.value)}>
                      {/* List provinces from region.json */}
                      <MenuItem value="CN-BJ">CN-BJ (北京)</MenuItem>
                      {/* Add more */}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}

export default AdminPanel;