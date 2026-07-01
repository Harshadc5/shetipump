import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import FitterPortal from './pages/FitterPortal';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Fitter Route */}
        <Route element={<ProtectedRoute allowedRoles={['fitter', 'admin']} />}>
          <Route path="/fitter" element={<FitterPortal />} />
        </Route>

        {/* Protected Admin Route */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
