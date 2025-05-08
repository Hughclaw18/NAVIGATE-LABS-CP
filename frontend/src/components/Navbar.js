import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const history = useHistory();

  const handleSignOut = async () => {
    try {
      await signOut();
      history.push('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <nav className={`navbar ${settings.theme === 'dark' ? 'navbar-dark' : 'navbar-light'}`}>
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          Surveillance System
        </Link>
      </div>
      
      <div className="navbar-menu">
        {user ? (
          <>
            <div className="navbar-links">
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <Link to="/settings" className="nav-link">Settings</Link>
            </div>
            
            <div className="navbar-auth">
              <span className="user-email">{user.email}</span>
              <button onClick={handleSignOut} className="btn btn-outline">
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="btn btn-outline">Sign In</Link>
            <Link to="/register" className="btn btn-solid">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 