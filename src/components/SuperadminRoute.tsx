import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function SuperadminRoute() {
  const { role } = useAuth();

  if (role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default SuperadminRoute;
