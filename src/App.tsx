import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SchoolsPage from './pages/SchoolsPage';
import UsersPage from './pages/UsersPage';
import ClassesPage from './pages/ClassesPage';
import StudentsPage from './pages/StudentsPage';
import ManualStudentsPage from './pages/ManualStudentsPage';
import ServersPage from './pages/ServersPage';
import ManualServersPage from './pages/ManualServersPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import PermissionsPage from './pages/PermissionsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#D6E8EE]">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/students/manual" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/manual" element={<ManualStudentsPage />} />
        <Route path="servers" element={<ServersPage />} />
        <Route path="servers/manual" element={<ManualServersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;
