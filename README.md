# Smart City Management Platform

A microservices architecture with microfrontends for managing various aspects of a smart city including air quality monitoring, traffic management, and public facilities.

## Architecture

### Microservices (Backend)

- **Air Quality Service** (FastAPI) - Air quality monitoring and sensor data
- **Traffic Management Service** (Express.js) - Traffic monitoring and traffic light control
- **Public Facilities Service** (Flask) - Public facilities management and reservations
- **Notification Service** (Express.js) - Citizen notifications and alerts

### Microfrontends (React)

- **Dashboard Frontend** - Main dashboard with real-time monitoring
- **Air Quality Frontend** - Air quality data visualization
- **Traffic Frontend** - Traffic monitoring and control
- **Facilities Frontend** - Public facilities management

### Technologies

- **Backend**: FastAPI, Express.js, Flask
- **Frontend**: React with Module Federation
- **Database**: PostgreSQL, MongoDB
- **Message Broker**: RabbitMQ
- **Real-time**: WebSocket
- **Infrastructure**: Docker, Docker Compose

## Getting Started

1. Clone the repository
2. Run `docker-compose up` to start all services
3. Access the application at `http://localhost:3000`

## Services

- Dashboard: http://localhost:3000
- Air Quality Service: http://localhost:8001
- Traffic Service: http://localhost:8002
- Facilities Service: http://localhost:8003
- Notification Service: http://localhost:8004
