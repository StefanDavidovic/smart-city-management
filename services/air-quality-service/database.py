from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pymongo import MongoClient
import redis
import os
from datetime import datetime
from typing import Optional

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:password@localhost:5433/smartcity")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/smartcity")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

mongo_client = MongoClient(MONGODB_URL)
mongo_db = mongo_client.smartcity

redis_client = redis.from_url(REDIS_URL)

class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(String, primary_key=True)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AirQualityAlert(Base):
    __tablename__ = "air_quality_alerts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(String, nullable=False)
    location = Column(String, nullable=False)
    alert_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, nullable=False)
    pm25_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_sensors = db.query(Sensor).count()
        if existing_sensors == 0:
            initial_sensors = [
                Sensor(id="sensor-001", location="Centar", latitude=44.7866, longitude=20.4489),
                Sensor(id="sensor-002", location="Novi Beograd", latitude=44.8058, longitude=20.3833),
                Sensor(id="sensor-003", location="Zvezdara", latitude=44.7870, longitude=20.5156),
                Sensor(id="sensor-004", location="Vračar", latitude=44.7992, longitude=20.4706),
                Sensor(id="sensor-005", location="Stari Grad", latitude=44.8176, longitude=20.4565),
            ]
            for sensor in initial_sensors:
                db.add(sensor)
            db.commit()
            print("Initial sensors created")
    finally:
        db.close()

def save_air_quality_data(sensor_id: str, data: dict):
    """Save air quality data to MongoDB"""
    collection = mongo_db.air_quality_data
    document = {
        "sensor_id": sensor_id,
        "timestamp": datetime.utcnow(),
        "data": data,
        "pm25": data.get("pm25", 0),
        "pm10": data.get("pm10", 0),
        "o3": data.get("o3", 0),
        "no2": data.get("no2", 0),
        "co": data.get("co", 0),
        "so2": data.get("so2", 0)
    }
    collection.insert_one(document)
    
    redis_client.setex(f"air_quality:{sensor_id}:latest", 300, str(document))  # 5 min cache

def get_latest_air_quality_data(sensor_id: Optional[str] = None):
    """Get latest air quality data from MongoDB"""
    collection = mongo_db.air_quality_data
    
    if sensor_id:
        cached_data = redis_client.get(f"air_quality:{sensor_id}:latest")
        if cached_data:
            return [eval(cached_data.decode())]
        
        cursor = collection.find({"sensor_id": sensor_id}).sort("timestamp", -1).limit(1)
    else:
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": "$sensor_id", "latest": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$latest"}}
        ]
        cursor = collection.aggregate(pipeline)
    
    return list(cursor)

def save_air_quality_alert(alert_data: dict):
    """Save air quality alert to PostgreSQL"""
    db = SessionLocal()
    try:
        alert = AirQualityAlert(
            sensor_id=alert_data["sensor_id"],
            location=alert_data["location"],
            alert_type=alert_data["alert_type"],
            message=alert_data["message"],
            severity=alert_data["severity"],
            pm25_value=alert_data["pm25_value"],
            timestamp=datetime.fromisoformat(alert_data["timestamp"])
        )
        db.add(alert)
        db.commit()
        return alert.id
    finally:
        db.close()

def get_sensors_from_db():
    """Get all sensors from PostgreSQL"""
    db = SessionLocal()
    try:
        sensors = db.query(Sensor).all()
        return [
            {
                "id": sensor.id,
                "location": sensor.location,
                "coordinates": [sensor.latitude, sensor.longitude],
                "status": sensor.status,
                "lastUpdate": sensor.updated_at.isoformat()
            }
            for sensor in sensors
        ]
    finally:
        db.close()
