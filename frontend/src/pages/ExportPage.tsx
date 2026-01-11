// src/pages/ExportPage.tsx
import { Button } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';

type ExportType = 'csv' | 'kml';
type ExportScope = 'self' | 'all';

function ExportPage() {
  const { user } = useAuth();
  // 系统管理员不能访问此页面（已在路由层面保护）
  const isAdmin =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative';

  const handleExport = (type: ExportType, scope: ExportScope) => {
    axios
      .get(`/api/export/${type}?scope=${scope}`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `parks.${type}`);
        document.body.appendChild(link);
        link.click();
      });
  };

  return (
    <div>
      <Button onClick={() => handleExport('csv', 'self')}>导出自己的CSV</Button>
      <Button onClick={() => handleExport('kml', 'self')}>导出自己的KML</Button>
      {isAdmin && (
        <>
          <Button onClick={() => handleExport('csv', 'all')}>导出全部CSV</Button>
          <Button onClick={() => handleExport('kml', 'all')}>导出全部KML</Button>
        </>
      )}
    </div>
  );
}

export default ExportPage;
