import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import AdminRoute from '@/components/AdminRoute';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Devices from '@/pages/Devices';
import Employees from '@/pages/Employees';
import Assignments from '@/pages/Assignments';
import Scanner from '@/pages/Scanner';
import Reports from '@/pages/Reports';
import UserManagement from '@/pages/UserManagement';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/reports" element={<Reports />} />
          <Route element={<AdminRoute />}>
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
