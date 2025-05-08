import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VideoProvider } from './contexts/VideoContext';
import { SettingsProvider } from './contexts/SettingsContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import './styles/App.css';
import './styles/components.css';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <VideoProvider>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <PrivateRoute path="/dashboard" component={Dashboard} />
                <PrivateRoute path="/profile" component={Profile} />
                <PrivateRoute path="/settings" component={Settings} />
              </Switch>
            </main>
            <footer className="footer">
              <p>&copy; {new Date().getFullYear()} Surveillance Monitoring System</p>
            </footer>
          </div>
        </VideoProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App; 