from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import threading
import os
import cv2
import tempfile
import base64
import time
import json
import subprocess
import signal
import asyncio
from typing import Optional, Dict, Any, Union
import numpy as np
from supabase import create_client
from os import environ
from notion_tools import NotionTools

# Set matplotlib backend before importing
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from ultralytics import YOLO, YOLOE
import io
from telegram import Bot
from telegram.ext import Application, ApplicationBuilder, CommandHandler, MessageHandler, filters
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
import supervision as sv
import torch
from agno.agent import Agent
from agno.models.google import Gemini
from agno.storage.sqlite import SqliteStorage
from agno.tools import Toolkit


load_dotenv(find_dotenv(filename=".env"))

# Save the notion Token and DB ID 
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = os.getenv("DATABASE_ID")

# Initialize FastAPI app
app = FastAPI(title="Surveillance API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)



# Global variables
inference_running = False
processing_thread = None
stop_event = threading.Event()
detections = {
    'violence': 0,
    'poseAnomalies': 0,
    'otherAnomalies': 0
}
cap = None
process_lock = threading.Lock()

# Telegram configuration
TOKEN = os.getenv("TELEGRAM_BOT_ID")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID2")
os.environ["AGNO_API_KEY"] = os.getenv("AGNO_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Temporary file paths
temp_dir = tempfile.mkdtemp()
temp_video = os.path.join(temp_dir, 'temp_video.mp4')

# Directories for saving frames
os.makedirs("violence_frames", exist_ok=True)
os.makedirs("anomaly_frames", exist_ok=True)

# Define device
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")

# Initialize models on the selected device
violence_model = None
pose_model = None
anomaly_model = None

# Tracking variables for detections
violence_detection_count = 0
violence_detection_threshold = 1
pose_anomaly_count = 0
pose_anomaly_threshold = 1
anomaly_count = 0
anomaly_threshold = 1
last_alert_time = 0
alert_cooldown = 60  # seconds
detection_times = []
frames_sent_count = 0
send_threshold = 1
pose_frames_sent_count = 0
pose_send_threshold = 1
anomaly_frames_sent_count = 0
anomaly_send_threshold = 1

# State variables for alerting
is_violence_active = False
is_pose_anomaly_active = False
is_anomaly_active = False

# Telegram bot instance and related variables
bot = None
alert_loop = None
alert_thread = None
telegram_thread = None
bot_initialized = False
bot_lock = threading.Lock()

# Classes to detect
NAMES_ANOMALY = ["Fire", "Black Smoke","White Smoke", "Knife", "Gun", "Blood"]
NAMES_OBJECT = ["Person", "Mask", "Vest", "Hat"]
NAMES_ANOMALY_OBJECT = NAMES_ANOMALY + NAMES_OBJECT
ANOMALY_INDICES = [0, 1, 2, 3, 4]

# Constants for pose estimation
ACTION_ANGLES = {
    'standing': {'hip': (170, 180), 'knee': (170, 180)},
    'sitting': {'hip': (85, 120), 'knee': (85, 120)},
    'walking': {'hip': (130, 170), 'knee': (130, 170)},
    'bending': {'hip': (45, 85), 'knee': (170, 180)},
    'falling': {'hip': (30, 80), 'knee': (30, 80)},
    'lying': {'hip': (160, 180), 'knee': (160, 180), 'vertical': False},
    'crouching': {'hip': (45, 90), 'knee': (30, 70)}
}
ANOMALY_ACTIONS = ['falling', 'lying', 'crouching']

# User ID for the agent
user_id = None  # Will be set dynamically based on the current user

# Add these global variables near the other tracking variables
pose_detection_times = []
anomaly_detection_times = []

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Custom tool for Agno agent
class SurveillanceState(Toolkit):
    name = "get_surveillance_state"
    description = "Get the current state of the surveillance system"
    
    def __init__(self):
        super().__init__()
        self.register(self.run)
    
    def run(self, query: str) -> str:
        with process_lock:
            state = {
                'violence_count': detections['violence'],
                'pose_anomaly_count': detections['poseAnomalies'],
                'anomaly_count': detections['otherAnomalies']
            }
        return f"Violence detections: {state['violence_count']}\nPose anomalies: {state['pose_anomaly_count']}\nOther anomalies: {state['anomaly_count']}"

# Create Agno agent with optimized settings
agent = None

# Agent lock
agent_lock = threading.Lock()

# Rate limiting for chat handler
last_chat_time = 0
chat_cooldown = 10  # seconds between agent invocations

# Define models for request/response validation
class StartInferenceRequest(BaseModel):
    sourceType: str
    rtspUrl: Optional[str] = None
    videoData: Optional[str] = None
    telegramEnabled: Optional[bool] = False
    telegramToken: Optional[str] = None
    telegramChatId: Optional[str] = None
    username: Optional[str] = None  # Username
    email: Optional[str] = None  # Add email field to identify user in database

class StatusResponse(BaseModel):
    running: bool
    detections: Dict[str, int]

class ApiResponse(BaseModel):
    status: str
    message: str

def initialize_models():
    """Initialize all ML models if they haven't been loaded yet"""
    global violence_model, pose_model, anomaly_model
    
    if violence_model is None:
        print("Loading violence detection model...")
        violence_model = YOLO("Violence/best.pt").to(device)
    
    if pose_model is None:
        print("Loading pose estimation model...")
        pose_model = YOLO("Pose/yolov8n-pose.pt").to(device)
    
    if anomaly_model is None:
        print("Loading anomaly detection model...")
        anomaly_model = YOLOE("yoloe-11m-seg.pt").to(device)
        anomaly_model.set_classes(NAMES_ANOMALY_OBJECT, anomaly_model.get_text_pe(NAMES_ANOMALY_OBJECT))

def initialize_agent():
    """Initialize the Agno agent if it hasn't been loaded yet"""
    global agent, user_id
    
    if agent is None and GOOGLE_API_KEY:
        print("Initializing Agno agent...")
        agent = Agent(
            name="Surveillance Agent",
            role="You are an Surveillance Assistant named REVA who provides information about the current state of the surveillance system",
            model=Gemini(id="gemini-2.5-flash-lite", api_key=GOOGLE_API_KEY),
            tools=[SurveillanceState(), NotionTools(NOTION_TOKEN, DATABASE_ID)],
            instructions=["You will be given a question on the surviellance system",
                        "You should be using the SurveillanceState Toolkit to answer the question",
                        "Provide a neat and concise answer",
                        "You should also be friendly and more engaging, offering a very good assistance to the user",
                        "Addtionally if the user tells to save the analytics or create a report on it , then you should use the NotionTools to save the analytics(got from the SurveillanceState Toolkit) or create a report on it",
                        "Use NotionTools for all CRUD operations: create_page to add new pages, get_pages to list pages, update_page to modify page properties, delete_page to archive pages, get_blocks to fetch page blocks, append_block to add blocks, update_block to modify block content, and delete_block to archive blocks.",
                        "The DB ID and API key for Notion are already provided to you",
                        f"User name is {user_id if user_id else 'Guest'}",
                        ],
            user_id=user_id if user_id else "Guest",
            storage=SqliteStorage(table_name="surveillance_agent_history", db_file="surveillance_agent.db"),
            monitoring=True,
            add_history_to_messages=True,
            num_history_responses=5,
            read_chat_history=True,
            add_session_summary_references=True,
            add_datetime_to_instructions=True, 
        )

def initialize_telegram_bot(custom_token=None, custom_chat_id=None):
    """Initialize the Telegram bot and all related functionality"""
    global bot, alert_loop, alert_thread, telegram_thread, bot_initialized, TOKEN, CHAT_ID
    
    with bot_lock:
        # If the bot is already initialized, don't initialize it again
        if bot_initialized:
            print("Telegram bot already initialized, skipping initialization")
            return
        
        # Use custom credentials if provided, otherwise fall back to environment variables
        if custom_token and custom_chat_id:
            effective_token = custom_token
            effective_chat_id = custom_chat_id
            print(f"Using custom Telegram credentials provided by user: token={effective_token[:5]}..., chat_id={effective_chat_id}")
        else:
            effective_token = TOKEN
            effective_chat_id = CHAT_ID
            print("Using default Telegram credentials from environment variables")
        
        # Validate token and chat_id are not empty
        if not effective_token or not effective_chat_id:
            print("Warning: Telegram token or chat ID is empty, alerts will be disabled")
            bot = None
            bot_initialized = False
            return
            
        # Store the effective values for use in alert functions
        TOKEN = effective_token
        CHAT_ID = effective_chat_id
        
        try:
            print("Initializing Telegram bot...")
            bot = Bot(token=effective_token)
            
            # Test the connection to validate token
            async def test_bot():
                try:
                    me = await bot.get_me()
                    print(f"Bot initialized successfully: {me.first_name} (@{me.username})")
                    
                    # Test sending a message to validate chat ID
                    try:
                        await bot.send_message(chat_id=effective_chat_id, text="Surveillance system connected. Ready to send alerts.")
                        print(f"Successfully sent test message to chat ID: {effective_chat_id}")
                    except Exception as e:
                        print(f"Error sending test message to chat: {str(e)}")
                        return False
                    return True
                except Exception as e:
                    print(f"Error validating bot token: {str(e)}")
                    return False
            
            # Create alert event loop
            alert_loop = asyncio.new_event_loop()
            
            # Run alert loop in a separate thread
            alert_thread = threading.Thread(target=run_alert_loop, daemon=True)
            alert_thread.start()
            
            # Test the bot connection
            test_result = asyncio.run_coroutine_threadsafe(test_bot(), alert_loop).result(timeout=10)
            if not test_result:
                print("Bot validation failed, alerts will be disabled")
                bot = None
                bot_initialized = False
                return
            
            # Start the Telegram bot in a separate thread
            telegram_thread = threading.Thread(target=run_telegram_bot, daemon=True)
            telegram_thread.start()
            
            bot_initialized = True
            print("Telegram bot initialized successfully")
        except Exception as e:
            print(f"Error initializing Telegram bot: {e}")
            bot = None
            bot_initialized = False

def run_alert_loop():
    """Run the alert event loop for sending Telegram notifications"""
    asyncio.set_event_loop(alert_loop)
    try:
        alert_loop.run_forever()
    except Exception as e:
        print(f"Error in alert loop: {str(e)}")
    finally:
        alert_loop.close()

def run_telegram_bot():
    """Run the Telegram bot for interactive commands"""
    global TOKEN
    
    try:
        # Set up a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Build the application using ApplicationBuilder
        app = ApplicationBuilder().token(TOKEN).build()
        
        # Set up the shutdown future to cleanly stop the bot
        shutdown_future = loop.create_future()

        async def status(update, context):
            with process_lock:
                state = {
                    'violence_count': detections['violence'],
                    'pose_anomaly_count': detections['poseAnomalies'],
                    'anomaly_count': detections['otherAnomalies']
                }
            message = f"Current Surveillance State:\n"
            message += f"Violence detections: {state['violence_count']}\n"
            message += f"Pose anomalies: {state['pose_anomaly_count']}\n"
            message += f"Other anomalies: {state['anomaly_count']}\n"
            await update.message.reply_text(message)

        async def chat(update, context):
            global last_chat_time
            current_time = time.time()
            if current_time - last_chat_time < chat_cooldown:
                await update.message.reply_text("Please wait a moment before sending another message (rate limit).")
                return
            
            user_message = update.message.text
            try:
                with agent_lock:
                    response = agent.run(user_message)
                    if hasattr(response, 'content'):
                        reply = response.content
                    elif isinstance(response, str):
                        reply = response
                    else:
                        reply = "Error processing response from agent."
                await update.message.reply_text(reply)
                last_chat_time = current_time
            except Exception as e:
                await update.message.reply_text(f"Error: {str(e)}. Please try again later.")
                print(f"Error in chat handler: {str(e)}")

        # Add handlers
        app.add_handler(CommandHandler("status", status))
        app.add_handler(MessageHandler(filters.Text() & ~filters.Command(), chat))

        # Start the bot
        print("Starting Telegram bot polling...")
        loop.run_until_complete(app.run_polling(stop_signals=None, close_loop=False))
    except Exception as e:
        print(f"Error in Telegram bot: {str(e)}")
    finally:
        if loop and loop.is_running():
            loop.close()
        print("Telegram bot polling stopped")

def create_analytics_chart(detection_type):
    """Create a matplotlib chart of detections over time for different types"""
    try:
        if detection_type == 'violence' and detection_times:
            times = [datetime.fromtimestamp(t) for t in detection_times]
            counts = np.arange(1, len(detection_times) + 1)
            title = 'Violence Detection Over Time'
        elif detection_type == 'pose' and pose_detection_times:
            times = [datetime.fromtimestamp(t) for t in pose_detection_times]
            counts = np.arange(1, len(pose_detection_times) + 1)
            title = 'Pose Anomaly Detection Over Time'
        elif detection_type == 'anomaly' and anomaly_detection_times:
            times = [datetime.fromtimestamp(t) for t in anomaly_detection_times]
            counts = np.arange(1, len(anomaly_detection_times) + 1)
            title = 'Other Anomaly Detection Over Time'
        else:
            return None

        # Create a new figure for thread safety
        fig = plt.figure(figsize=(10, 6))
        plt.plot(times, counts, marker='o', linestyle='--', color='red')
        plt.xlabel('Time')
        plt.ylabel('Cumulative Detections')
        plt.title(title)
        fig.autofmt_xdate()
        
        # Save to buffer
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        
        # Close the figure to prevent memory leaks
        plt.close(fig)
        return buf
    except Exception as e:
        print(f"Error creating analytics chart: {str(e)}")
    return None

async def send_violence_alert(timestamp, violence_detection_count, frame):
    """Send a Telegram alert for violence detection"""
    global frames_sent_count, last_alert_time
    current_time = time.time()
    if current_time - last_alert_time < alert_cooldown:
        print("Alert cooldown active, skipping violence alert")
        return
    
    try:
        message = f"⚠️ <b>VIOLENCE DETECTED</b> ⚠️\nTime: {timestamp}\nDetection count: {violence_detection_count}"
        await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode='HTML')
        print("Sent text message for violence alert")
        
        frame_path = f"violence_frames/violence_{timestamp}.jpg"
        cv2.imwrite(frame_path, frame)
        with open(frame_path, 'rb') as photo:
            await bot.send_photo(chat_id=CHAT_ID, photo=photo)
        print("Sent photo for violence alert")
        
        chart_buf = create_analytics_chart('violence')
        if chart_buf:
            try:
                await bot.send_photo(chat_id=CHAT_ID, photo=chart_buf.getvalue())
                print("Sent chart for violence alert")
            except Exception as e:
                print(f"Error sending chart: {str(e)}")
            
        frames_sent_count += 1
        last_alert_time = current_time
    except Exception as e:
        print(f"Error sending violence alert: {str(e)}")

async def send_pose_alert(action, timestamp, frame):
    """Send a Telegram alert for pose anomaly detection"""
    global pose_frames_sent_count, last_alert_time
    current_time = time.time()
    if current_time - last_alert_time < alert_cooldown:
        print("Alert cooldown active, skipping pose alert")
        return
    
    try:
        message = f"⚠️ <b>POSE ANOMALY DETECTED</b> ⚠️\nAction: {action}\nTime: {timestamp}"
        await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode='HTML')
        print("Sent text message for pose alert")
        
        frame_path = f"anomaly_frames/anomaly_{timestamp}.jpg"
        cv2.imwrite(frame_path, frame)
        with open(frame_path, 'rb') as photo:
            await bot.send_photo(chat_id=CHAT_ID, photo=photo)
        print("Sent photo for pose alert")
        
        chart_buf = create_analytics_chart('pose')
        if chart_buf:
            try:
                await bot.send_photo(chat_id=CHAT_ID, photo=chart_buf.getvalue())
                print("Sent chart for pose alert")
            except Exception as e:
                print(f"Error sending chart: {str(e)}")
        
        pose_frames_sent_count += 1
        last_alert_time = current_time
    except Exception as e:
        print(f"Error sending pose anomaly alert: {str(e)}")

