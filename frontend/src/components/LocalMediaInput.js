import React, { useState, useRef } from 'react';
import { useVideo } from '../contexts/VideoContext';

const LocalMediaInput = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { 
    connectToLocalFile, 
    connectToCamera, 
    disconnectMedia, 
    isConnected,
    isProcessing,
    startProcessing,
    stopProcessing
  } = useVideo();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (file) {
      if (file.type.includes('video/')) {
        setSelectedFile(file);
        setErrorMessage('');
      } else {
        setSelectedFile(null);
        setErrorMessage('Please select a valid video file.');
      }
    }
  };

  const handleFileUpload = (e) => {
    e.preventDefault();
    if (selectedFile) {
      connectToLocalFile(selectedFile);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const startCamera = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        cameraStreamRef.current = stream;
        setIsCameraActive(true);
        connectToCamera(stream);
      }
    } catch (err) {
      setErrorMessage('Could not access camera: ' + err.message);
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
      setIsCameraActive(false);
      disconnectMedia();
    }
  };

  const handleDisconnect = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      disconnectMedia();
    }
    setSelectedFile(null);
  };

  const handleProcessing = () => {
    if (isProcessing) {
      stopProcessing();
    } else {
      startProcessing();
    }
  };

  const getFileSize = (size) => {
    if (size < 1024) {
      return size + ' B';
    } else if (size < 1024 * 1024) {
      return Math.round(size / 1024 * 10) / 10 + ' KB';
    } else {
      return Math.round(size / 1024 / 1024 * 10) / 10 + ' MB';
    }
  };

  return (
    <div className="local-media-input">
      <h2>Local Media Input</h2>
      
      {!isConnected ? (
        <>
          <div className="input-options">
            <div className="media-card file-upload-section">
              <h3>Upload Video File</h3>
              <form onSubmit={handleFileUpload}>
                <div 
                  className={`file-drop-area ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                >
                  <input
                    type="file"
                    id="videoFile"
                    ref={fileInputRef}
                    accept="video/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  
                  <div className="file-drop-icon">
                    {selectedFile ? '🎬' : '📁'}
                  </div>
                  
                  {selectedFile ? (
                    <div className="selected-file-info">
                      <div className="file-name">{selectedFile.name}</div>
                      <div className="file-size">{getFileSize(selectedFile.size)}</div>
                    </div>
                  ) : (
                    <div className="file-prompt">
                      <span className="drop-text">Drag and drop your video file here</span>
                      <span className="or-text">- or -</span>
                      <span className="select-text">Click to select a file</span>
                    </div>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className={`btn btn-primary process-btn ${selectedFile ? 'active' : ''}`}
                  disabled={!selectedFile}
                >
                  <span className="btn-icon">▶️</span>
                  <span className="btn-text">Process Video File</span>
                </button>
              </form>
            </div>
            
            <div className="media-card camera-section">
              <h3>Use Camera</h3>
              <div className="camera-container">
                <video 
                  ref={videoRef} 
                  className="camera-preview" 
                  autoPlay 
                  playsInline 
                  muted
                  style={{ display: isCameraActive ? 'block' : 'none' }}
                />
                
                {!isCameraActive ? (
                  <button 
                    onClick={startCamera} 
                    className="btn btn-primary camera-btn"
                  >
                    <span className="btn-icon">📹</span>
                    <span className="btn-text">Start Camera</span>
                  </button>
                ) : (
                  <button 
                    onClick={stopCamera} 
                    className="btn btn-secondary camera-btn"
                  >
                    <span className="btn-icon">⏹️</span>
                    <span className="btn-text">Stop Camera</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {errorMessage && (
            <div className="error-message alert alert-danger mt-3">
              {errorMessage}
            </div>
          )}
        </>
      ) : (
        <div className={`connected-state media-card ${isProcessing ? 'isProcessing' : ''}`}>
          <div className="connected-media-info">
            <div className="connected-source-icon">
              {isCameraActive ? '📹' : '🎬'}
            </div>
            <div className="connected-file-info">
              <h4>Connected to {isCameraActive ? 'Camera' : 'Video File'}</h4>
              <p>{isCameraActive ? 'Live Camera Feed' : selectedFile?.name || 'Video File'}</p>
            </div>
          </div>
          
          <div className="connected-buttons">
            <button 
              onClick={handleProcessing} 
              className="btn-process"
            >
              <span className="btn-icon">▶️</span>
              {isProcessing ? 'Stop Processing' : 'Start Processing'}
            </button>
            
            <button 
              onClick={handleDisconnect} 
              className="btn-disconnect"
              disabled={isProcessing}
            >
              <span className="btn-icon">❌</span>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalMediaInput; 