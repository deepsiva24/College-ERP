import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import React from 'react';

// Views
import LoginView from './pages/LoginView';
import DashboardView from './pages/DashboardView';
import CoursesView from './pages/CoursesView';
// The new views we are about to create (they will fail compile until we make them, which is the immediate next step)
import AttendanceView from './pages/AttendanceView';
import RecordAttendanceView from './pages/RecordAttendanceView';
import PerformanceView from './pages/PerformanceView';
import LearningView from './pages/LearningView';
import GalleryView from './pages/GalleryView';
import AddStudentView from './pages/AddStudentView';
import FinanceView from './pages/FinanceView';

import DashboardLayout from './components/DashboardLayout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />

        {/* Encapsulate all auth routes in DashboardLayout */}
        <Route
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/courses" element={<CoursesView />} />
          <Route path="/attendance" element={<AttendanceView />} />
          <Route path="/record-attendance" element={<RecordAttendanceView />} />
          <Route path="/performance" element={<PerformanceView />} />
          <Route path="/learning" element={<LearningView />} />
          <Route path="/gallery" element={<GalleryView />} />
          <Route path="/add-student" element={<AddStudentView />} />
          <Route path="/finance" element={<FinanceView />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
