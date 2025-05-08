# Surveillance Monitoring System

A real-time surveillance monitoring system with Supabase authentication and RTSP stream support.

## Features

- User authentication (signup, login, profile management)
- RTSP video stream connection and viewing
- Real-time analytics for detected anomalies
- Violence detection
- Pose anomaly detection
- Fire and other anomaly detection

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React context providers
│   ├── pages/           # Application pages
│   ├── supabase/        # Supabase client configuration
│   ├── styles/          # CSS styles
│   ├── utils/           # Utility functions
│   ├── App.js           # Main App component
│   └── index.js         # Entry point
└── package.json         # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account
- RTSPtoWeb for RTSP stream conversion

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd surveillance-system/frontend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the frontend root directory and add your Supabase credentials:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

### Running the Application

1. Start the frontend development server:

```bash
npm start
# or
yarn start
```

2. Set up RTSPtoWeb for RTSP stream conversion:

```bash
# Clone RTSPtoWeb repository
git clone https://github.com/deepch/RTSPtoWeb

# Go to the RTSPtoWeb directory
cd RTSPtoWeb

# Configure RTSP streams in config.json
# Edit the config.json file to include your RTSP stream URLs

# Run RTSPtoWeb
GO111MODULE=on go run *.go
```

3. Visit `http://localhost:3000` in your browser to access the application.

## RTSP Stream Connection

1. After logging in, navigate to the Dashboard.
2. Enter your RTSP stream URL in the format: `rtsp://username:password@ip:port/path`.
3. Click "Connect" to establish the connection.
4. Once connected, click "Start Processing" to begin analyzing the stream for anomalies.

## Backend Integration

The frontend integrates with the Python-based anomaly detection system. Make sure the `inference2.py` script is running to process the video streams and detect anomalies.

## Authentication

The application uses Supabase for user authentication. Create a Supabase project and configure the authentication settings in the Supabase dashboard.

## License

This project is licensed under the MIT License. 