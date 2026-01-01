// src/pages/ExportPage.jsx
import React, { useContext } from 'react';
import { Button } from '@mui/material';
import { AuthContext } from '../App';
import axios from 'axios';

function ExportPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = user.user_group === 'admin' || user.user_group === 'sysadmin';

  const handleExport = (type, scope) => {
    axios.get(`/api/export/${type}?scope=${scope}`, { responseType: 'blob' })
      .then(res => {
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