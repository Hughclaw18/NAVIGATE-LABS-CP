import React from 'react';
import VideoPlayer from '../components/VideoPlayer';
import StreamConnection from '../components/StreamConnection';
import LocalMediaInput from '../components/LocalMediaInput';
import Analytics from '../components/Analytics';
import { useVideo } from '../contexts/VideoContext';
import { useSettings } from '../contexts/SettingsContext';

const Dashboard = () => {
  const { streamUrl, isConnected, sourceType } = useVideo();
  const { settings } = useSettings();

  return (
    <div className="dashboard-container">
      <h1>Surveillance Dashboard</h1>
      
      <div className="dashboard-layout">
        <div className="main-content">
          <div className="video-section">
            <h2>Video Feed</h2>
            <VideoPlayer url={streamUrl} cameraMode={sourceType === 'camera'} />
          </div>
          
          <div className="analytics-section">
            <Analytics />
          </div>
        </div>
        
        <div className="sidebar">
          <div className="controls-section">
            {settings.streamMode === 'rtsp' ? (
              <StreamConnection />
            ) : (
              <LocalMediaInput />
            )}
            
            {isConnected && (
              <div className="stream-details">
                <h3>Stream Information</h3>
                <p>
                  <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p>
                  <strong>Mode:</strong> {sourceType === 'rtsp' ? 'RTSP Stream' : sourceType === 'file' ? 'Video File' : 'Camera Feed'}
                </p>
                {streamUrl && sourceType === 'rtsp' && (
                  <p>
                    <strong>URL:</strong> {streamUrl}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 