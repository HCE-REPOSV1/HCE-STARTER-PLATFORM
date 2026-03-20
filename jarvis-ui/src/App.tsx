import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './store/auth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Initialize from './pages/Initialize';
import DataSources from './pages/DataSources';
import Domains from './pages/Domains';
import Logs from './pages/Logs';
import Users from './pages/Users';
import Templates from './pages/Templates';
import Generations from './pages/Generations';
import OpenApiSpecs from './pages/OpenApiSpecs';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: 14 } }} />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="initialize" replace />} />
          <Route path="initialize" element={<Initialize />} />
          <Route path="generations" element={<Generations />} />
          <Route path="datasources" element={<DataSources />} />
          <Route path="domains" element={<Domains />} />
          <Route path="templates" element={<Templates />} />
          <Route path="users" element={<Users />} />
          <Route path="logs" element={<Logs />} />
          <Route path="openapi-specs" element={<OpenApiSpecs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
