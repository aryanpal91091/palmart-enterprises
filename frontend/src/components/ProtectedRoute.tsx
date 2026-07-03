import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');

  if (!token || !rawUser) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(rawUser);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If the user's role isn't authorized for this page, redirect to their default home (Dashboard)
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
