import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { settings, setTheme, setTelegramSettings, setStreamMode, loading } = useSettings();
  const { user } = useAuth();
  
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [savedStatus, setSavedStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Update local state when settings change
  useEffect(() => {
    if (!loading && settings) {
      console.log('Settings updated in component:', { 
        telegramEnabled: settings.telegramEnabled,
        tokenPresent: settings.telegramToken ? 'yes' : 'no',
        chatIdPresent: settings.telegramChatId ? 'yes' : 'no'
      });
      
      setTelegramToken(settings.telegramToken || '');
      setTelegramChatId(settings.telegramChatId || '');
    }
  }, [settings, loading]);
  
  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };
  
  const handleStreamModeChange = (e) => {
    setStreamMode(e.target.value);
  };
  
  const handleTelegramToggle = async (e) => {
    const isEnabled = e.target.checked;
    console.log('Toggling Telegram enabled:', isEnabled);
    
    try {
      setIsSaving(true);
      // Always save current token and chat ID values when toggling
      await setTelegramSettings(isEnabled, telegramToken, telegramChatId);
      
      if (isEnabled) {
        setSavedStatus('Telegram alerts enabled!');
      } else {
        setSavedStatus('Telegram alerts disabled.');
      }
      
      setTimeout(() => {
        setSavedStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      setSavedStatus('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTelegramInputChange = (field, value) => {
    if (field === 'token') {
      setTelegramToken(value);
    } else if (field === 'chatId') {
      setTelegramChatId(value);
    }
  };
  
  const handleSaveTelegramSettings = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      console.log('Saving Telegram settings:', {
        enabled: settings.telegramEnabled,
        token: telegramToken ? `${telegramToken.substring(0, 5)}...` : 'empty',
        chatId: telegramChatId || 'empty'
      });
      
      await setTelegramSettings(settings.telegramEnabled, telegramToken, telegramChatId);
      setSavedStatus('Telegram settings saved successfully!');
      
      setTimeout(() => {
        setSavedStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      setSavedStatus('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="settings-container">
        <h1>Settings</h1>
        <div className="loading-indicator">Loading settings...</div>
      </div>
    );
  }
  
  return (
    <div className="settings-container">
      <h1>Settings</h1>
      
      {user ? (
        <>
          <div className="settings-section">
            <h2>Appearance</h2>
            <div className="settings-card">
              <div className="form-group">
                <label htmlFor="theme">Theme</label>
                <select 
                  id="theme" 
                  value={settings.theme} 
                  onChange={handleThemeChange}
                  className="form-control"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h2>Video Source</h2>
            <div className="settings-card">
              <div className="form-group">
                <label htmlFor="streamMode">Video Stream Mode</label>
                <select 
                  id="streamMode" 
                  value={settings.streamMode} 
                  onChange={handleStreamModeChange}
                  className="form-control"
                >
                  <option value="rtsp">RTSP Stream</option>
                  <option value="local">File Upload & Camera Feed</option>
                </select>
                
                <div className="form-text">
                  <p>Choose how you want to provide video input for surveillance analytics:</p>
                  <ul className="stream-options-list">
                    <li>
                      <strong>RTSP Stream:</strong> 
                      <span>Connect to an RTSP camera source over the network</span>
                    </li>
                    <li>
                      <strong>File Upload & Camera Feed:</strong> 
                      <span>Upload video files or use your device camera</span>
                    </li>
                  </ul>
                </div>
                
                <div className="source-preview">
                  <div className={`source-option ${settings.streamMode === 'rtsp' ? 'active' : ''}`}>
                    <div className="source-icon rtsp-icon">
                      <i className="fas fa-video"></i>
                    </div>
                    <div className="source-details">
                      <h4>RTSP Stream</h4>
                      <p>Use for network-connected cameras</p>
                    </div>
                  </div>
                  
                  <div className={`source-option ${settings.streamMode === 'local' ? 'active' : ''}`}>
                    <div className="source-icon local-icon">
                      <i className="fas fa-file-video"></i>
                    </div>
                    <div className="source-details">
                      <h4>Local Media</h4>
                      <p>Use for files or webcam</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h2>Integrations</h2>
            
            <div className="settings-card">
              <div className="integration-header">
                <h3>Telegram</h3>
                <div className="toggle-container">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={settings.telegramEnabled} 
                      onChange={handleTelegramToggle}
                      disabled={isSaving}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span className="toggle-label">
                    {settings.telegramEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              <p className="integration-description">
                Enable Telegram integration to receive real-time alerts when anomalies are detected.
              </p>
              
              <button 
                className="btn btn-link"
                onClick={() => setShowGuide(!showGuide)}
              >
                {showGuide ? 'Hide' : 'Show'} setup guide
              </button>
              
              {showGuide && (
                <div className="setup-guide">
                  <h4>How to Set Up Telegram Bot</h4>
                  <ol>
                    <li>Open Telegram and search for the <strong>@BotFather</strong> account.</li>
                    <li>Start a chat and send the command <code>/newbot</code>.</li>
                    <li>Follow the prompts to create a new bot.</li>
                    <li>Once created, you'll receive a <strong>token</strong>. Copy this token.</li>
                    <li>Start a chat with your new bot or add it to a group.</li>
                    <li>To get your Chat ID, search for <strong>@userinfobot</strong>, start a chat, and it will display your Chat ID.</li>
                    <li>Enter both the token and Chat ID in the fields below.</li>
                  </ol>
                </div>
              )}
              
              <form onSubmit={handleSaveTelegramSettings}>
                <div className="form-group">
                  <label htmlFor="telegramToken">Bot Token</label>
                  <input
                    type="text"
                    id="telegramToken"
                    value={telegramToken}
                    onChange={(e) => handleTelegramInputChange('token', e.target.value)}
                    placeholder="Enter your Telegram bot token"
                    className="form-control"
                    disabled={!settings.telegramEnabled || isSaving}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="telegramChatId">Chat ID</label>
                  <input
                    type="text"
                    id="telegramChatId"
                    value={telegramChatId}
                    onChange={(e) => handleTelegramInputChange('chatId', e.target.value)}
                    placeholder="Enter your Telegram chat ID"
                    className="form-control"
                    disabled={!settings.telegramEnabled || isSaving}
                  />
                </div>
                
                {settings.telegramEnabled && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!telegramToken || !telegramChatId || isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Telegram Settings'}
                  </button>
                )}
                
                {savedStatus && (
                  <div className="alert alert-success mt-3">
                    {savedStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-info">
          Please log in to access your personal settings.
        </div>
      )}
    </div>
  );
};

export default Settings; 