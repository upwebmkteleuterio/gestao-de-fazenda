import React from 'react';
import { Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * Guardião de Rotas (AuthGuard / ProtectedRoute)
 * Pronto para acoplamento de verificação de sessão (ex: Supabase Auth, Firebase ou JWT).
 * Renderiza páginas filhas através de <Outlet /> ou children sem afetar o layout.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Flag simulando validação de sessão ativa para rotas autenticadas
  const isAuthenticated = true;

  if (!isAuthenticated) {
    // Exemplo para futuro redirecionamento:
    // return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
