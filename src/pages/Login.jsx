import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import solarBg from '../assets/solar_bg.png';
import { Sun } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (username.toLowerCase() === 'admin' && password === 'Mitali') {
      navigate('/admin');
    } else if (username.toLowerCase() === 'fitter' && password === 'fitter') {
      navigate('/fitter');
    } else {
      alert("Invalid credentials.");
    }
  };

  return (
    <div className="login-container" style={{ backgroundImage: `url(${solarBg})` }}>
      {/* Dark overlay for readability */}
      <div className="login-overlay"></div>
      
      <div className="login-content">
        {/* Left Side: Branding and Messaging */}
        <div className="login-left">
          <div className="brand-logo">
            <div className="logo-icon-bg">
              <Sun size={20} color="white" />
            </div>
            <span className="brand-title">MITALI ENTERPRISES <span className="brand-subtitle">| SolarConnect</span></span>
          </div>

          <div className="hero-text">
            <h1>Powering the Future<br/>of <span className="highlight-text">Rooftop Solar</span></h1>
            <p>The ultimate enterprise platform for fitters and admins to seamlessly manage solar installations, track assets, and automatically generate government compliance documents.</p>
          </div>

          <div className="feature-cards">
            <div className="feature-card">
              <h4>100%</h4>
              <p>Paperless Workflow</p>
            </div>
            <div className="feature-card">
              <h4>Instant</h4>
              <p>Docxtemplater Exports</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-right">
          <div className="login-glass-card">
            <h2>Welcome Back</h2>
            <p className="login-subtitle">Please enter your credentials to access the portal.</p>
            
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  placeholder="Enter your username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              
              <button type="submit" className="btn-login">Sign In securely</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
