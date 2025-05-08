import React, { useEffect, useState } from 'react';
import { useVideo } from '../contexts/VideoContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { detections, isProcessing } = useVideo();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartData, setChartData] = useState({
    violence: { labels: [], data: [] },
    poseAnomalies: { labels: [], data: [] },
    otherAnomalies: { labels: [], data: [] }
  });
  const [thresholds, setThresholds] = useState({
    violence: { warning: 1, alert: 2 },
    poseAnomalies: { warning: 1, alert: 3 },
    otherAnomalies: { warning: 1, alert: 3 }
  });
  
  // Get status color based on detection count and thresholds
  const getStatusColor = (type, count) => {
    if (count >= thresholds[type].alert) return 'red';
    if (count >= thresholds[type].warning) return 'yellow';
    return 'green';
  };
  
  // Get status text based on detection count
  const getStatusText = (count) => {
    if (count === 0) return 'Normal';
    if (count === 1) return 'Warning';
    return 'Alert';
  };

  // Update chart data whenever detections change
  useEffect(() => {
    if (isProcessing) {
      const timestamp = new Date().toLocaleTimeString();
      
      setChartData(prevData => ({
        violence: {
          labels: [...prevData.violence.labels, timestamp].slice(-10),
          data: [...prevData.violence.data, detections.violence].slice(-10)
        },
        poseAnomalies: {
          labels: [...prevData.poseAnomalies.labels, timestamp].slice(-10),
          data: [...prevData.poseAnomalies.data, detections.poseAnomalies].slice(-10)
        },
        otherAnomalies: {
          labels: [...prevData.otherAnomalies.labels, timestamp].slice(-10),
          data: [...prevData.otherAnomalies.data, detections.otherAnomalies].slice(-10)
        }
      }));
    }
  }, [detections, isProcessing]);
  
  // Tab Navigation Component
  const TabNavigation = () => (
    <div className="analytics-tabs">
      <button 
        className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} 
        onClick={() => setActiveTab('dashboard')}
      >
        Dashboard
      </button>
      <button 
        className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
        onClick={() => setActiveTab('charts')}
      >
        Charts
      </button>
    </div>
  );

  // Dashboard Content Component
  const Dashboard = () => (
    <div className="metrics-grid">
      <div className={`metric-card flash-card ${getStatusColor('violence', detections.violence)}`}>
        <h3>Violence Detection</h3>
        <div className="metric-value">
          <span className="number">{detections.violence}</span>
          <span className="label">Incidents</span>
        </div>
        <div className="status-indicator">
          {getStatusText(detections.violence)}
        </div>
      </div>
      
      <div className={`metric-card flash-card ${getStatusColor('poseAnomalies', detections.poseAnomalies)}`}>
        <h3>Pose Anomalies</h3>
        <div className="metric-value">
          <span className="number">{detections.poseAnomalies}</span>
          <span className="label">Detections</span>
        </div>
        <div className="status-indicator">
          {getStatusText(detections.poseAnomalies)}
        </div>
      </div>
      
      <div className={`metric-card flash-card ${getStatusColor('otherAnomalies', detections.otherAnomalies)}`}>
        <h3>Other Anomalies</h3>
        <div className="metric-value">
          <span className="number">{detections.otherAnomalies}</span>
          <span className="label">Detections</span>
        </div>
        <div className="status-indicator">
          {getStatusText(detections.otherAnomalies)}
        </div>
      </div>
    </div>
  );

  // Charts Content Component
  const Charts = () => {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      animation: {
        duration: 500
      },
      plugins: {
        legend: {
          display: false
        }
      }
    };

    const createChartConfig = (label, data, labels, borderColor) => ({
      labels,
      datasets: [
        {
          label,
          data,
          borderColor,
          backgroundColor: `${borderColor}33`,
          fill: true,
          tension: 0.4,
        }
      ]
    });

    return (
      <div className="charts-container">
        <div className="chart-row">
          <div className="chart-card">
            <h3>Violence Detections</h3>
            <div className="chart-wrapper">
              <Line 
                options={chartOptions} 
                data={createChartConfig('Violence', chartData.violence.data, chartData.violence.labels, '#ff4d4d')} 
              />
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-card">
            <h3>Pose Anomalies</h3>
            <div className="chart-wrapper">
              <Line 
                options={chartOptions} 
                data={createChartConfig('Pose Anomalies', chartData.poseAnomalies.data, chartData.poseAnomalies.labels, '#4d79ff')} 
              />
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-card">
            <h3>Other Anomalies</h3>
            <div className="chart-wrapper">
              <Line 
                options={chartOptions} 
                data={createChartConfig('Other Anomalies', chartData.otherAnomalies.data, chartData.otherAnomalies.labels, '#ffa64d')} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="analytics-container">
      <h2>Analytics</h2>
      
      <TabNavigation />
      
      {activeTab === 'dashboard' ? <Dashboard /> : <Charts />}
      
      <div className="analytics-status">
        <div className="status-indicator">
          <span className={`status-dot ${isProcessing ? 'active' : ''}`}></span>
          <span className="status-label">
            {isProcessing ? 'Analytics Running' : 'Analytics Idle'}
          </span>
        </div>
        
        <div className="alert-summary">
          {isProcessing ? (
            <p>
              {detections.violence > 0 || detections.poseAnomalies > 0 || detections.otherAnomalies > 0 ? (
                <span className="alert-text">Anomalies detected. Alerts will be sent via Telegram if enabled.</span>
              ) : (
                <span>No anomalies detected.</span>
              )}
            </p>
          ) : (
            <p>Start processing to detect anomalies.</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .analytics-tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
          margin-bottom: 20px;
        }
        
        .tab-button {
          padding: 10px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }
        
        .tab-button.active {
          border-bottom: 3px solid #4d79ff;
          font-weight: bold;
        }
        
        .charts-container {
          margin-top: 20px;
        }
        
        .chart-row {
          margin-bottom: 30px;
        }
        
        .chart-card {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .chart-card h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
        }
        
        .chart-wrapper {
          height: 250px;
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default Analytics; 