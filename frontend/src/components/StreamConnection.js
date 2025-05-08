import React, { useState } from 'react';
import { useVideo } from '../contexts/VideoContext';

const StreamConnection = () => {
  const [rtspUrl, setRtspUrl] = useState('');
  const [connectionError, setConnectionError] = useState('');
  
  const { 
    connectToStream, 
    disconnectStream, 
    isConnected, 
    streamUrl,
    rtspUrl: connectedRtspUrl,
    isProcessing,
    startProcessing,
    stopProcessing
  } = useVideo();

  const handleConnect = (e) => {
    e.preventDefault();
    
    if (!rtspUrl) {
      setConnectionError('Please enter an RTSP URL');
      return;
    }
    
    const success = connectToStream(rtspUrl);
    
    if (!success) {
      setConnectionError('Failed to connect to the stream. Please check the URL and try again.');
    } else {
      setConnectionError('');
    }
  };

  const handleDisconnect = () => {
    disconnectStream();
    setConnectionError('');
  };

  const handleProcessing = () => {
    if (isProcessing) {
      stopProcessing();
    } else {
      startProcessing();
    }
  };

  return (
    <div className="stream-connection">
      <h2>Stream Connection</h2>
      
      {!isConnected ? (
        <>
          <div className="rtsp-info">
            <p>Enter your camera's RTSP URL below. The stream will be converted to HLS format using RTSPtoWeb.</p>
            <p>Make sure RTSPtoWeb is running on <code>localhost:8083</code> with a proper configuration.</p>
          </div>
          
          <form onSubmit={handleConnect}>
            <div className="form-group">
              <label htmlFor="rtspUrl">RTSP URL</label>
              <input
                type="text"
                id="rtspUrl"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                placeholder="rtsp://username:password@ip:port/path"
                className="form-control"
              />
            </div>
            
            {connectionError && (
              <div className="error-message">{connectionError}</div>
            )}
            
            <button type="submit" className="btn btn-primary">
              Connect
            </button>
          </form>
        </>
      ) : (
        <div className="connected-state">
          <div className="stream-info">
            <div><strong>Original RTSP:</strong> {connectedRtspUrl}</div>
            <div><strong>Converted Stream:</strong> {streamUrl}</div>
            <div className="stream-note">
              <small>The RTSP stream is being converted to HLS format using RTSPtoWeb for browser compatibility.</small>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={handleProcessing} 
              className={`btn ${isProcessing ? 'btn-danger' : 'btn-success'}`}
              disabled={!isConnected}
            >
              {isProcessing ? 'Stop Processing' : 'Start Processing'}
            </button>
            
            <button 
              onClick={handleDisconnect} 
              className="btn btn-secondary"
              disabled={isProcessing}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamConnection; 