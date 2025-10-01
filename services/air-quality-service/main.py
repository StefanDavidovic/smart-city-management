from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import asyncio
import json
import random
import time
import os
from datetime import datetime, timedelta
import uvicorn
import pika
import logging
from database import (
    init_database, save_air_quality_data, get_latest_air_quality_data,
    save_air_quality_alert, get_sensors_from_db, get_db
)
from sqlalchemy.orm import Session

app = FastAPI(title="Air Quality Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:password@localhost:5672")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RabbitMQPublisher:
    def __init__(self):
        self.connection = None
        self.channel = None
        
    def connect(self):
        try:
            self.connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            self.channel = self.connection.channel()
            
            self.channel.exchange_declare(exchange="air_quality_events", exchange_type="topic", durable=True)
            self.channel.exchange_declare(exchange="smart_city_events", exchange_type="topic", durable=True)
            
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            
    def publish_event(self, exchange: str, routing_key: str, message: dict):
        try:
            if not self.channel or self.channel.is_closed:
                self.connect()
                
            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    timestamp=int(time.time())
                )
            )
            logger.info(f"Published event to {exchange}:{routing_key}")
        except Exception as e:
            logger.error(f"Failed to publish event: {e}")
            
    def close(self):
        if self.connection and not self.connection.is_closed:
            self.connection.close()

rabbitmq_publisher = RabbitMQPublisher()
rabbitmq_publisher.connect()

init_database()

SENSORS = [
    {"id": "sensor-001", "location": "Centar", "coordinates": [45.2671, 19.8335]},
    {"id": "sensor-002", "location": "Liman", "coordinates": [45.2500, 19.8500]},
    {"id": "sensor-003", "location": "Detelinara", "coordinates": [45.2800, 19.8200]},
    {"id": "sensor-004", "location": "Grbavica", "coordinates": [45.2600, 19.8100]},
    {"id": "sensor-005", "location": "Telep", "coordinates": [45.2400, 19.8400]},
]

class AirQualityData(BaseModel):
    id: str
    location: str
    coordinates: List[float]
    timestamp: datetime
    data: Dict[str, float]

class SensorStatus(BaseModel):
    id: str
    location: str
    coordinates: List[float]
    status: str
    lastUpdate: datetime

class AirQualityAlert(BaseModel):
    sensorId: str
    location: str
    alertType: str
    message: str
    severity: str
    timestamp: datetime

sensor_data: Dict[str, List[AirQualityData]] = {}
active_connections: List[WebSocket] = []

def calculate_aqi(pm25: float) -> int:
    """Calculate Air Quality Index based on PM2.5 value"""
    if pm25 <= 12.0:
        return int(50 * pm25 / 12.0)
    elif pm25 <= 35.4:
        return int(50 + (100 - 50) * (pm25 - 12.0) / (35.4 - 12.0))
    elif pm25 <= 55.4:
        return int(100 + (150 - 100) * (pm25 - 35.4) / (55.4 - 35.4))
    elif pm25 <= 150.4:
        return int(150 + (200 - 150) * (pm25 - 55.4) / (150.4 - 55.4))
    elif pm25 <= 250.4:
        return int(200 + (300 - 200) * (pm25 - 150.4) / (250.4 - 150.4))
    else:
        return int(300 + (500 - 300) * (pm25 - 250.4) / (500.4 - 250.4))

def generate_realistic_air_quality_data(sensor_id: str) -> AirQualityData:
    """Generate realistic air quality data based on time of day and location"""
    sensor = next(s for s in SENSORS if s["id"] == sensor_id)
    now = datetime.now()
    
    base_values = {
        "pm25": 15.0,
        "pm10": 25.0,
        "o3": 80.0,
        "no2": 35.0,
        "co": 1.2,
        "so2": 12.0,
        "temperature": 22.0,
        "humidity": 65.0,
        "pressure": 1013.25
    }
    
    hour = now.hour
    if 7 <= hour <= 9 or 17 <= hour <= 19:  # Rush hours
        multiplier = 1.3
    elif 22 <= hour or hour <= 6:  # Night time
        multiplier = 0.7
    else:
        multiplier = 1.0
    
    variation = random.uniform(0.8, 1.2)
    
    data = {}
    for key, base_value in base_values.items():
        if key in ["temperature", "humidity", "pressure"]:
            data[key] = round(base_value * variation, 2)
        else:
            data[key] = round(base_value * multiplier * variation, 2)
    
    pm25_value = data["pm25"]
    aqi = calculate_aqi(pm25_value)
    data["aqi"] = aqi
    
    air_quality_data = AirQualityData(
        id=sensor_id,
        location=sensor["location"],
        coordinates=sensor["coordinates"],
        timestamp=now,
        data=data
    )
    
    save_air_quality_data(sensor_id, data)
    if pm25_value > 25:  # Unhealthy air quality threshold
        alert_event = {
            "event_type": "air_quality_alert",
            "sensor_id": sensor_id,
            "location": sensor["location"],
            "coordinates": sensor["coordinates"],
            "pm25_value": pm25_value,
            "severity": "high" if pm25_value > 50 else "moderate",
            "timestamp": now.isoformat(),
            "message": f"Air quality alert: PM2.5 level {pm25_value} μg/m³ detected at {sensor['location']}"
        }
        
        save_air_quality_alert(alert_event)
        
        rabbitmq_publisher.publish_event(
            exchange="air_quality_events",
            routing_key="alert.high",
            message=alert_event
        )
        
        rabbitmq_publisher.publish_event(
            exchange="smart_city_events",
            routing_key="air_quality.alert",
            message=alert_event
        )
    
    return air_quality_data

