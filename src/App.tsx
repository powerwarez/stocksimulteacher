import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import MainPage from "./MainPage";
import Students from "./pages/Students";
import CreateStudent from "./pages/CreateStudent";
import ErrorBoundary from "./ErrorBoundary"; // ErrorBoundary가 별도 파일에 있다면 가져옵니다.
import Login from "./Login";
import LandingPage from "./LandingPage";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./index.css";

// 인증 상태를 확인하는 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    // 인증 상태 확인 중
    return <div>로딩 중...</div>;
  }

  if (!isAuthenticated) {
    // 인증되지 않은 경우 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/main"
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/main/students" replace />} />
            <Route path="students" element={<Students />} />
            <Route path="create-student" element={<CreateStudent />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
