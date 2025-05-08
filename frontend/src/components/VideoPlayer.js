import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { useVideo } from '../contexts/VideoContext';

const VideoPlayer = ({ url, cameraMode = false }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const { cameraStream } = useVideo();

  useEffect(() => {
    // Don't initialize Video.js for camera mode
    if (cameraMode) {
      if (videoRef.current && cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      
      // Cleanup function for camera mode
      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }
    
    // For non-camera mode (RTSP/file)
    // Make sure Video.js player is initialized only once
    if (!playerRef.current) {
      const videoElement = videoRef.current;

      if (!videoElement) return;

      // Initialize videojs player
      playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        liveui: true, // Enable live UI components for streaming
        sources: url ? [
          {
            src: url,
            type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4' // HLS or MP4
          }
        ] : []
      }, function onPlayerReady() {
        console.log('Video player is ready');
      });
    } else {
      // If player already exists, update the source
      if (url) {
        playerRef.current.src({
          src: url,
          type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
        });
        playerRef.current.play().catch(error => {
          console.error('Error attempting to play:', error);
        });
      }
    }

    // Clean up function
    return () => {
      if (playerRef.current && !cameraMode) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [url, cameraMode, cameraStream]);

  // If no URL is provided, display a placeholder
  if (!url && !cameraMode) {
    return (
      <div className="video-placeholder">
        <h3>No stream connected</h3>
        <p>Please connect to a video source</p>
        <p><small>Choose your preferred source in the settings</small></p>
      </div>
    );
  }

  return (
    <div data-vjs-player className={cameraMode ? 'camera-player' : ''}>
      {cameraMode ? (
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: 'auto' }}
        />
      ) : (
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered vjs-live"
          playsInline
        />
      )}
      <div className="stream-info">
        <p><small>
          {cameraMode 
            ? 'Live camera feed from your device.'
            : url && url.includes('hls') 
              ? 'RTSP stream converted to HLS format.' 
              : 'Video file playback.'}
        </small></p>
      </div>
    </div>
  );
};

export default VideoPlayer; 