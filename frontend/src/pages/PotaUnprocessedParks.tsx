import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Container,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import parkTypeMapping from '../../../shared/park_type_mapping.json';
import regionMapping from '../../../shared/region.json';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import axios from 'axios';

interface UnprocessedPark {
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  locationDesc: string;
  grid: string;
  attempts: number;
  activations: number;
  qsos: number;
  message: string;
  suggestedType?: string | null;
  manualType?: string | null;
}

const PotaUnprocessedParks: React.FC = () => {
  const { user, accessToken } = useAuth();
  const { hasPermission: hasPotaPermission, loading: permissionLoading } =
    usePermission('pota_import');
  const [unprocessedParks, setUnprocessedParks] = useState<UnprocessedPark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingPermission, setCheckingPermission] = useState<boolean>(true); // 新增状态用于跟踪权限检查
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<{ [key: string]: string }>({});
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [parkToProcess, setParkToProcess] = useState<UnprocessedPark | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // 用于确保API只调用一次
  const hasFetchedRef = useRef(false);

  // 获取所有可用的公园类型
  const allParkTypes = useMemo(() => {
    const typeMap = new Map<string, { id: string; zh: string; en: string }>();

    const registerType = (zh: string, en: string) => {
      if (!typeMap.has(zh)) {
        typeMap.set(zh, { id: crypto.randomUUID(), zh, en });
      }
    };

    parkTypeMapping.chinese_to_english.forEach(
      (item: { chineseName: string; englishName: string }) => {
        registerType(item.chineseName, item.englishName);
      }
    );

    (parkTypeMapping.pota_only_types || []).forEach(
      (item: { chineseName: string; englishName: string }) => {
        registerType(item.chineseName, item.englishName);
      }
    );

    return Array.from(typeMap.values());
  }, []);

  const provinceByCode = useMemo(() => {
    return new Map<string, string>(
      regionMapping.map((item: { name: string; code: string }) => [item.code, item.name])
    );
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current && hasPotaPermission !== null) {
      hasFetchedRef.current = true;
      checkPermissionAndFetchData();
    }
  }, [hasPotaPermission]);

  const checkPermissionAndFetchData = async () => {
    setCheckingPermission(true); // 开始检查权限

    // 只有当 hasPotaPermission 为 false 时才认为没有权限
    // 如果 hasPotaPermission 为 null，表示还在加载中
    if (!user || hasPotaPermission === false) {
      setHasPermission(false);
      setCheckingPermission(false);
      setLoading(false);
      return;
    }

    // 如果 hasPotaPermission 仍在加载中，等待加载完成
    if (hasPotaPermission === null) {
      setCheckingPermission(false);
      setLoading(false);
      return;
    }

    try {
      // 通过尝试访问受保护的API来检查权限
      const response = await axios.get('/api/pota/unprocessed-parks', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // 如果API调用成功（返回200），则用户有权限
      setHasPermission(true);
      // 更新本地的未处理公园列表
      setUnprocessedParks(response.data);

      // 初始化选中的类型
      const initialSelected: { [key: string]: string } = {};
      response.data.forEach((park: UnprocessedPark) => {
        initialSelected[park.reference] = park.manualType || '';
      });
      setSelectedType(initialSelected);
    } catch (err: unknown) {
      const error = err as { response?: { status: number } };
      // 如果API调用失败（返回403或其他错误），则用户没有权限
      if (error.response?.status === 403) {
        // 明确的权限不足错误
      }
      // 其他错误，可能是网络问题等，但我们仍假设用户没有权限
      setHasPermission(false);
      console.error('检查权限失败:', err);
    } finally {
      // 无论成功还是失败，都要停止权限检查状态和loading状态
      setCheckingPermission(false);
      setLoading(false);
    }
  };

  const fetchUnprocessedParks = async () => {
    try {
      const response = await axios.get('/api/pota/unprocessed-parks', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setUnprocessedParks(response.data);

      // 初始化选中的类型
      const initialSelected: { [key: string]: string } = {};
      response.data.forEach((park: UnprocessedPark) => {
        initialSelected[park.reference] = park.manualType || '';
      });
      setSelectedType(initialSelected);
    } catch (err) {
      setError('获取未处理公园列表失败');
      console.error(err);
    }
  };

  const handleTypeChange = (reference: string, type: string) => {
    setSelectedType((prev) => ({
      ...prev,
      [reference]: type,
    }));
  };

  const handleProcessSingle = async (park: UnprocessedPark) => {
    if (!selectedType[park.reference]) {
      alert('请选择公园类型');
      return;
    }

    try {
      setProcessing(true);

      const parkData = {
        ...park,
        manualType: selectedType[park.reference],
      };

      await axios.post(
        '/api/pota/process-unprocessed-park',
        {
          parkData,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // 成功后刷新列表
      await fetchUnprocessedParks();
      alert('处理成功');
    } catch (err) {
      alert('处理失败');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkProcess = async () => {
    const parksToProcess = unprocessedParks
      .filter((park) => selectedType[park.reference])
      .map((park) => ({
        ...park,
        manualType: selectedType[park.reference],
      }));

    if (parksToProcess.length === 0) {
      alert('请至少选择一个公园并为其指定类型');
      return;
    }

    try {
      setProcessing(true);

      await axios.post(
        '/api/pota/bulk-process-unprocessed-parks',
        {
          parksData: parksToProcess,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // 成功后刷新列表
      await fetchUnprocessedParks();
      alert(`批量处理完成，成功处理 ${parksToProcess.length} 个公园`);
    } catch (err) {
      alert('批量处理失败');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmProcess = (park: UnprocessedPark) => {
    setParkToProcess(park);
    setOpenConfirmDialog(true);
  };

  const confirmProcess = () => {
    if (parkToProcess) {
      handleProcessSingle(parkToProcess);
    }
    setOpenConfirmDialog(false);
  };

  const cancelProcess = () => {
    setOpenConfirmDialog(false);
    setParkToProcess(null);
  };

  // 定义列
  const columns: GridColDef<UnprocessedPark>[] = [
    {
      field: 'reference',
      headerName: 'POTA ID',
      width: 120,
      renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => (
        <Tooltip title={params.value ?? ''}>
          <span>{params.value ?? ''}</span>
        </Tooltip>
      ),
    },
    {
      field: 'name',
      headerName: '公园名称',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => (
        <Tooltip title={params.value ?? ''}>
          <span>{params.value ?? ''}</span>
        </Tooltip>
      ),
    },
    {
      field: 'latitude',
      headerName: '纬度',
      width: 100,
      valueFormatter: (params: { value: number }) => params.value?.toFixed(4),
    },
    {
      field: 'longitude',
      headerName: '经度',
      width: 100,
      valueFormatter: (params: { value: number }) => params.value?.toFixed(4),
    },
    {
      field: 'grid',
      headerName: '网格',
      width: 100,
    },
    {
      field: 'activations',
      headerName: '激活次数',
      width: 100,
    },
    {
      field: 'qsos',
      headerName: 'QSOs',
      width: 80,
    },
    {
      field: 'locationDesc',
      headerName: '省份',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => {
        const code = params.value ?? '';
        const province = provinceByCode.get(code) || code;
        return (
          <Tooltip title={code}>
            <span>{province}</span>
          </Tooltip>
        );
      },
    },
    {
      field: 'manualType',
      headerName: '选择类型',
      width: 200,
      renderCell: (params: GridRenderCellParams<UnprocessedPark, string | null>) => (
        <FormControl fullWidth size="small">
          <Select
            value={selectedType[params.row.reference] || ''}
            onChange={(e) => handleTypeChange(params.row.reference, String(e.target.value))}
            displayEmpty
            MenuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              PaperProps: {
                sx: {
                  maxHeight: 320,
                },
              },
            }}
          >
            <MenuItem value="">
              <em>请选择类型</em>
            </MenuItem>
            {allParkTypes.map((option: { id: string; zh: string; en: string }) => (
              <MenuItem key={option.id} value={option.en}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {option.zh}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {option.en}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 150,
      renderCell: (params: GridRenderCellParams<UnprocessedPark, unknown>) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleConfirmProcess(params.row)}
          disabled={!selectedType[params.row.reference]}
        >
          导入
        </Button>
      ),
    },
  ];

  if (checkingPermission || permissionLoading) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          POTA 未处理公园
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          POTA 未处理公园
        </Typography>
        <Alert severity="error">您没有权限访问此页面。</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom>
        POTA 未处理公园
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">待处理公园数量: {unprocessedParks.length}</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handleBulkProcess}
            disabled={processing || unprocessedParks.length === 0}
            sx={{ mr: 1 }}
          >
            {processing ? <CircularProgress size={24} /> : '批量导入'}
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              setLoading(true);
              await fetchUnprocessedParks();
              setLoading(false);
            }}
            disabled={processing}
          >
            刷新
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      ) : (
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={unprocessedParks}
            columns={columns}
            getRowId={(row) => row.reference}
            pageSizeOptions={[5, 10, 20, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
              },
            }}
          />
        </div>
      )}

      {/* 确认对话框 */}
      <Dialog open={openConfirmDialog} onClose={cancelProcess}>
        <DialogTitle>确认导入</DialogTitle>
        <DialogContent>
          <Typography>
            您确定要将公园 <strong>{parkToProcess?.name}</strong> (ID: {parkToProcess?.reference})
            以类型 <strong>{selectedType[parkToProcess?.reference || '']}</strong> 导入吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelProcess}>取消</Button>
          <Button variant="contained" onClick={confirmProcess} disabled={processing}>
            {processing ? <CircularProgress size={24} /> : '确认导入'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PotaUnprocessedParks;
