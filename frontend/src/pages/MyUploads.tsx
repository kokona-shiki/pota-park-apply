// src/pages/MyUploads.tsx
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
} from '@mui/material';

function MyUploads() {
  const [uploads, setUploads] = useState<any[]>([]);

  useEffect(() => {
    // 临时 mock 当前用户的上传记录
    setUploads([
      {
        id: 1,
        timestamp: '2025-12-10 14:30',
        park_name: '北京奥林匹克森林公园',
        status: 'pending',
        pota_uploaded: false,
        remarks: '',
      },
      {
        id: 2,
        timestamp: '2025-12-05 11:20',
        park_name: '颐和园',
        status: 'approved',
        pota_uploaded: true,
        reference: 'CN-0001',
        remarks: '已上传',
      },
      {
        id: 3,
        timestamp: '2025-11-28 18:00',
        park_name: '圆明园遗址公园',
        status: 'rejected',
        pota_uploaded: false,
        remarks: '资料不完整，已驳回',
      },
    ]);
  }, []);

  const getRowBackgroundColor = (app: any) => {
    if (app.pota_uploaded) return '#c8e6c9'; // 绿色
    if (app.status === 'rejected') return '#ffcdd2'; // 红色
    if (app.status === 'pending') return '#fff9c4'; // 黄色
    return '';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        我的上传
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>上传时间</TableCell>
              <TableCell>公园名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>是否上传POTA</TableCell>
              <TableCell>备注</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uploads.map((app) => (
              <TableRow key={app.id} sx={{ backgroundColor: getRowBackgroundColor(app) }}>
                <TableCell>{app.timestamp}</TableCell>
                <TableCell>{app.park_name}</TableCell>
                <TableCell>
                  {app.status === 'pending' && '待审核'}
                  {app.status === 'approved' && '已通过'}
                  {app.status === 'rejected' && '未通过'}
                </TableCell>
                <TableCell>{app.pota_uploaded ? '是' : '否'}</TableCell>
                <TableCell>{app.remarks || (app.reference ? `编号: ${app.reference}` : '-')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {uploads.length === 0 && (
        <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
          您还没有上传任何公园申请
        </Typography>
      )}
    </Paper>
  );
}

export default MyUploads;