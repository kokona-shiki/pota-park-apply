// src/pages/Home.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import type { ChangeEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Box,
  InputAdornment,
  Search as SearchIcon,
} from '@mui/material';
import { z } from 'zod';
import { apiClient, requestWithSchema } from '../services/apiClient';
import PinyinMatch from 'pinyin-match';

// 定义系统内 POTA 公园的数据结构
const SystemPotaParkSchema = z.object({
  id: z.number(),
  pota_id: z.string(),
  park_name: z.string(),
  park_type: z.string().nullable(),
  provinces: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  pota_synced_at: z.string().nullable(),
});

type SystemPotaPark = z.infer<typeof SystemPotaParkSchema>;

// 定义响应数据结构
const PotaParksResponseSchema = z.object({
  parks: z.array(SystemPotaParkSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

type PotaParksResponse = z.infer<typeof PotaParksResponseSchema>;

function Home() {
  const { user, isAuthLoading } = useAuth();

  // 状态管理
  const [parks, setParks] = useState<SystemPotaPark[]>([]);
  const [filteredParks, setFilteredParks] = useState<SystemPotaPark[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 防抖函数
  const debounce = (func: Function, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // 加载公园数据
  const loadParks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await requestWithSchema(
        apiClient.get('/api/pota/parks', {
          params: {
            page,
            pageSize: rowsPerPage,
            sortBy: 'pota_id',
            sortOrder: 'asc',
          },
        }),
        PotaParksResponseSchema
      );
      setParks(response.parks);
      setFilteredParks(response.parks);
      setTotal(response.total);
    } catch (err) {
      console.error('加载公园数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage]);

  // 初始加载和分页/每页数量变化时重新加载
  useEffect(() => {
    // 不需要登录即可访问
    loadParks();
  }, [loadParks]);

  // 搜索功能
  const handleSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
      
      if (!value) {
        setFilteredParks(parks);
        return;
      }
      
      const filtered = parks.filter(park => {
        // POTA_ID 匹配
        if (park.pota_id.toLowerCase().includes(value.toLowerCase())) {
          return true;
        }
        
        // 中文名称匹配
        if (park.park_name.includes(value)) {
          return true;
        }
        
        // 拼音匹配
        try {
          if (PinyinMatch.match(park.park_name, value) !== false) {
            return true;
          }
        } catch (e) {
          // 拼音匹配失败时忽略
        }
        
        return false;
      });
      
      setFilteredParks(filtered);
    }, 300),
    [parks]
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* 搜索框 */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <TextField
          label="搜索 POTA ID 或公园名称"
          variant="outlined"
          size="small"
          placeholder="例如: CN-0001 或 奥林匹克公园"
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 400 }}
        />
      </Box>

      {/* 表格 */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>编号</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>省份</TableCell>
              <TableCell>经度</TableCell>
              <TableCell>纬度</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredParks.map((park) => (
              <TableRow key={park.id}>
                <TableCell>{park.pota_id}</TableCell>
                <TableCell>{park.park_name}</TableCell>
                <TableCell>{park.park_type || '-'}</TableCell>
                <TableCell>{JSON.parse(park.provinces).join(', ')}</TableCell>
                <TableCell>{park.longitude?.toFixed(6) || '-'}</TableCell>
                <TableCell>{park.latitude?.toFixed(6) || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <TablePagination
        rowsPerPageOptions={[10, 30, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页条数:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Paper>
  );
}

export default Home;
