// src/pages/PotaImport.tsx
import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Paper,
  Stack,
  Chip,
  Link,
} from '@mui/material';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/error';
import { useNavigate } from 'react-router-dom';

interface ManualConfirmationPark {
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  locationDesc: string;
  message: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<Record<string, unknown>>;
  needs_manual_confirmation?: ManualConfirmationPark[];
}

function PotaImport() {
  const { user, isAuthLoading } = useAuth();
  const { hasPermission } = usePermission('pota_import');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);

  // 检查用户权限
  const canImport = hasPermission === true;

  // 获取导入权限状态
  const loadStatus = useCallback(async () => {
    if (!user) return;

    try {
      setStatusLoading(true);
      setError(null);
      await axios.get('/api/pota/import-status');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '获取导入权限状态失败'));
    } finally {
      setStatusLoading(false);
    }
  }, [user]);

  // 触发POTA导入
  const handleImport = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await axios.post('/api/pota/import');
      setResult(res.data.results);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'POTA公园导入失败'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          POTA 公园导入
        </Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          此功能用于从 POTA 系统导入中国地区的公园数据。系统会自动检查重复项，仅导入新公园。
        </Typography>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">当前用户角色:</Typography>
            <Chip
              label={canImport ? 'POTA代表' : '普通用户'}
              color={canImport ? 'primary' : 'default'}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">导入权限:</Typography>
            <Chip
              label={canImport ? '有权限' : '无权限'}
              color={canImport ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {statusLoading && <LinearProgress />}

        {!isAuthLoading && user && !canImport && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            您没有权限执行 POTA 公园导入操作。只有 POTA 地图代表角色可以使用此功能。
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!canImport || loading || isAuthLoading || !user}
            sx={{ minWidth: 120 }}
          >
            {loading ? '导入中...' : '开始导入'}
          </Button>

          <Button
            variant="outlined"
            onClick={loadStatus}
            disabled={statusLoading}
            sx={{ minWidth: 120 }}
          >
            {statusLoading ? '加载中...' : '刷新状态'}
          </Button>
        </Stack>

        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
              正在从 POTA 系统获取数据并导入...
            </Typography>
          </Box>
        )}

        {result && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              导入完成!
            </Typography>
            <Typography>总计处理: {result.total} 个公园</Typography>
            <Typography>成功导入: {result.imported} 个</Typography>
            <Typography>跳过已存在: {result.skipped} 个</Typography>
            <Typography>导入错误: {result.errors?.length || 0} 个</Typography>
            {result.needs_manual_confirmation && result.needs_manual_confirmation.length > 0 && (
              <>
                <Typography>
                  需要手动确认类型: {result.needs_manual_confirmation.length} 个
                </Typography>
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  以下公园无法自动识别类型，需要您手动确认：
                </Typography>
                <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/pota-unprocessed');
                    }}
                  >
                    点击此处前往未处理公园页面进行手动确认
                  </Link>
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    maxHeight: 200,
                    overflow: 'auto',
                    bgcolor: 'background.paper',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {result.needs_manual_confirmation.map((park, index) => (
                    <Typography key={index} variant="body2" sx={{ fontSize: '0.8rem' }}>
                      - {park.reference}: {park.name}
                    </Typography>
                  ))}
                </Box>
              </>
            )}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          <strong>注意:</strong> 自动导入任务会在每天凌晨 4 点（UTC+8）自动执行，无需手动操作。
        </Typography>
      </Paper>
    </Box>
  );
}

export default PotaImport;
