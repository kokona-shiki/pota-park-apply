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
  Snackbar,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import parkTypeMapping from '../../../shared/park_type_mapping.json';
import regionMapping from '../../../shared/region.json';
import { useAuth } from '../auth/useAuth';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/error';

interface UnprocessedPark {
  reference: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  locationDesc: string;
  grid: string;
  attempts: number;
  activations: number;
  qsos: number;
  message?: string;
  failureReason?: string;
  suggestedType?: string | null;
  manualType?: string | null;
}

const PotaUnprocessedParks: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [unprocessedParks, setUnprocessedParks] = useState<UnprocessedPark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<{ [key: string]: string }>({});
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [parkToProcess, setParkToProcess] = useState<UnprocessedPark | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);

  // 用于确保API只调用一次
  const hasFetchedRef = useRef(false);

  // 获取所有可用的公园类型
  const allParkTypes = useMemo(() => {
    const typeMap = new Map<string, { id: string; zh: string; en: string }>();

    const registerType = (id: string, zh: string, en: string) => {
      if (!typeMap.has(id)) {
        typeMap.set(id, { id, zh, en });
      }
    };

    parkTypeMapping.chinese_to_english.forEach(
      (item: { id: string; chineseName: string; englishName: string }) => {
        registerType(item.id, item.chineseName, item.englishName);
      }
    );

    (parkTypeMapping.pota_only_types || []).forEach(
      (item: { id: string; chineseName: string; englishName: string }) => {
        registerType(item.id, item.chineseName, item.englishName);
      }
    );

    return Array.from(typeMap.values());
  }, []);

  const parkTypeById = useMemo(
    () => new Map(allParkTypes.map((option) => [option.id, option])),
    [allParkTypes]
  );

  const parkTypeIdsByEnglish = useMemo(() => {
    const map = new Map<string, string[]>();
    allParkTypes.forEach((option) => {
      const ids = map.get(option.en) ?? [];
      ids.push(option.id);
      map.set(option.en, ids);
    });
    return map;
  }, [allParkTypes]);

  const parkTypeIdByChinese = useMemo(() => {
    const map = new Map<string, string>();
    allParkTypes.forEach((option) => {
      map.set(option.zh, option.id);
    });
    return map;
  }, [allParkTypes]);

  const chineseNamesByEnglish = useMemo(() => {
    const map = new Map<string, string[]>();

    (parkTypeMapping.english_to_chinese || []).forEach(
      (item: { englishName: string; chineseNames: string[] }) => {
        map.set(item.englishName, item.chineseNames);
      }
    );

    parkTypeMapping.chinese_to_english.forEach(
      (item: { chineseName: string; englishName: string }) => {
        if (!map.has(item.englishName)) {
          map.set(item.englishName, [item.chineseName]);
        }
      }
    );

    (parkTypeMapping.pota_only_types || []).forEach(
      (item: { chineseName: string; englishName: string }) => {
        if (!map.has(item.englishName)) {
          map.set(item.englishName, [item.chineseName]);
        }
      }
    );

    return map;
  }, []);

  const resolveTypeId = (value: string) => {
    if (parkTypeById.has(value)) {
      return value;
    }
    return (
      parkTypeIdByChinese.get(value) || parkTypeIdsByEnglish.get(value)?.[0] || ''
    );
  };

  const getChineseTypeLabel = (englishName: string) => {
    const chineseNames = chineseNamesByEnglish.get(englishName);
    return chineseNames?.length ? chineseNames.join(' / ') : englishName;
  };

  const getSelectedTypeLabel = (reference?: string) => {
    if (!reference) {
      return '';
    }
    const selectedId = selectedType[reference];
    const selectedOption = selectedId ? parkTypeById.get(selectedId) : undefined;
    if (selectedOption?.zh) {
      return selectedOption.zh;
    }
    return selectedOption?.en ? getChineseTypeLabel(selectedOption.en) : '';
  };

  const provinceByCode = useMemo(() => {
    return new Map<string, string>(
      regionMapping.map((item: { name: string; code: string }) => [item.code, item.name])
    );
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current && user) {
      hasFetchedRef.current = true;
      fetchUnprocessedParks();
    }
  }, [user]);

  const fetchUnprocessedParks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/pota/unprocessed-parks', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setUnprocessedParks(response.data);
      setHasPermission(true);

      // 初始化选中的类型
      const initialSelected: { [key: string]: string } = {};
      response.data.forEach((park: UnprocessedPark) => {
        initialSelected[park.reference] = park.manualType ? resolveTypeId(park.manualType) : '';
      });
      setSelectedType(initialSelected);
    } catch (err) {
      const error = err as { response?: { status: number } };
      if (error.response?.status === 401 || error.response?.status === 403) {
        setHasPermission(false);
      } else {
        setError(getApiErrorMessage(err, '获取未处理公园列表失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (reference: string, typeId: string) => {
    setSelectedType((prev) => ({
      ...prev,
      [reference]: typeId,
    }));
  };

  const handleProcessSingle = async (park: UnprocessedPark) => {
    if (!selectedType[park.reference]) {
      setSnackbar({ message: '请选择公园类型', severity: 'info' });
      return;
    }

    try {
      setProcessing(true);

      const selectedOption = parkTypeById.get(selectedType[park.reference]);
      const parkData = {
        ...park,
        manualType: selectedOption?.id || '',
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
      setSnackbar({ message: '处理成功', severity: 'success' });
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '处理失败'), severity: 'error' });
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkProcess = async () => {
    const parksToProcess = unprocessedParks
      .filter((park) => selectedType[park.reference])
      .map((park) => {
        const selectedOption = parkTypeById.get(selectedType[park.reference]);
        return {
          ...park,
          manualType: selectedOption?.id || '',
        };
      });

    if (parksToProcess.length === 0) {
      setSnackbar({ message: '请至少选择一个公园并为其指定类型', severity: 'info' });
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
      setSnackbar({
        message: `批量处理完成，成功处理 ${parksToProcess.length} 个公园`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '批量处理失败'), severity: 'error' });
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
      field: 'failureReason',
      headerName: '失败原因',
      flex: 1,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => {
        const reason = params.value ?? params.row.message ?? '';
        return (
          <Tooltip title={reason}>
            <span>{reason || '-'}</span>
          </Tooltip>
        );
      },
    },
    {
      field: 'latitude',
      headerName: '纬度',
      width: 100,
      valueFormatter: (params: { value: number }) =>
        typeof params.value === 'number' ? params.value.toFixed(4) : '-',
    },
    {
      field: 'longitude',
      headerName: '经度',
      width: 100,
      valueFormatter: (params: { value: number }) =>
        typeof params.value === 'number' ? params.value.toFixed(4) : '-',
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
        const codes = code
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const provinces = codes.map((item) => provinceByCode.get(item) || item);
        const province = provinces.join('、') || code;
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
              <MenuItem key={option.id} value={option.id}>
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

  if (loading || hasPermission === null) {
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

  if (hasPermission === false) {
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
              await fetchUnprocessedParks();
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
            以类型{' '}
            <strong>
              {getSelectedTypeLabel(parkToProcess?.reference)}
            </strong>{' '}
            导入吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelProcess}>取消</Button>
          <Button variant="contained" onClick={confirmProcess} disabled={processing}>
            {processing ? <CircularProgress size={24} /> : '确认导入'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Container>
  );
};

export default PotaUnprocessedParks;
