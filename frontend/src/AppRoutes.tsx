// src/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AddPark from './pages/add-park';
import ApplicationsList from './pages/ApplicationsList';
import MyUploads from './pages/MyUploads';
import ExportPage from './pages/ExportPage';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import UserInfo from './pages/UserInfo';
import AdminPanel from './pages/AdminPanel';
import CallsignChangeRequests from './pages/CallsignChangeRequests';
import PotaImport from './pages/PotaImport';
import PotaUnprocessedParks from './pages/PotaUnprocessedParks';
import PotaSyncLogs from './pages/PotaSyncLogs';
import ParkTypeAlignment from './pages/ParkTypeAlignment';
import ExportAuditLogs from './pages/ExportAuditLogs';
import { NotificationCenter } from './pages/NotificationCenter';
import { NotificationDetail } from './pages/NotificationDetail';
import { GlobalNotificationEditor } from './pages/GlobalNotificationEditor';
import { GlobalNotificationManager } from './pages/GlobalNotificationManager';
import { RequireAuth, RequireNotSysAdmin, RequirePotaPermission, RequireSysAdmin, RequirePermission } from './components/auth/RouteGuards';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home />
        }
      />
      <Route
        path="/add-park"
        element={
          <RequireNotSysAdmin>
            <AddPark />
          </RequireNotSysAdmin>
        }
      />
      <Route
        path="/applications"
        element={
          <RequireNotSysAdmin>
            <ApplicationsList />
          </RequireNotSysAdmin>
        }
      />
      <Route
        path="/my-uploads"
        element={
          <RequireNotSysAdmin>
            <MyUploads />
          </RequireNotSysAdmin>
        }
      />
      <Route
        path="/export"
        element={
          <RequirePotaPermission>
            <ExportPage />
          </RequirePotaPermission>
        }
      />
      <Route
        path="/about"
        element={
          <RequireAuth>
            <About />
          </RequireAuth>
        }
      />
      <Route
        path="/user-info"
        element={
          <RequireAuth>
            <UserInfo />
          </RequireAuth>
        }
      />
      <Route
        path="/admin-panel"
        element={
          <RequireSysAdmin>
            <AdminPanel />
          </RequireSysAdmin>
        }
      />
      <Route
        path="/callsign-change-requests"
        element={
          <RequireAuth>
            <CallsignChangeRequests />
          </RequireAuth>
        }
      />
      <Route
        path="/pota-import"
        element={
          <RequirePotaPermission>
            <PotaImport />
          </RequirePotaPermission>
        }
      />
      <Route
        path="/pota-unprocessed"
        element={
          <RequirePotaPermission>
            <PotaUnprocessedParks />
          </RequirePotaPermission>
        }
      />
      <Route
        path="/pota-sync-logs"
        element={
          <RequirePotaPermission>
            <PotaSyncLogs />
          </RequirePotaPermission>
        }
      />
      <Route
        path="/park-type-alignment"
        element={
          <RequirePotaPermission>
            <ParkTypeAlignment />
          </RequirePotaPermission>
        }
      />
      <Route
        path="/export-audit-logs"
        element={
          <RequirePotaPermission>
            <ExportAuditLogs />
          </RequirePotaPermission>
        }
      />
      <Route
        path="/notification-center"
        element={
          <RequireAuth>
            <NotificationCenter />
          </RequireAuth>
        }
      />
      <Route
        path="/notification-detail/:id"
        element={
          <RequireAuth>
            <NotificationDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/global-notification-editor"
        element={
          <RequirePermission requiredPermissions={['create_global_notification']}>
            <GlobalNotificationEditor />
          </RequirePermission>
        }
      />
      <Route
        path="/global-notification-manager"
        element={
          <RequirePermission requiredPermissions={['view_global_notifications']}>
            <GlobalNotificationManager />
          </RequirePermission>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}