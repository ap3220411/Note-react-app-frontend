import { Navigate, useLocation } from "react-router-dom";

const isAuthed = () => Boolean(localStorage.getItem("auth_token"));

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;

