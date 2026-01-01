// src/pages/ApplicationsList.tsx
import React, { useState, useEffect } from 'react';
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
  Box,
} from '@mui/material';

function ApplicationsList() {
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // 临时 mock 数据（无后端时使用）
    setApplications([
      {
        id: 1,
        callsign: 'BH1AAA',
        timestamp: '2025-12-10 14:30',
        ip: '192.168.1.100',
        park_name: '北京奥林匹克森林公园',
        status: 'pending',
        pota_uploaded: false,
        remarks: '',
      },
      {
        id: 2,
        callsign: 'BH1BBB',
        timestamp: '2025-12-09 10:15',
        ip: '203.0.113.50',
        park_name: '颐和园',
        status: 'approved',
        pota_uploaded: true,
        reference: 'CN-0001',
        remarks: '已上传，编号 CN-0001',
      },
      {
        id: 3,
        callsign: 'BH1CCC',
        timestamp: '2025-12-08 20:45',
        ip: '10.0.0.88',
        park_name: '某个不存在的公园',
        status: 'rejected',
        pota_uploaded: false,
        remarks: '公园不存在，资料不全',
      },
      {
        id: 4,
        callsign: 'BH1DDD',
        timestamp: '2025-12-11 09:00',
        ip: '172.16.0.55',
        park_name: '香山公园',
        status: 'approved',
        pota_uploaded: false,
        remarks: '已通过，待上传',
      },
    ]);
  }, []);

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return app.status === 'pending';
    if (filter === 'approved') return app.status === 'approved';
    if (filter === 'rejected') return app.status === 'rejected';
    if (filter === 'uploaded') return app.pota_uploaded;
    return true;
  });

  const getRowBackgroundColor = (app: any) => {
    if (app.pota_uploaded) return '#c8e6c9'; // 绿色 - 已上传
    if (app.status === 'rejected') return '#ffcdd2'; // 红色 - 未通过
    if (app.status === 'pending') return '#fff9c4'; // 黄色 - 待审核
    if (app.status === 'approved' && !app.pota_uploaded) return '#ffe0b2'; // 橙色 - 已通过待上传
    return '';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        申请列表（管理员专用）
      </Typography>

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
              <TableCell>IP地址</TableCell>
              <TableCell>公园名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>是否上传POTA</TableCell>
              <TableCell>备注 / 编号</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApps.map((app) => (
              <TableRow key={app.id} sx={{ backgroundColor: getRowBackgroundColor(app) }}>
                <TableCell>{app.callsign}</TableCell>
                <TableCell>{app.timestamp}</TableCell>
                <TableCell>{app.ip}</TableCell>
                <TableCell>{app.park_name}</TableCell>
                <TableCell>
                  {app.status === 'pending' && '待审核'}
                  {app.status === 'approved' && '已通过'}
                  {app.status === 'rejected' && '未通过'}
                </TableCell>
                <TableCell>{app.pota_uploaded ? '是' : '否'}</TableCell>
                <TableCell>{app.remarks || (app.reference ? `编号: ${app.reference}` : '-')}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                    编辑 / 审核
                  </Button>
                  <Button size="small" variant="outlined">
                    发送邮件
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredApps.length === 0 && (
        <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
          暂无符合条件的申请
        </Typography>
      )}
    </Paper>
  );
}

export default ApplicationsList;