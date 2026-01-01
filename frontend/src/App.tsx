// src/App.jsx
import React, { useState, createContext, useEffect } from 'react';
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

export const AuthContext = createContext();

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  // 临时伪造登录状态，便于前端开发和页面预览
  // 你可以修改这里的用户信息来测试不同权限
  setUser({
    id: 1,
    username: '测试用户',
    callsign: 'BG0FFH',
    email: 'test@example.com',
    user_group: 'sysadmin',  // 可选: 'user'（普通用户）、'admin'（地图管理员）、'sysadmin'（系统管理员）
    registration_time: '2025-01-01',
  });
  setLoading(false);
}, []);

  if (loading) return <div>Loading...</div>;

  const isAdmin = user?.user_group === 'admin' || user?.user_group === 'sysadmin';
  const isSysAdmin = user?.user_group === 'sysadmin';

  return (
    <AuthContext.Provider value={{ user, setUser }}>
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