async def send_anomaly_alert(timestamp, anomaly_count, frame):
    """Send a Telegram alert for general anomaly detection"""
    global anomaly_frames_sent_count, last_alert_time
    current_time = time.time()
    if current_time - last_alert_time < alert_cooldown:
        print("Alert cooldown active, skipping anomaly alert")
        return
    
    try:
        message = f"⚠️ <b>ANOMALY DETECTED</b> ⚠️\nTime: {timestamp}\nAnomaly count: {anomaly_count}"
        await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode='HTML')
        print("Sent text message for anomaly alert")
        
        frame_path = f"anomaly_frames/anomaly_{timestamp}.jpg"
        cv2.imwrite(frame_path, frame)
        with open(frame_path, 'rb') as photo:
            await bot.send_photo(chat_id=CHAT_ID, photo=photo)
        print("Sent photo for anomaly alert")
        
        chart_buf = create_analytics_chart('anomaly')
        if chart_buf:
            try:
                await bot.send_photo(chat_id=CHAT_ID, photo=chart_buf.getvalue())
                print("Sent chart for anomaly alert")
            except Exception as e:
                print(f"Error sending chart: {str(e)}")
        
        anomaly_frames_sent_count += 1
        last_alert_time = current_time
    except Exception as e:
        print(f"Error sending anomaly alert: {str(e)}")

