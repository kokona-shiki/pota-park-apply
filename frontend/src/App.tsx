// src/App.tsx
import React, { useState, createContext, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import TopBar from './components/TopBar.tsx';
import SideBar from './components/SideBar';
import Home from './pages/Home';
import AddPark from './pages/AddPark';
import ApplicationsList from './pages/ApplicationsList';
import MyUploads from './pages/MyUploads';
import ExportPage from './pages/ExportPage';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import UserInfo from './pages/UserInfo';
import AdminPanel from './pages/AdminPanel';
import axios from 'axios';

export const AuthContext = createContext<any>(null);

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [accessToken]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  // 供“用户信息页刷新按钮”使用：刷新 token 并同步最新角色
  const refreshSession = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('缺少 refreshToken');
    }

    const res = await axios.post(
      '/api/refresh-token',
      {},
      {
        headers: {
          'X-Refresh-Token': refreshToken
        }
      }
    );

    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = res.data;
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);

    return res.data;
  }, [refreshToken]);

  const isAdmin =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative' || user?.role === 'system_admin';
  const isSysAdmin = user?.role === 'system_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        refreshToken,
        setRefreshToken,
        refreshSession,
        logout
      }}
    >
      <Box sx={{ display: 'flex' }}>
        <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <SideBar isOpen={isSidebarOpen} isAdmin={isAdmin} isSysAdmin={isSysAdmin} />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add-park" element={user ? <AddPark /> : <Navigate to="/login" />} />
            <Route path="/applications" element={isAdmin ? <ApplicationsList /> : <Navigate to="/" />} />
            <Route path="/my-uploads" element={user ? <MyUploads /> : <Navigate to="/login" />} />
            <Route path="/export" element={user ? <ExportPage /> : <Navigate to="/login" />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
            <Route path="/user-info" element={user ? <UserInfo /> : <Navigate to="/login" />} />
            <Route path="/admin-panel" element={isSysAdmin ? <AdminPanel /> : <Navigate to="/" />} />
          </Routes>
        </Box>
      </Box>
    </AuthContext.Provider>
  );
}

export default App;
