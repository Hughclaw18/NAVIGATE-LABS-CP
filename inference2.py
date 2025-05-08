import cv2
import numpy as np
from ultralytics import YOLO, YOLOE
import os
import io
import asyncio
import threading
import matplotlib.pyplot as plt
from telegram import Bot
from telegram.ext import Application, ApplicationBuilder, CommandHandler, MessageHandler, filters
from datetime import datetime
import time
from dotenv import load_dotenv, find_dotenv
from colorama import Fore
import supervision as sv
import torch
from agno.agent import Agent
from agno.models.google import Gemini
from agno.storage.sqlite import SqliteStorage
from agno.tools import Toolkit
import json
import argparse

# Add argument parsing for source
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=str, default="fire2.mp4", help='video source (file, rtsp, or webcam)')
args = parser.parse_args()

# Load environment variables
load_dotenv(find_dotenv(filename=".env"))

# Telegram bot token and chat ID
TOKEN = os.getenv("TELEGRAM_BOT_ID")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID2")
os.environ["AGNO_API_KEY"] = os.getenv("AGNO_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Print Telegram configuration for debugging
print(f"Telegram Token: {TOKEN[:4]}...{TOKEN[-4:] if TOKEN else None}")
print(f"Telegram Chat ID: {CHAT_ID}")

# Define device
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")

# Initialize models on the selected device
violence_model = YOLO("Violence/best.pt").to(device)
pose_model = YOLO("Pose/yolov8n-pose.pt").to(device)
anomaly_model = YOLOE("yoloe-11m-seg.pt").to(device)

# Initialize counters and tracking variables
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

# Shared state for surveillance system
surveillance_state = {
    'violence_count': 0,
    'pose_anomaly_count': 0,
    'anomaly_count': 0,
}
state_lock = threading.Lock()

# Function to save surveillance state to a JSON file for web integration
def save_surveillance_state():
    with state_lock:
        state = surveillance_state.copy()
    
    try:
        with open('detections.json', 'w') as f:
            json.dump({
                'violence_count': state['violence_count'],
                'pose_anomaly_count': state['pose_anomaly_count'],
                'anomaly_count': state['anomaly_count'],
                'timestamp': datetime.now().isoformat()
            }, f)
        print(f"Updated detections file with: {state}")
    except Exception as e:
        print(f"Error saving detections.json: {e}")

# Set up a thread to periodically save the detection state
def run_state_saver():
    while True:
        save_surveillance_state()
        time.sleep(1)  # Update state every second

# Start the state saver thread
state_saver_thread = threading.Thread(target=run_state_saver, daemon=True)
state_saver_thread.start()
print("State saver thread started")

# Classes to detect
NAMES_ANOMALY = ["Fire", "Smoke", "Knife", "Gun", "Blood"]
NAMES_OBJECT = ["Person", "Mask", "Vest", "Hat"]
NAMES_ANOMALY_OBJECT = NAMES_ANOMALY + NAMES_OBJECT
ANOMALY_INDICES = [0, 1, 2, 3, 4]

# Set classes for anomaly model
anomaly_model.set_classes(NAMES_ANOMALY_OBJECT, anomaly_model.get_text_pe(NAMES_ANOMALY_OBJECT))

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


# User ID
user_id = "Atharsh"

# Custom tool for Agno agent
class SurveillanceState(Toolkit):
    name = "get_surveillance_state"
    description = "Get the current state of the surveillance system"
    
    def __init__(self):
        super().__init__()
        self.register(self.run)
    
    def run(self, query: str) -> str:
        with state_lock:
            state = surveillance_state.copy()
        return f"Violence detections: {state['violence_count']}\nPose anomalies: {state['pose_anomaly_count']}\nOther anomalies: {state['anomaly_count']}"

# Create Agno agent with optimized settings
agent = Agent(
    name="Surveillance Agent",
    role="You are an Surveillance Assistant named REVA who provides information about the current state of the surveillance system",
    model=Gemini(id="gemini-2.0-flash-exp", api_key=GOOGLE_API_KEY),
    tools=[SurveillanceState()],
    instructions=["You will be given a question on the surviellance system",
                  "You should be using the SurveillanceState Toolkit to answer the question",
                  "Provide a neat and concise answer",
                  "You should also be friendly and more engaging , offering a very good assitance to the user",
                  f"User name is {user_id}",
                  ],
    user_id = user_id,
    storage=SqliteStorage(table_name="surveillance_agent_history",db_file="surveillance_agent.db"),
    monitoring=True,  # Disable monitoring to prevent background API calls
    add_history_to_messages=True,  # Keep history for conversation context
    num_history_responses=2,  # Reduce history to minimize API payload
    read_chat_history=True,  # Allow reading history for context
)
agent_lock = threading.Lock()

# Rate limiting for chat handler
last_chat_time = 0
chat_cooldown = 10  # seconds between agent invocations

# Function to calculate angle between three points
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180:
        angle = 360 - angle
    return angle

# Function to determine action based on angles
def determine_action(keypoints):
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

# Directories for saving frames
os.makedirs("violence_frames", exist_ok=True)
os.makedirs("anomaly_frames", exist_ok=True)

def create_analytics_chart():
    if detection_times:
        times = [datetime.fromtimestamp(t) for t in detection_times]
        counts = np.arange(1, len(detection_times) + 1)
        plt.figure(figsize=(10, 6))
        plt.plot(times, counts, marker='o', linestyle='--', color='red')
        plt.xlabel('Time')
        plt.ylabel('Cumulative Detections')
        plt.title('Violence Detection Over Time')
        plt.gcf().autofmt_xdate()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        plt.close()
        return buf
    return None

async def send_violence_alert(timestamp, violence_detection_count, frame):
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
        chart_buf = create_analytics_chart()
        if chart_buf:
            await bot.send_photo(chat_id=CHAT_ID, photo=chart_buf.getvalue())
            print("Sent chart for violence alert")
        frames_sent_count += 1
        last_alert_time = current_time
    except Exception as e:
        print(f"Error sending violence alert: {str(e)}")

async def send_pose_alert(action, timestamp, frame):
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
        pose_frames_sent_count += 1
        last_alert_time = current_time
    except Exception as e:
        print(f"Error sending pose anomaly alert: {str(e)}")

async def send_anomaly_alert(timestamp, anomaly_count, frame):
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
        anomaly_frames_sent_count += 1
        last_alert_time = current_time
    except Exception as e:
        print(f"Error sending anomaly alert: {str(e)}")

# Dedicated event loop for sending alerts
alert_loop = asyncio.new_event_loop()
def run_alert_loop():
    asyncio.set_event_loop(alert_loop)
    try:
        alert_loop.run_forever()
    except Exception as e:
        print(f"Error in alert loop: {str(e)}")
    finally:
        alert_loop.close()

alert_thread = threading.Thread(target=run_alert_loop, daemon=True)
alert_thread.start()

def run_telegram_bot():
    try:
        # Set up a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Build the application using ApplicationBuilder
        app = ApplicationBuilder().token(TOKEN).build()

        async def status(update, context):
            with state_lock:
                state = surveillance_state.copy()
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
        loop.run_until_complete(app.run_polling())
    except Exception as e:
        print(f"Error in Telegram bot: {str(e)}")
    finally:
        loop.close()

# Initialize Telegram bot outside conditionals
bot = None
if TOKEN and CHAT_ID:
    try:
        bot = Bot(token=TOKEN)
        print("Telegram bot initialized successfully")
        
        # Start the telegram bot thread
        telegram_thread = threading.Thread(target=run_telegram_bot, daemon=True)
        telegram_thread.start()
        print("Telegram bot thread started")
    except Exception as e:
        print(f"Error initializing Telegram bot: {e}")
        bot = None
else:
    print("No Telegram token or chat ID found. Alerts disabled.")

# Use the source from command line arguments
source = args.source
print(f"Using video source: {source}")
if source.isdigit():
    # Convert string digit to integer for webcam
    source = int(source)

cap = cv2.VideoCapture(source)
cv2.namedWindow("Object, Violence, and Pose Detection", cv2.WINDOW_NORMAL)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Violence detection
    violence_results = violence_model(frame, conf=0.65, imgsz=320)
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
            with state_lock:
                surveillance_state['violence_count'] += 1
            detection_times.append(time.time())
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            if surveillance_state['violence_count'] >= violence_detection_threshold and bot and frames_sent_count < send_threshold:
                asyncio.run_coroutine_threadsafe(
                    send_violence_alert(timestamp, surveillance_state['violence_count'], frame),
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
                        with state_lock:
                            surveillance_state['pose_anomaly_count'] += 1
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        if surveillance_state['pose_anomaly_count'] >= pose_anomaly_threshold and bot and pose_frames_sent_count < pose_send_threshold:
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

    # Anomaly detection
    results = anomaly_model.predict(frame, imgsz=320, conf=0.1, verbose=False)
    detections = sv.Detections.from_ultralytics(results[0])
    frame = sv.BoxAnnotator().annotate(scene=frame, detections=detections)
    frame = sv.LabelAnnotator().annotate(scene=frame, detections=detections)

    try:
        detected_classes = results[0].boxes.cls.cpu().numpy().astype(int).tolist()
        if any(cls in ANOMALY_INDICES for cls in detected_classes):
            if not is_anomaly_active:
                with state_lock:
                    surveillance_state['anomaly_count'] += 1
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                if surveillance_state['anomaly_count'] >= anomaly_threshold and bot and anomaly_frames_sent_count < anomaly_send_threshold:
                    asyncio.run_coroutine_threadsafe(
                        send_anomaly_alert(timestamp, surveillance_state['anomaly_count'], frame),
                        alert_loop
                    )
                is_anomaly_active = True
        else:
            is_anomaly_active = False
    except Exception as e:
        print(f"Anomaly detection error: {e}")

    # Add detection counter to the frame
    cv2.putText(frame, f"Violence count: {surveillance_state['violence_count']}/{violence_detection_threshold}", 
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    # Display frame
    cv2.imshow("Object, Violence, and Pose Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
time.sleep(10)