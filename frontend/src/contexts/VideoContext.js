import React, { createContext, useState, useContext, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';

// Create a context for video streaming
const VideoContext = createContext();

// API URL for backend processing
const API_URL = 'http://localhost:5000/api';

// Custom hook to use the video context
export const useVideo = () => {
  return useContext(VideoContext);
};

// Provider component for video functionality
export const VideoProvider = ({ children }) => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const [streamUrl, setStreamUrl] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [localFile, setLocalFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [sourceType, setSourceType] = useState(''); // 'rtsp', 'file', or 'camera'
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [detections, setDetections] = useState({
    violence: 0,
    poseAnomalies: 0,
    otherAnomalies: 0,
  });
  const [statusInterval, setStatusInterval] = useState(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [statusInterval]);

  // Function to convert RTSP URL to web-compatible URL via RTSPtoWeb
  const convertToHlsUrl = (rtspUrl, streamId = 'cam1') => {
    // Base URL of your RTSPtoWeb server - modify this to match your setup
    const rtspToWebBase = 'http://localhost:8083';
    
    // Return HLS URL format
    return `${rtspToWebBase}/stream/${streamId}/channel/0/hls/live/index.m3u8`;
  };

  // Connect to a stream by setting the RTSP URL
  const connectToStream = (url) => {
    try {
      if (!url) {
        throw new Error('Please provide a valid RTSP URL');
      }
      
      // Reset other source types
      setLocalFile(null);
      setCameraStream(null);
      setSourceType('rtsp');
      
      // Store the original RTSP URL
      setRtspUrl(url);
      
      // Convert to HLS URL for web playback
      const hlsUrl = convertToHlsUrl(url);
      
      // Set the stream URL to be used by video component
      setStreamUrl(hlsUrl);
      setIsConnected(true);
      setError(null);
      
      return true;
    } catch (error) {
      console.error('Error connecting to stream:', error.message);
      setError(error.message);
      setIsConnected(false);
      return false;
    }
  };

  // Connect to a local video file
  const connectToLocalFile = (file) => {
    try {
      if (!file || !file.type.includes('video/')) {
        throw new Error('Please provide a valid video file');
      }
      
      // Reset other source types
      setRtspUrl('');
      setCameraStream(null);
      setSourceType('file');
      
      // Store the file
      setLocalFile(file);
      
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file);
      setStreamUrl(fileUrl);
      setIsConnected(true);
      setError(null);
      
      return true;
    } catch (error) {
      console.error('Error connecting to local file:', error.message);
      setError(error.message);
      setIsConnected(false);
      return false;
    }
  };

  // Connect to camera stream
  const connectToCamera = (stream) => {
    try {
      if (!stream) {
        throw new Error('Camera stream is not available');
      }
      
      // Reset other source types
      setRtspUrl('');
      setLocalFile(null);
      setSourceType('camera');
      
      // Store the stream
      setCameraStream(stream);
      
      // Create object URL for the stream
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video track found in camera stream');
      }
      
      setStreamUrl('camera');
      setIsConnected(true);
      setError(null);
      
      return true;
    } catch (error) {
      console.error('Error connecting to camera:', error.message);
      setError(error.message);
      setIsConnected(false);
      return false;
    }
  };

  // Disconnect from any media source
  const disconnectMedia = () => {
    // Revoke object URL if we have a file
    if (localFile && streamUrl) {
      URL.revokeObjectURL(streamUrl);
    }
    
    // Stop camera stream if active
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop processing if it's running
    if (isProcessing) {
      stopProcessing();
    }
    
    setStreamUrl('');
    setRtspUrl('');
    setLocalFile(null);
    setCameraStream(null);
    setSourceType('');
    setIsConnected(false);
    setIsProcessing(false);
  };

  // Alias for backward compatibility
  const disconnectStream = disconnectMedia;

  // Helper function to get status from backend
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      
      // Update detection counts from backend
      setDetections({
        violence: data.detections.violence || 0,
        poseAnomalies: data.detections.poseAnomalies || 0,
        otherAnomalies: data.detections.otherAnomalies || 0,
      });
      
      // Update processing state if it changed
      if (data.running !== isProcessing) {
        setIsProcessing(data.running);
      }
    } catch (error) {
      console.error('Error fetching status:', error.message);
    }
  };

  // Start processing the video with the backend service
  const startProcessing = async () => {
    try {
      if (!isConnected) {
        throw new Error('Please connect to a media source first');
      }
      
      // Prepare data for backend
      const data = {
        sourceType: sourceType,
        telegramEnabled: settings.telegramEnabled,
        telegramToken: settings.telegramToken,
        telegramChatId: settings.telegramChatId
      };
      
      // Add user information if available
      if (user) {
        data.username = user.user_metadata?.username || user.email?.split('@')[0] || 'Guest';
        data.email = user.email;
      }
      
      // Add source-specific data
      if (sourceType === 'rtsp') {
        data.rtspUrl = rtspUrl;
      } else if (sourceType === 'file' && localFile) {
        // Read the file and convert to base64
        const fileReader = new FileReader();
        
        const filePromise = new Promise((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result);
          fileReader.onerror = reject;
        });
        
        fileReader.readAsDataURL(localFile);
        data.videoData = await filePromise;
      } else if (sourceType === 'camera') {
        // No additional data needed for camera, backend will use system camera
      }
      
      // Call backend to start processing
      const response = await fetch(`${API_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start processing');
      }
      
      setIsProcessing(true);
      
      // Start interval to fetch status updates
      const interval = setInterval(fetchStatus, 2000);
      setStatusInterval(interval);
      
      return true;
    } catch (error) {
      console.error('Error starting processing:', error.message);
      setError(error.message);
      return false;
    }
  };

  // Stop processing the video
  const stopProcessing = async () => {
    try {
      // Call backend to stop processing
      const response = await fetch(`${API_URL}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error stopping processing:', errorData.message);
      }
      
      setIsProcessing(false);
      
      // Clear the status fetch interval
      if (statusInterval) {
        clearInterval(statusInterval);
        setStatusInterval(null);
      }
      
      return true;
    } catch (error) {
      console.error('Error stopping processing:', error.message);
      return false;
    } finally {
      // Reset detection counts
      setDetections({
        violence: 0,
        poseAnomalies: 0,
        otherAnomalies: 0,
      });
    }
  };

  // Value object to be provided to consumers of this context
  const value = {
    streamUrl,
    rtspUrl,
    localFile,
    cameraStream,
    sourceType,
    isConnected,
    isProcessing,
    error,
    detections,
    connectToStream,
    connectToLocalFile,
    connectToCamera,
    disconnectStream,
    disconnectMedia,
    startProcessing,
    stopProcessing,
    convertToHlsUrl,
  };

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}; 