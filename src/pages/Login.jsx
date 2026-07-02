import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import solarBg from '../assets/solar_bg.png';
import { Sun } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      alert(`Login failed: ${error.message}`);
    } else {
      // Route based on email domain or string matching
      if (email.toLowerCase().includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/fitter');
      }
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
            <h1>Powering the Future of<br />of <span className="highlight-text">Sustainable Farming</span></h1>
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
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In securely'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
