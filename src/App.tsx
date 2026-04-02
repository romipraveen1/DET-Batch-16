import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/layout/Layout";
import { Login } from "./pages/Login";

import { Dashboard } from "./pages/Dashboard";
import { Employees } from "./pages/Employees";
import { Bench } from "./pages/Bench";
import { Projects } from "./pages/Projects";
import { Defects } from "./pages/Defects";
import { TestCase } from "./pages/TestCase";
import { TestExecution } from "./pages/TestExecution";
import { ModuleManagement } from "./pages/ModuleManagement";
import { ProjectManagement } from "./pages/ProjectManagement";
import ProjectAllocationHistory from "./pages/projectAllocationHistory";
import { Releases } from "./pages/release";
import { Allocation } from "./pages/allocation";
import { ReleaseView } from "./pages/ReleaseView";
import Configurations from "./pages/Configurations";
import Designation from "./pages/Designation";
import Role from "./pages/Role";
import DefectType from "./pages/DefectType";
import Privileges from "./pages/Privileges";
import EmailConfiguration from "./pages/EmailConfiguration";
import ReleaseType from "./pages/ReleaseType";
import Severity from "./pages/Severity";
import Priority from "./pages/Priority";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StatusWorkflow from "./pages/StatusWorkflow";
import StatusType from "./pages/StatusType";
import BenchAllocate from './pages/BenchAllocate';
import Status from "./pages/Status";
import ReleaseDetails from "./pages/ReleaseDetails";


const ProtectedRoute: React.FC<{ children: React.ReactNode, noLayout?: boolean }> = ({ children, noLayout }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading DefectTracker Pro...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (do not require user object to be immediately present)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (noLayout) return <>{children}</>;
  return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bench"
          element={
            <ProtectedRoute>
              <Bench />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDashboard />
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/projects/:projectId/test-cases"
          element={
            <ProtectedRoute>
              <TestCase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/releases"
          element={
            <ProtectedRoute>
              <Releases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/releases/allocation"
          element={
            <ProtectedRoute>
              <Allocation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/releases/test-execution"
          element={
            <ProtectedRoute>
              <TestExecution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/project-management/view"
          element={
            <ProtectedRoute>
              <ReleaseView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/defects"
          element={
            <ProtectedRoute>
              <Defects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/project-management"
          element={
            <ProtectedRoute>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/project-management/allocation-history"
          element={
            <ProtectedRoute>
              <ProjectAllocationHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/project-management/module-management"
          element={
            <ProtectedRoute>
              <ModuleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations"
          element={
            <ProtectedRoute>
              <Configurations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/designation"
          element={
            <ProtectedRoute>
              <Designation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/role"
          element={
            <ProtectedRoute>
              <Role />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/defect-type"
          element={
            <ProtectedRoute>
              <DefectType />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/privileges"
          element={
            <ProtectedRoute>
              <Privileges />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/email-configuration"
          element={
            <ProtectedRoute>
              <EmailConfiguration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/release-type"
          element={
            <ProtectedRoute>
              <ReleaseType />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/severity"
          element={
            <ProtectedRoute>
              <Severity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/priority"
          element={
            <ProtectedRoute>
              <Priority />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/status"
          element={
            <ProtectedRoute>
              <Status />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/status/workflow"
          element={
            <ProtectedRoute>
              <StatusWorkflow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configurations/status/type"
          element={
            <ProtectedRoute>
              <StatusType />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bench-allocate"
          element={
            <ProtectedRoute noLayout>
              <BenchAllocate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/releases/:releaseId/details"
          element={
            <ProtectedRoute>
              <ReleaseDetails />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
