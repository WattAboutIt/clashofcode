import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 text-slate-300">
        Loading authentication...
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
