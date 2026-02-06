import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/apiClient';
import { usePermission } from '../hooks/usePermission';
import { safeParseJsonWithSchema } from '../utils/parseJson';
import { z } from 'zod';

const ErrorResponseSchema = z.object({
  message: z.string(),
});

function ExportPage() {
  const { hasPermission } = usePermission('export_parks');
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (type: 'csv' | 'kmz') => {
    try {
      setLoading(type);
      setSuccess(false);
      setError(null);

      const response = await apiClient.get(`/api/export/${type}`, {
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'];

      if (contentType?.includes('application/json')) {
        const errorData = safeParseJsonWithSchema(ErrorResponseSchema, new TextDecoder().decode(response.data));
        setError(errorData?.message || '导出失败');
        setLoading(null);
        return;
      }

      const expectedContentType = type === 'csv' ? 'text/csv' : 'application/vnd.google-earth.kmz';
      if (!contentType?.includes(expectedContentType)) {
        setError(`导出失败：服务器返回了意外的文件类型 (${contentType})`);
        setLoading(null);
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `parks.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setLoading(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('导出失败:', error);
      setError(error instanceof Error ? error.message : '导出失败，请稍后重试');
      setLoading(null);
    }
  };

  if (!hasPermission) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          您没有权限访问此页面
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        导出公园数据
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <DescriptionIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" component="h2">
                  导出全部公园为 KMZ 文件
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  KMZ 文件包含所有公园的地理位置信息，可在 Google Earth 中打开查看
                </Typography>
              </Box>
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              size="large"
              startIcon={loading === 'kmz' ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={() => handleExport('kmz')}
              disabled={loading !== null}
              fullWidth
            >
              {loading === 'kmz' ? '导出中...' : '导出 KMZ 文件'}
            </Button>
          </CardActions>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <DescriptionIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" component="h2">
                  导出全部公园为 CSV 文件
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CSV 文件包含所有公园的详细信息，可在 Excel 中打开查看
                </Typography>
              </Box>
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              size="large"
              startIcon={loading === 'csv' ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={() => handleExport('csv')}
              disabled={loading !== null}
              fullWidth
            >
              {loading === 'csv' ? '导出中...' : '导出 CSV 文件'}
            </Button>
          </CardActions>
        </Card>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          导出成功！文件已开始下载
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
}

export default ExportPage;
