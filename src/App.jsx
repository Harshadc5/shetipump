import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import FitterPortal from './pages/FitterPortal';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/fitter" element={<FitterPortal />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