def get_air_quality_index(pm25: float) -> Dict[str, Any]:
    """Calculate air quality index based on PM2.5"""
    if pm25 <= 12:
        return {"index": 1, "category": "Good", "color": "#00E400"}
    elif pm25 <= 35:
        return {"index": 2, "category": "Moderate", "color": "#FFFF00"}
    elif pm25 <= 55:
        return {"index": 3, "category": "Unhealthy for Sensitive Groups", "color": "#FF8C00"}
    elif pm25 <= 150:
        return {"index": 4, "category": "Unhealthy", "color": "#FF0000"}
    else:
        return {"index": 5, "category": "Hazardous", "color": "#8F3F97"}

async def broadcast_data():
    """Broadcast real-time data to all connected clients"""
    while True:
        try:
            if active_connections:
                current_data = []
                for sensor in SENSORS:
                    data = generate_realistic_air_quality_data(sensor["id"])
                    current_data.append(data)
                    
                    if sensor["id"] not in sensor_data:
                        sensor_data[sensor["id"]] = []
                    sensor_data[sensor["id"]].append(data)
                    
                    if len(sensor_data[sensor["id"]]) > 100:
                        sensor_data[sensor["id"]] = sensor_data[sensor["id"]][-100:]
                
                message = {
                    "type": "air_quality_update",
                    "data": [data.dict() for data in current_data],
                    "timestamp": datetime.now().isoformat()
                }
                
                for connection in active_connections[:]:
                    try:
                        await connection.send_text(json.dumps(message))
                    except:
                        active_connections.remove(connection)
            
            await asyncio.sleep(5)  # Update every 5 seconds
        except Exception as e:
            print(f"Error in broadcast_data: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    """Initialize the service"""
    asyncio.create_task(broadcast_data())

@app.get("/")
async def root():
    return {"service": "Air Quality Service", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "air-quality-service",
        "timestamp": datetime.now().isoformat(),
        "sensors": len(SENSORS),
        "active_connections": len(active_connections)
    }

@app.get("/sensors", response_model=List[SensorStatus])
async def get_sensors():
    """Get all available sensors from database"""
    sensors_data = get_sensors_from_db()
    sensors = []
    
    for sensor in sensors_data:
        sensors.append(SensorStatus(
            id=sensor["id"],
            location=sensor["location"],
            coordinates=sensor["coordinates"],
            status=sensor["status"],
            lastUpdate=datetime.fromisoformat(sensor["lastUpdate"])
        ))
    return sensors

@app.get("/sensors/{sensor_id}/data", response_model=List[AirQualityData])
async def get_sensor_data(sensor_id: str, limit: int = 50):
    """Get historical data for a specific sensor"""
    if sensor_id not in [s["id"] for s in SENSORS]:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    data = sensor_data.get(sensor_id, [])
    return data[-limit:] if data else []

@app.get("/sensors/{sensor_id}/current", response_model=AirQualityData)
async def get_current_sensor_data(sensor_id: str):
    """Get current data for a specific sensor"""
    if sensor_id not in [s["id"] for s in SENSORS]:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    data = sensor_data.get(sensor_id, [])
    if not data:
        return generate_realistic_air_quality_data(sensor_id)
    
    return data[-1]

@app.get("/data/current", response_model=List[AirQualityData])
async def get_current_all_data():
    """Get current data for all sensors - always generate fresh data"""
    current_data = []
    for sensor in SENSORS:
        current_data.append(generate_realistic_air_quality_data(sensor["id"]))
    return current_data

@app.get("/data/historical")
async def get_historical_data(hours: int = 24, sensor_id: str = None):
    """Get historical data for specified time period"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    
    if sensor_id:
        if sensor_id not in [s["id"] for s in SENSORS]:
            raise HTTPException(status_code=404, detail="Sensor not found")
        
        data = sensor_data.get(sensor_id, [])
        filtered_data = [d for d in data if d.timestamp >= cutoff_time]
        return {"sensor_id": sensor_id, "data": [d.dict() for d in filtered_data]}
    
    result = {}
    for sensor in SENSORS:
        data = sensor_data.get(sensor["id"], [])
        filtered_data = [d for d in data if d.timestamp >= cutoff_time]
        result[sensor["id"]] = [d.dict() for d in filtered_data]
    
    return result

@app.get("/alerts")
async def get_alerts():
    """Get current air quality alerts"""
    alerts = []
    
    for sensor in SENSORS:
        data = sensor_data.get(sensor["id"], [])
        if data:
            latest = data[-1]
            pm25 = latest.data["pm25"]
            aqi = get_air_quality_index(pm25)
            
            if aqi["index"] >= 3:  # Unhealthy or worse
                alerts.append(AirQualityAlert(
                    sensorId=sensor["id"],
                    location=sensor["location"],
                    alertType="air_quality_warning",
                    message=f"Air quality is {aqi['category']} in {sensor['location']}",
                    severity="high" if aqi["index"] >= 4 else "medium",
                    timestamp=latest.timestamp
                ))
    
    return alerts

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
