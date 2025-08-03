"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, Plus, ArrowLeft, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { mediaDB, VideoFileRecord } from '@/lib/mediaDB';

// Helper to fetch uploaded files from localStorage (same as Sources page)
interface UploadedFile {
  id: number;
  name: string;
  uploadedAt: string;
  description: string;
  size: number;
  type: string;
  url?: string; // Add url for video preview if available
}

function getUploadedFiles(): UploadedFile[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('uploadedFiles');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function MonitorPage() {
  // State for page navigation
  const [currentPage, setCurrentPage] = useState<'main' | 'sessions' | 'analytics'>('main');
  // State for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<VideoFileRecord[]>([]);
  // State for selected file
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  // State for sessions
  const [sessions, setSessions] = useState<Array<{id: string, name: string, fileId: number, createdAt: string}>>([]);
  // Filter video files with keyword search
  const [searchKeyword, setSearchKeyword] = useState("");
  // State for processing (analytics page)
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  // --- Real-time Analytics State (always defined, only used in analytics page) ---
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemActive, setSystemActive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // --- Poll /api/status every 2.5s when on analytics page ---
  useEffect(() => {
    let mounted = true;
    if (currentPage === 'analytics') {
      const fetchStatus = async () => {
        try {
          const res = await fetch('http://localhost:5000/api/status');
          if (!res.ok) return;
          const data = await res.json();
          if (!mounted) return;
          setSystemActive(!!data.running);
          setAnalytics(data.detections);
          setLastUpdated(new Date().toLocaleTimeString());
        } catch {}
      };
      fetchStatus();
      pollingRef.current = setInterval(fetchStatus, 2500);
    }
    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentPage]);

  // Fetch uploaded files on mount
  useEffect(() => {
    mediaDB.videos.toArray().then(setUploadedFiles);
    // Load sessions from localStorage if any
    try {
      const storedSessions = localStorage.getItem('analyticsSessions');
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch {
      setSessions([]);
    }
  }, []);

  // Refresh uploaded files when entering the sessions page
  useEffect(() => {
    if (currentPage === 'sessions') {
      mediaDB.videos.toArray().then(setUploadedFiles);
    }
  }, [currentPage]);

  // Find selected file object
  const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

  // Handler for creating new session
  const handleCreateSession = () => {
    if (!selectedFileId || !selectedFile) return;
    
    const newSession = {
      id: Date.now().toString(),
      name: `Analytics - ${selectedFile.name}`,
      fileId: selectedFileId,
      createdAt: new Date().toISOString()
    };
    
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    
    // Save to localStorage
    try {
      localStorage.setItem('analyticsSessions', JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
    
    console.log("[MONITOR] Created new analytics session:", newSession);
    setCurrentPage('analytics');
  };

  // Handler for going back
  const handleGoBack = () => {
    if (currentPage === 'analytics') {
      setCurrentPage('sessions');
    } else if (currentPage === 'sessions') {
      setCurrentPage('main');
      setSelectedFileId(null);
    }
  };

  // Filter video files with keyword search
  const filteredVideoFiles = uploadedFiles
    .filter((f) => f.type === "video")
    .filter((f) => f.name.toLowerCase().includes(searchKeyword.toLowerCase()));

  // Main Monitor Page
  if (currentPage === 'main') {
    return (
      <div className="container mx-auto max-w-4xl p-6 space-y-8">
        {/* Page Header */}
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Monitor</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            Visualize analytics for live camera streams and uploaded media in your surveillance system.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Live Camera Analytics Card (disabled for now) */}
          <Card className="opacity-60 pointer-events-none">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Live Camera Analytics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-center text-base leading-relaxed">
                (Coming soon)
              </CardDescription>
            </CardContent>
          </Card>

          {/* Upload Media Analytics Card */}
          <Card 
            className="group hover:shadow-lg transition-shadow duration-300 border-0 shadow-md cursor-pointer"
            onClick={() => setCurrentPage('sessions')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors duration-300">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">Upload Media Analytics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-center text-base leading-relaxed">
                Analyze uploaded video and image files for events, anomalies, and trends. Review historical data and generate comprehensive reports from your media library.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Sessions Page
  if (currentPage === 'sessions') {
    return (
      <div className="container mx-auto max-w-4xl p-6 space-y-8">
        {/* Page Header with Back Button */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Sessions</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            Create new analytics sessions or view existing ones.
          </p>
        </div>

        {/* Create New Session Card */}
        <Card className="border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl font-semibold">Create New Session</CardTitle>
            <CardDescription className="text-base">
              Select a video file to start analyzing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search/Filter Input */}
            <div>
              <label className="block mb-2 text-sm font-medium">Search Videos</label>
              <input
                type="text"
                placeholder="Type to filter video files..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            {/* Select Video File */}
            <div>
              <label className="block mb-2 text-sm font-medium">Select Video File</label>
              <Select
                value={selectedFileId !== null ? selectedFileId.toString() : ""}
                onValueChange={v => setSelectedFileId(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a video file..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredVideoFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id?.toString() ?? ""}>
                      <div className="flex flex-col">
                        <span>{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredVideoFiles.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {searchKeyword ? "No matching video files found" : "No video files uploaded"}
                </div>
              )}
            </div>
            
            {/* Create Session Button */}
            <Button
              className="w-full"
              onClick={handleCreateSession}
              disabled={!selectedFileId}
            >
              Create Analytics Session
            </Button>
          </CardContent>
        </Card>

        {/* Existing Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Existing Sessions</h2>
            <div className="grid gap-4">
              {sessions.map((session) => {
                const sessionFile = uploadedFiles.find(f => f.id === session.fileId);
                return (
                  <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{session.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            File: {sessionFile?.name || 'Unknown file'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(session.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedFileId(session.fileId);
                            setCurrentPage('analytics');
                          }}
                        >
                          View Analytics
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Analytics Page
  if (currentPage === 'analytics' && selectedFile) {
    // Helper: Get color for card based on value
    const getCardColor = (val: number) => {
      if (val > 12) return 'bg-red-100 border-red-400';
      if (val >= 5) return 'bg-yellow-100 border-yellow-400';
      return 'bg-green-100 border-green-400';
    };
    // Helper: Get text color for value
    const getTextColor = (val: number) => {
      if (val > 12) return 'text-red-600';
      if (val >= 5) return 'text-yellow-700';
      return 'text-green-700';
    };
    // Helper: Green dot indicator
    const StatusDot = ({ active }: { active: boolean }) => (
      <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
    );

    // --- Helper: Render analytics cards ---
    const renderAnalyticsCards = () => {
      if (!analytics) return (
        <div className="text-center text-muted-foreground">Loading analytics...</div>
      );
      // Violence
      const violenceCount = analytics.violence?.length || 0;
      // Pose Anomalies (sum all subtypes)
      const pose = analytics.poseAnomalies || {};
      const poseCounts = Object.entries(pose).map(([k, v]) => ({ key: k, count: Array.isArray(v) ? v.length : 0 }));
      const poseTotal = poseCounts.reduce((a, b) => a + b.count, 0);
      // Other Anomalies (all subtypes)
      const other = analytics.otherAnomalies || {};
      const otherCounts = Object.entries(other).map(([k, v]) => ({ key: k, count: Array.isArray(v) ? v.length : 0 }));
      const otherTotal = otherCounts.reduce((a, b) => a + b.count, 0);
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Violence Card */}
          <div className={`rounded-lg border p-4 ${getCardColor(violenceCount)}`}>
            <div className="flex items-center mb-2">
              <span className="font-semibold text-lg">Violence</span>
            </div>
            <div className={`text-3xl font-bold ${getTextColor(violenceCount)}`}>{violenceCount}</div>
          </div>
          {/* Pose Anomalies Card */}
          <div className={`rounded-lg border p-4 ${getCardColor(poseTotal)}`}>
            <div className="font-semibold text-lg mb-1">Pose Anomalies</div>
            <div className={`text-3xl font-bold mb-2 ${getTextColor(poseTotal)}`}>{poseTotal}</div>
            <div className="space-y-1 text-sm">
              {poseCounts.map(({ key, count }) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Other Anomalies Card */}
          <div className={`rounded-lg border p-4 ${getCardColor(otherTotal)}`}>
            <div className="font-semibold text-lg mb-1">Other Anomalies</div>
            <div className={`text-3xl font-bold mb-2 ${getTextColor(otherTotal)}`}>{otherTotal}</div>
            <div className="space-y-1 text-sm">
              {otherCounts.map(({ key, count }) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    // Handler for Start Processing
    const handleStartProcessing = async () => {
      setProcessing(true);
      setProcessingError(null);
      setProcessingStatus("Preparing video and credentials...");
      try {
        const videoRecord = await mediaDB.videos.get(Number(selectedFileId));
        if (!videoRecord || !videoRecord.blob) {
          setProcessingError("Failed to read video file from database. Please re-upload or try another file.");
          setProcessing(false);
          return;
        }
        // Convert Blob to base64
        setProcessingStatus("Encoding video file...");
        const videoData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(videoRecord.blob);
        });
        // Get Telegram credentials from localStorage
        const telegramToken = localStorage.getItem("telegram_bot_token") || "";
        const telegramChatId = localStorage.getItem("telegram_chat_id") || "";
        if (!telegramToken || !telegramChatId) {
          setProcessingError("Telegram credentials not found. Please set them in Integrations.");
          setProcessing(false);
          return;
        }
        // Prepare request body
        const body = {
          sourceType: "file",
          videoData,
          telegramEnabled: true,
          telegramToken,
          telegramChatId,
          username: "User",
          email: "",
        };
        setProcessingStatus("Sending to backend for analytics...");
        // Send to backend
        const res = await fetch("http://localhost:5000/api/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errData = await res.json();
          setProcessingError(errData.detail || "Failed to start analytics.");
          setProcessing(false);
          return;
        }
        setProcessingStatus("Processing started! Waiting for results...");
      } catch (err: any) {
        setProcessingError(err.message || "Unknown error");
      } finally {
        setProcessing(false);
      }
    };

    return (
      <div className="container mx-auto max-w-6xl p-6 space-y-6">
        {/* Page Header with Back Button */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Button>
            {/* System Status Indicator */}
            <div className="ml-auto flex items-center space-x-2">
              <StatusDot active={systemActive} />
              <span className="text-sm font-medium">
                {systemActive ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            Analyzing: {selectedFile.name}
          </p>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdated}</div>
          )}
        </div>

        {/* Video Player Panel */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-card shadow-md p-6">
            <h3 className="font-semibold text-lg mb-4">Video Preview</h3>
            <video
              src={selectedFile.blob ? URL.createObjectURL(selectedFile.blob) : ''}
              controls
              className="w-full max-h-80 rounded-lg border"
            >
              Sorry, your browser does not support embedded videos.
            </video>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div>File: {selectedFile.name}</div>
              <div>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
              <div>Uploaded: {new Date(selectedFile.uploadedAt).toLocaleString()}</div>
            </div>
          </div>

          {/* Real-Time Analytics Cards */}
          <div className="rounded-lg border bg-card shadow-md p-6">
            <h3 className="font-semibold text-lg mb-4">Quick Stats</h3>
            {renderAnalyticsCards()}
            {/* Start Processing Button */}
            <Button
              className="w-full mt-6"
              onClick={handleStartProcessing}
              disabled={processing}
            >
              {processing ? "Processing..." : "Start Processing"}
            </Button>
            {processingError && (
              <div className="mt-2 text-sm text-red-500">{processingError}</div>
            )}
            {processingStatus && !processingError && (
              <div className="mt-2 text-sm text-muted-foreground">{processingStatus}</div>
            )}
          </div>
        </div>

        {/* Analytics Results Panel */}
        <div className="rounded-lg border bg-card shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Detailed Analytics</h3>
          <div className="space-y-6">
            {/* Processing Status */}
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <div className="text-lg font-medium">Processing Video...</div>
                <div className="text-sm text-muted-foreground">
                  Analytics will appear here after processing the selected video.
                  <br />
                  This may take a few moments depending on the video length.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}