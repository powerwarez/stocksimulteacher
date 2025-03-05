import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './MainPage';
import Students from './pages/Students';
import CreateStudent from './pages/CreateStudent';
import ErrorBoundary from './ErrorBoundary'; // ErrorBoundary가 별도 파일에 있다면 가져옵니다.
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MainPage />}>
            <Route index element={<Navigate to="/students" replace />} />
            <Route path="students" element={<Students />} />
            <Route path="create-student" element={<CreateStudent />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;