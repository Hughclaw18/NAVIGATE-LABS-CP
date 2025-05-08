from ultralytics import YOLOE 
import cv2
import supervision as sv
import time

# Loading the model 
model = YOLOE("yoloe-11m-seg.pt")

# Class names 
names = ["Fire","Smoke"]

# Setting the classes for the model 
model.set_classes(names,model.get_text_pe(names))

# Own camera 
cap = cv2.VideoCapture("videoplayback.mp4")

# FPS calculation variables
prev_time = 0
fps_text = "FPS: 0"

# Resize dimensions (smaller frames = faster processing)
width, height = 640, 480

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Calculate FPS
    current_time = time.time()
    fps = 1 / (current_time - prev_time) if prev_time > 0 else 0
    prev_time = current_time
    fps_text = f"FPS: {fps:.1f}"
    
    # Resize frame to lower resolution for faster processing
    frame = cv2.resize(frame, (width, height))
    
    # Inference 
    results = model.predict(frame, conf=0.1, verbose=False)

    # Getting the detections 
    detections = sv.Detections.from_ultralytics(results[0])
    
    # Annotation 
    frame = sv.BoxAnnotator().annotate(scene=frame, detections=detections)
    frame = sv.LabelAnnotator().annotate(scene=frame, detections=detections)
    
    # Display FPS
    cv2.putText(frame, fps_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
    # Display 
    cv2.imshow("Frame", frame)
    
    # Break - simplified waitKey logic with single call
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

