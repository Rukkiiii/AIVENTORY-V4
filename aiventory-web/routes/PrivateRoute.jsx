import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // 'Admin' or 'Staff'

  if (!token) {
    return <Navigate to="/login" />;
  }

  // if allowedRoles is defined, check user role
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" />; // redirect unauthorized users
  }

  return children;
}
