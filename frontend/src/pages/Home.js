import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>IndustriWatch - Real-time Surveillance Monitoring System</h1>
        <p className="hero-description">
          Connect to your RTSP cameras and detect anomalies using advanced AI analytics
        </p>
        
        {user ? (
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Go to Dashboard
          </Link>
        ) : (
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg">
              Sign In
            </Link>
          </div>
        )}
      </div>
      
      <div className="features-section">
        <h2>Key Features</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎥</div>
            <h3>RTSP Stream Support</h3>
            <p>Connect to any RTSP camera feed for real-time monitoring</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Violence Detection</h3>
            <p>Automatically identify violent activities in video streams</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👤</div>
            <h3>Pose Analysis</h3>
            <p>Detect unusual human poses that may indicate emergencies</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔥</div>
            <h3>Fire & Smoke Detection</h3>
            <p>Early warning system for fire and smoke detection</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⚠️</div>
            <h3>Real-time Alerts</h3>
            <p>Get instant notifications when anomalies are detected</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Comprehensive analytics and reporting of detected events</p>
          </div>
        </div>
      </div>
      
      <div className="cta-section">
        <h2>Start Monitoring Today</h2>
        <p>Set up your surveillance system in minutes</p>
        
        {user ? (
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Go to Dashboard
          </Link>
        ) : (
          <Link to="/register" className="btn btn-primary btn-lg">
            Create an Account
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home; 