def calculate_angle(a, b, c):
    """Calculate the angle between three points"""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180:
        angle = 360 - angle
    return angle

def determine_action(keypoints):
    """Determine the action based on pose keypoints"""
    hip = keypoints[11]
    knee = keypoints[13]
    ankle = keypoints[15]
    shoulder = keypoints[5]
    hip_angle = calculate_angle(shoulder, hip, knee)
    knee_angle = calculate_angle(hip, knee, ankle)
    is_vertical = abs(shoulder[1] - ankle[1]) > abs(shoulder[0] - ankle[0])
    
    for action, angles in ACTION_ANGLES.items():
        if 'vertical' in angles and angles['vertical'] is False and is_vertical:
            continue
        if 'vertical' in angles and angles['vertical'] is True and not is_vertical:
            continue
        if angles['hip'][0] <= hip_angle <= angles['hip'][1] and angles['knee'][0] <= knee_angle <= angles['knee'][1]:
            return action
            
    return 'unknown'

def inference_worker(source_path, stop_event):
    """Main worker function for running inference on video frames"""
    global inference_running, detections, cap, is_violence_active, is_pose_anomaly_active, is_anomaly_active
    
    print(f"Starting inference on source: {source_path}")
    
    # Open video capture
    if isinstance(source_path, str) and source_path.isdigit():
        source_path = int(source_path)
    
    cap = cv2.VideoCapture(source_path)
    if not cap.isOpened():
        print(f"Error: Could not open video source {source_path}")
        inference_running = False
        return
    
    # Reset detection counters and times
    with process_lock:
        detections['violence'] = 0
        detections['poseAnomalies'] = 0
        detections['otherAnomalies'] = 0
        detection_times.clear()
        pose_detection_times.clear()
        anomaly_detection_times.clear()
    
    inference_running = True
    is_violence_active = False
    is_pose_anomaly_active = False
    is_anomaly_active = False
    
    try:
        while inference_running and not stop_event.is_set():
            # Read a frame
            ret, frame = cap.read()
            if not ret:
                print("End of video stream")
                break
            
            # Violence detection
            violence_results = violence_model(frame, conf=0.5, imgsz=320)
            violence_detected = False
            for result in violence_results:
                for box in result.boxes:
                    if box.cls[0] == 1:
                        violence_detected = True
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(frame, "Violence", (x1, y1), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            if violence_detected:
                if not is_violence_active:
                    with process_lock:
                        detections['violence'] += 1
                    detection_times.append(time.time())
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    if detections['violence'] >= violence_detection_threshold and bot and frames_sent_count < send_threshold:
                        asyncio.run_coroutine_threadsafe(
                            send_violence_alert(timestamp, detections['violence'], frame),
                            alert_loop
                        )
                    is_violence_active = True
            else:
                is_violence_active = False
            
            # Pose estimation
            try:
                results = pose_model(frame, imgsz=320)
                if results and results[0].keypoints is not None:
                    annotated_frame = results[0].plot()
                    for i, person in enumerate(results[0].keypoints.data):
                        keypoints = person.numpy()[:, :2]
                        action = determine_action(keypoints)
                        if results[0].boxes is not None and len(results[0].boxes) > i:
                            box = results[0].boxes[i].xyxy[0].cpu().numpy().astype(int)
                            text_position = (box[0], box[1] - 10)
                        else:
                            text_position = (10, 30 + i*20)
                        cv2.putText(annotated_frame, action, text_position, cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                        if action in ANOMALY_ACTIONS:
                            if not is_pose_anomaly_active:
                                with process_lock:
                                    detections['poseAnomalies'] += 1
                                pose_detection_times.append(time.time())
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                if detections['poseAnomalies'] >= pose_anomaly_threshold and bot and pose_frames_sent_count < pose_send_threshold:
                                    asyncio.run_coroutine_threadsafe(
                                        send_pose_alert(action, timestamp, annotated_frame),
                                        alert_loop
                                    )
                                is_pose_anomaly_active = True
                        else:
                            is_pose_anomaly_active = False
                    frame = annotated_frame
            except Exception as e:
                print(f"Pose estimation error: {e}")
            
            # Anomaly detection (fire, smoke, weapons, etc.)
            try:
                results = anomaly_model.predict(frame, imgsz=320, conf=0.1, verbose=False)
                detections_sv = sv.Detections.from_ultralytics(results[0])
                frame = sv.BoxAnnotator().annotate(scene=frame, detections=detections_sv)
                frame = sv.LabelAnnotator().annotate(scene=frame, detections=detections_sv)
                
                detected_classes = results[0].boxes.cls.cpu().numpy().astype(int).tolist()
                if any(cls in ANOMALY_INDICES for cls in detected_classes):
                    if not is_anomaly_active:
                        with process_lock:
                            detections['otherAnomalies'] += 1
                        anomaly_detection_times.append(time.time())
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        if detections['otherAnomalies'] >= anomaly_threshold and bot and anomaly_frames_sent_count < anomaly_send_threshold:
                            asyncio.run_coroutine_threadsafe(
                                send_anomaly_alert(timestamp, detections['otherAnomalies'], frame),
                                alert_loop
                            )
                        is_anomaly_active = True
                else:
                    is_anomaly_active = False
            except Exception as e:
                print(f"Anomaly detection error: {e}")
            
            # Delay to not overload the CPU/GPU
            time.sleep(0.01)
            
    except Exception as e:
        print(f"Error in inference worker: {e}")
    finally:
        # Release resources
        if cap is not None:
            cap.release()
        
        inference_running = False
        print("Inference worker stopped")

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """Get the current status of inference processing"""
    return {
        'running': inference_running,
        'detections': detections
    }

@app.post("/api/start", response_model=ApiResponse)
async def start_inference(request: StartInferenceRequest):
    """Start the inference process"""
    global processing_thread, inference_running, stop_event, cap, process_lock, user_id
    
    with process_lock:
        # If inference is already running, stop it first
        if inference_running:
            raise HTTPException(status_code=400, detail="Inference is already running")
        
        # Set the user_id from the request
        user_id = request.username
        
        # Initialize telegram settings from request
        telegram_enabled = request.telegramEnabled
        telegram_token = request.telegramToken
        telegram_chat_id = request.telegramChatId
        
        # If Supabase is configured and email is provided, try to get user settings
        if supabase and request.email:
            try:
                # Query user settings from Supabase
                response = supabase.table('user_settings').select('*').eq('user_email', request.email).execute()
                
                if response.data and len(response.data) > 0:
                    user_data = response.data[0]
                    print(f"Found user settings in database for email: {request.email}")
                    
                    # Update user_id from database if available and not provided in request
                    if not user_id and user_data.get('user_name'):
                        user_id = user_data.get('user_name')
                        print(f"Using username from database: {user_id}")
                    
                    # Use Telegram settings from database
                    if user_data.get('telegram_enabled') is not None:
                        telegram_enabled = user_data.get('telegram_enabled')
                    
                    # Only use token and chat_id from database if they're not empty
                    if user_data.get('telegram_token'):
                        telegram_token = user_data.get('telegram_token')
                        print("Using Telegram token from database")
                    
                    if user_data.get('telegram_chat_id'):
                        telegram_chat_id = user_data.get('telegram_chat_id')
                        print("Using Telegram chat ID from database")
            except Exception as e:
                print(f"Error loading user settings from Supabase: {e}")
        
        # Log the Telegram settings being used
        print(f"Telegram enabled: {telegram_enabled}")
        print(f"Telegram token available: {'Yes' if telegram_token else 'No'}")
        print(f"Telegram chat ID available: {'Yes' if telegram_chat_id else 'No'}")
        
        # Reset the stop event
        stop_event.clear()
        
        # Ensure resources from previous run are cleaned up
        if processing_thread and processing_thread.is_alive():
            stop_event.set()
            processing_thread.join(timeout=5)
            stop_event.clear()
        
        if cap is not None:
            cap.release()
            cap = None
        
        # Clean up Telegram bot from previous sessions
        cleanup_telegram_bot()
        
        try:
            # Initialize models and agent
            initialize_models()
            initialize_agent()
            
            # Initialize Telegram bot for alerts if enabled and credentials are available
            if telegram_enabled and telegram_token and telegram_chat_id:
                initialize_telegram_bot(telegram_token, telegram_chat_id)
            else:
                print("Telegram alerts disabled or incomplete credentials")
            
            # Start the inference in a separate thread
            source = get_video_source(request)
            print(f"Starting inference on source: {source}")
            
            # Reset detections
            detections['violence'] = 0
            detections['poseAnomalies'] = 0
            detections['otherAnomalies'] = 0
            
            # Create a new thread for inference
            processing_thread = threading.Thread(target=inference_worker, args=(source, stop_event))
            processing_thread.daemon = True
            processing_thread.start()
            
            # Update state
            inference_running = True
            
            return {"status": "success", "message": "Inference started"}
        except Exception as e:
            # Clean up in case of error
            if cap is not None:
                cap.release()
                cap = None
            
            cleanup_telegram_bot()
            inference_running = False
            raise HTTPException(status_code=500, detail=f"Error starting inference: {str(e)}")

def get_video_source(request):
    """Determine the video source from the request"""
    source_type = request.sourceType
    
    if source_type == 'rtsp':
        # Use RTSP URL directly
        if not request.rtspUrl:
            raise HTTPException(status_code=400, detail="RTSP URL is required for rtsp source type")
        return request.rtspUrl
    
    elif source_type == 'file':
        # Save base64 video to a temporary file
        video_data = request.videoData
        if not video_data:
            raise HTTPException(status_code=400, detail="Video data is required for file source type")
        
        video_bytes = base64.b64decode(video_data.split(',')[1] if ',' in video_data else video_data)
        with open(temp_video, 'wb') as f:
            f.write(video_bytes)
        return temp_video
    
    elif source_type == 'camera':
        # Use webcam (0)
        return 0
    
    else:
        raise HTTPException(status_code=400, detail="Invalid source type")

@app.post("/api/stop", response_model=ApiResponse)
async def stop_inference():
    """Stop the inference process"""
    global inference_running, cap, stop_event
    
    with process_lock:
        if not inference_running:
            raise HTTPException(status_code=400, detail="Inference is not running")
        
        # Signal the worker thread to stop
        stop_event.set()
        
        # Wait for the thread to finish
        if processing_thread and processing_thread.is_alive():
            processing_thread.join(timeout=5)
        
        # Force release the video capture if still open
        if cap is not None:
            cap.release()
            cap = None
        
        # Reset state
        inference_running = False
        
        # Reset detections
        detections['violence'] = 0
        detections['poseAnomalies'] = 0
        detections['otherAnomalies'] = 0
        
        # Clean up Telegram bot resources
        cleanup_telegram_bot()
        
        return {"status": "success", "message": "Inference stopped"}

def cleanup_telegram_bot():
    """Clean up Telegram bot resources when stopping inference"""
    global bot, alert_loop, alert_thread, telegram_thread, bot_initialized
    
    with bot_lock:
        if bot_initialized:
            print("Cleaning up Telegram bot resources...")
            
            # Stop the alert loop if it's running
            if alert_loop and alert_loop.is_running():
                alert_loop.call_soon_threadsafe(alert_loop.stop)
            
            # Set the flag to indicate bot is no longer initialized
            bot_initialized = False
            
            print("Telegram bot resources cleaned up")

# Create a sample detections.json file with initial values
def create_initial_detections_file():
    with open('detections.json', 'w') as f:
        json.dump({
            'violence_count': 0,
            'pose_anomaly_count': 0,
            'anomaly_count': 0
        }, f)

# Startup event
@app.on_event("startup")
async def startup_event():
    create_initial_detections_file()

# Run the app with uvicorn
if __name__ == '__main__':
    import uvicorn
    create_initial_detections_file()
    uvicorn.run(app, host="0.0.0.0", port=5000) 