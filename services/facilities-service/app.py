from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime, timedelta
import uuid
import random
import asyncio
from typing import Dict, List, Optional

app = Flask(__name__)
app.config['SECRET_KEY'] = 'smartcity-facilities-secret'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

FACILITIES = [
    {
        "id": "facility-001",
        "name": "Park Petrovaradin",
        "type": "park",
        "location": "Centar",
        "coordinates": [45.2671, 19.8335],
        "capacity": 500,
        "currentOccupancy": 0,
        "operatingHours": {"open": "06:00", "close": "22:00"},
        "amenities": ["playground", "sports_court", "walking_paths", "benches"],
        "status": "open"
    },
    {
        "id": "facility-002",
        "name": "Matica Srpska Library",
        "type": "library",
        "location": "Centar",
        "coordinates": [45.2671, 19.8335],
        "capacity": 200,
        "currentOccupancy": 0,
        "operatingHours": {"open": "08:00", "close": "20:00"},
        "amenities": ["reading_rooms", "computer_lab", "study_spaces", "cafe"],
        "status": "open"
    },
    {
        "id": "facility-003",
        "name": "SPENS Sports Center",
        "type": "sports_center",
        "location": "Liman",
        "coordinates": [45.2500, 19.8500],
        "capacity": 150,
        "currentOccupancy": 0,
        "operatingHours": {"open": "06:00", "close": "23:00"},
        "amenities": ["swimming_pool", "gym", "tennis_courts", "sauna"],
        "status": "open"
    },
    {
        "id": "facility-004",
        "name": "Community Center Detelinara",
        "type": "community_center",
        "location": "Detelinara",
        "coordinates": [45.2800, 19.8200],
        "capacity": 100,
        "currentOccupancy": 0,
        "operatingHours": {"open": "09:00", "close": "21:00"},
        "amenities": ["meeting_rooms", "event_hall", "workshop_space", "kitchen"],
        "status": "open"
    },
    {
        "id": "facility-005",
        "name": "Fruška Gora National Park",
        "type": "park",
        "location": "Grbavica",
        "coordinates": [45.2600, 19.8100],
        "capacity": 1000,
        "currentOccupancy": 0,
        "operatingHours": {"open": "05:00", "close": "24:00"},
        "amenities": ["hiking_trails", "sports_courts", "restaurants", "bike_rental"],
        "status": "open"
    }
]

facilities_data: Dict[str, Dict] = {facility["id"]: facility.copy() for facility in FACILITIES}
reservations: List[Dict] = []
active_connections: List[str] = []

class FacilityManager:
    @staticmethod
    def update_occupancy():
        """Update facility occupancy based on time and random factors"""
        current_hour = datetime.now().hour
        
        for facility_id, facility in facilities_data.items():
            base_occupancy = 0
            
            if facility["type"] == "park":
                if 6 <= current_hour <= 22:
                    base_occupancy = random.randint(20, 80)
                else:
                    base_occupancy = random.randint(0, 20)
            elif facility["type"] == "library":
                if 8 <= current_hour <= 20:
                    base_occupancy = random.randint(30, 90)
                else:
                    base_occupancy = random.randint(0, 10)
            elif facility["type"] == "sports_center":
                if 6 <= current_hour <= 23:
                    base_occupancy = random.randint(40, 95)
                else:
                    base_occupancy = random.randint(0, 15)
            elif facility["type"] == "community_center":
                if 9 <= current_hour <= 21:
                    base_occupancy = random.randint(20, 70)
                else:
                    base_occupancy = random.randint(0, 10)
            
            variation = random.randint(-10, 10)
            facility["currentOccupancy"] = max(0, min(facility["capacity"], base_occupancy + variation))
            
            if facility["currentOccupancy"] >= facility["capacity"] * 0.9:
                facility["status"] = "crowded"
            elif facility["currentOccupancy"] <= facility["capacity"] * 0.1:
                facility["status"] = "quiet"
            else:
                facility["status"] = "open"
    
    @staticmethod
    def get_facility_status(facility_id: str) -> Optional[Dict]:
        """Get current status of a facility"""
        return facilities_data.get(facility_id)
    
    @staticmethod
    def create_reservation(facility_id: str, user_id: str, start_time: datetime, 
                          end_time: datetime, purpose: str) -> Dict:
        """Create a new reservation"""
        facility = facilities_data.get(facility_id)
        if not facility:
            raise ValueError("Facility not found")
        
        conflicting_reservations = [
            r for r in reservations 
            if r["facilityId"] == facility_id and r["status"] == "confirmed" and
            not (end_time <= r["startTime"] or start_time >= r["endTime"])
        ]
        
        if conflicting_reservations:
            raise ValueError("Facility is not available at the requested time")
        
        reservation = {
            "id": str(uuid.uuid4()),
            "facilityId": facility_id,
            "userId": user_id,
            "startTime": start_time,
            "endTime": end_time,
            "status": "confirmed",
            "purpose": purpose,
            "createdAt": datetime.now()
        }
        
        reservations.append(reservation)
        return reservation
    
    @staticmethod
    def cancel_reservation(reservation_id: str) -> bool:
        """Cancel a reservation"""
        for reservation in reservations:
            if reservation["id"] == reservation_id:
                reservation["status"] = "cancelled"
                return True
        return False
    
    @staticmethod
    def get_facility_reservations(facility_id: str) -> List[Dict]:
        """Get all reservations for a facility"""
        return [r for r in reservations if r["facilityId"] == facility_id]

def broadcast_facility_updates():
    """Broadcast facility updates to connected clients"""
    while True:
        try:
            if active_connections:
                FacilityManager.update_occupancy()
                
                message = {
                    "type": "facility_update",
                    "data": list(facilities_data.values()),
                    "timestamp": datetime.now().isoformat()
                }
                
                socketio.emit('facility_update', message)
            
            socketio.sleep(15)  # Update every 15 seconds
        except Exception as e:
            print(f"Error in broadcast_facility_updates: {e}")
            socketio.sleep(15)

socketio.start_background_task(broadcast_facility_updates)

@app.route('/')
def root():
    return jsonify({
        "service": "Public Facilities Service",
        "status": "running",
        "version": "1.0.0"
    })

@app.route('/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "facilities-service",
        "timestamp": datetime.now().isoformat(),
        "facilities": len(facilities_data),
        "activeConnections": len(active_connections)
    })

@app.route('/facilities', methods=['GET'])
def get_facilities():
    """Get all facilities"""
    facility_type = request.args.get('type')
    status = request.args.get('status')
    
    filtered_facilities = list(facilities_data.values())
    
    if facility_type:
        filtered_facilities = [f for f in filtered_facilities if f["type"] == facility_type]
    
    if status:
        filtered_facilities = [f for f in filtered_facilities if f["status"] == status]
    
    return jsonify(filtered_facilities)

@app.route('/facilities/<facility_id>', methods=['GET'])
def get_facility(facility_id: str):
    """Get a specific facility"""
    facility = facilities_data.get(facility_id)
    if not facility:
        return jsonify({"error": "Facility not found"}), 404
    
    return jsonify(facility)

@app.route('/facilities/<facility_id>/status', methods=['GET'])
def get_facility_status(facility_id: str):
    """Get current status of a facility"""
    facility = FacilityManager.get_facility_status(facility_id)
    if not facility:
        return jsonify({"error": "Facility not found"}), 404
    
    return jsonify({
        "id": facility["id"],
        "name": facility["name"],
        "currentOccupancy": facility["currentOccupancy"],
        "capacity": facility["capacity"],
        "status": facility["status"],
        "lastUpdate": datetime.now().isoformat()
    })

@app.route('/facilities/<facility_id>/reservations', methods=['GET'])
def get_facility_reservations(facility_id: str):
    """Get reservations for a facility"""
    facility = facilities_data.get(facility_id)
    if not facility:
        return jsonify({"error": "Facility not found"}), 404
    
    reservations_list = FacilityManager.get_facility_reservations(facility_id)
    return jsonify(reservations_list)

@app.route('/reservations', methods=['POST'])
def create_reservation():
    """Create a new reservation"""
    try:
        data = request.get_json()
        facility_id = data.get('facilityId')
        user_id = data.get('userId')
        start_time_str = data.get('startTime')
        end_time_str = data.get('endTime')
        purpose = data.get('purpose', 'General use')
        
        if not all([facility_id, user_id, start_time_str, end_time_str]):
            return jsonify({"error": "Missing required fields"}), 400
        
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        
        reservation = FacilityManager.create_reservation(
            facility_id, user_id, start_time, end_time, purpose
        )
        
        return jsonify(reservation), 201
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Invalid request"}), 400

@app.route('/reservations/<reservation_id>', methods=['DELETE'])
def cancel_reservation(reservation_id: str):
    """Cancel a reservation"""
    success = FacilityManager.cancel_reservation(reservation_id)
    if not success:
        return jsonify({"error": "Reservation not found"}), 404
    
    return jsonify({"message": "Reservation cancelled successfully"})

@app.route('/reservations', methods=['GET'])
def get_reservations():
    """Get all reservations"""
    user_id = request.args.get('userId')
    facility_id = request.args.get('facilityId')
    
    filtered_reservations = reservations.copy()
    
    if user_id:
        filtered_reservations = [r for r in filtered_reservations if r["userId"] == user_id]
    
    if facility_id:
        filtered_reservations = [r for r in filtered_reservations if r["facilityId"] == facility_id]
    
    return jsonify(filtered_reservations)

@app.route('/facilities/<facility_id>/availability', methods=['GET'])
def check_availability(facility_id: str):
    """Check facility availability for a time period"""
    start_time_str = request.args.get('startTime')
    end_time_str = request.args.get('endTime')
    
    if not start_time_str or not end_time_str:
        return jsonify({"error": "startTime and endTime are required"}), 400
    
    try:
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        
        facility = facilities_data.get(facility_id)
        if not facility:
            return jsonify({"error": "Facility not found"}), 404
        
        conflicting_reservations = [
            r for r in reservations 
            if r["facilityId"] == facility_id and r["status"] == "confirmed" and
            not (end_time <= r["startTime"] or start_time >= r["endTime"])
        ]
        
        is_available = len(conflicting_reservations) == 0
        
        return jsonify({
            "facilityId": facility_id,
            "startTime": start_time.isoformat(),
            "endTime": end_time.isoformat(),
            "available": is_available,
            "conflictingReservations": len(conflicting_reservations)
        })
        
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

@socketio.on('connect')
def handle_connect():
    active_connections.append(request.sid)
    emit('connected', {'message': 'Connected to facilities service'})

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in active_connections:
        active_connections.remove(request.sid)

@socketio.on('join_facility')
def handle_join_facility(data):
    facility_id = data.get('facilityId')
    if facility_id:
        join_room(f"facility_{facility_id}")
        emit('joined_facility', {'facilityId': facility_id})

@socketio.on('leave_facility')
def handle_leave_facility(data):
    facility_id = data.get('facilityId')
    if facility_id:
        leave_room(f"facility_{facility_id}")
        emit('left_facility', {'facilityId': facility_id})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8003, debug=True)
