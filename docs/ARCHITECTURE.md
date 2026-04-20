# Architecture Document

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│              Login | Register | Booking | Tracking              │
│                    Port: 3000 (Served)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼──────┐  ┌────▼──────┐ ┌────▼──────┐
    │User Svc   │  │Booking Svc│ │Tracking   │
    │(5001)     │  │(5002)     │ │(5004)     │
    └────┬──────┘  └────┬──────┘ └────┬──────┘
         │               │             │
    ┌────▼──────────────▼─────────────▼──────────┐
    │    MONGODB - porter_dev                    │
    │  ┌──────────────────────────────────────┐  │
    │  │ Collections:                         │  │
    │  │ - users                              │  │
    │  │ - bookings                           │  │
    │  │ - drivers                            │  │
    │  │ - tracking                           │  │
    │  │ - notifications                      │  │
    │  └──────────────────────────────────────┘  │
    └──────────────────────────────────────────────┘
         │               │             │
    ┌────▼──────┐  ┌────▼──────┐ ┌────▼──────┐
    │Driver Svc │  │            │ │Notify Svc │
    │(5003)     │  │            │ │(5005)     │
    └───────────┘  └────────────┘ └───────────┘
```

## Service Responsibilities

### 1. User Service (Port 5001)
**Purpose:** Authentication and user management

**Responsibilities:**
- User registration with email/phone validation
- Secure login with JWT token generation
- Password hashing using bcryptjs
- User profile retrieval
- Token verification for other services

**Database:**
- Collection: `users`
- Fields: name, email, phone, passwordHash, createdAt

**Key Endpoints:**
```
POST   /auth/register        Create new user
POST   /auth/login           Login & receive JWT
GET    /auth/profile         Get user details (protected)
GET    /health               Service health
```

---

### 2. Booking Service (Port 5002)
**Purpose:** Delivery booking management

**Responsibilities:**
- Create delivery bookings with pickup/drop locations
- Store booking with coordinates (lat/lon)
- Trigger driver assignment workflow
- Retrieve booking history per user
- Maintain booking status lifecycle

**Database:**
- Collection: `bookings`
- Fields: bookingId, userId, pickup, drop, status, driverId, createdAt, updatedAt

**Workflow:**
```
1. User creates booking with locations
2. Booking Service validates input
3. Service calls Driver Service → /drivers/assign
4. Driver Service returns assigned driver
5. Service calls Tracking Service → /tracking/start
6. Booking marked as "confirmed"
```

**Key Endpoints:**
```
POST   /bookings             Create booking
GET    /bookings/:id         Get booking details
GET    /bookings/user/:uid   Get user's bookings
GET    /health               Service health
```

---

### 3. Driver Service (Port 5003)
**Purpose:** Driver management and intelligent assignment

**Responsibilities:**
- Maintain driver pool with current locations
- Implement nearest-driver assignment logic
- Track driver availability status
- Store driver ratings and delivery counts
- Calculate distance using Haversine formula

**Database:**
- Collection: `drivers`
- Fields: driverId, name, phone, vehicleType, isAvailable, currentLocation, rating, totalDeliveries, createdAt

**Assignment Algorithm:**
```
1. Get all available drivers
2. Calculate distance from each to pickup
3. Sort by distance (ascending)
4. Assign nearest driver
5. Mark driver as unavailable
6. Notify Tracking Service
```

**Key Endpoints:**
```
GET    /drivers              List all drivers
POST   /drivers              Create driver
POST   /drivers/assign/:id   Auto-assign driver for booking
GET    /health               Service health
```

**Seeding:**
```bash
npm run seed  # Loads 5 pre-configured drivers
```

---

### 4. Tracking Service (Port 5004)
**Purpose:** Real-time delivery tracking and status simulation

**Responsibilities:**
- Initialize tracking session on delivery start
- Simulate delivery journey with 4 status phases
- Interpolate vehicle position along route
- Generate status history timeline
- Update location every 20 seconds (configurable)
- Trigger notifications on status change

**Database:**
- Collection: `tracking`
- Fields: bookingId, driverId, currentStatus, currentLocation, routePoints, statusHistory, startedAt, deliveredAt

**Simulation Flow:**
```
Initial: Order Placed
├─ Phase 1 (0-25%): Order Placed
├─ Phase 2 (25-50%): Picked Up
├─ Phase 3 (50-100%): In Transit
│  └─ Interpolates position from pickup to drop
└─ Final: Delivered
```

**Status Transitions:**
- Order Placed → (auto) → Picked Up
- Picked Up → (auto) → In Transit
- In Transit → (auto) → Delivered (with location interpolation)

**Key Endpoints:**
```
POST   /tracking/start/:id   Start tracking simulation
GET    /tracking/:id         Get current tracking status
GET    /health               Service health
```

---

### 5. Notification Service (Port 5005)
**Purpose:** Multi-channel user notifications

**Responsibilities:**
- Receive status change events from Tracking Service
- Fetch user email from User Service
- Send console-based notifications (visible in logs)
- Simulate email notifications with mock output
- Store notification history per booking
- Track delivery milestones

**Database:**
- Collection: `notifications`
- Fields: notificationId, bookingId, userId, type, message, channels (console, email), status, createdAt

**Notification Flow:**
```
Tracking emits status change
    ↓
Notification Service receives
    ↓
Console Log: [Bold boxed message with details]
    ↓
Email Simulation: Logs recipient, subject, body
    ↓
Saves to DB
```

**Channels:**
- **Console:** Direct stdout with formatted box
- **Email:** Simulated send with recipient/subject/body logged

**Key Endpoints:**
```
POST   /notifications/send        Send notification
GET    /notifications/:bid        Get booking notifications
GET    /notifications/user/:uid   Get user notifications
GET    /health                    Service health
```

---

## Frontend Architecture

**Technology:** React 18.2 + React Router 6

**Pages:**
1. **Login** - User authentication
2. **Register** - New user registration
3. **Booking** - Create deliveries with location input
4. **Tracking** - Real-time delivery progress with timeline

**Features:**
- JWT token-based authentication
- Protected routes (PrivateRoute)
- Location coordinates input (manual or from Nominatim API)
- Status timeline visualization
- Booking history list
- Live tracking updates (5-second polling)

**Data Flow:**
```
User Input → Axios → Backend Service → Response → State Update → Re-render
```

---

## Database Schema (MongoDB)

### Collections

#### Users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  createdAt: Date
}
```

#### Bookings
```javascript
{
  _id: ObjectId,
  bookingId: String (unique),
  userId: String,
  pickup: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  drop: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  status: String (enum: pending, confirmed, in_transit, delivered),
  driverId: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Drivers
```javascript
{
  _id: ObjectId,
  driverId: String (unique),
  name: String,
  phone: String (unique),
  vehicleType: String (enum: bike, auto, car),
  isAvailable: Boolean,
  currentLocation: {
    latitude: Number,
    longitude: Number
  },
  rating: Number (1-5),
  totalDeliveries: Number,
  createdAt: Date
}
```

#### Tracking
```javascript
{
  _id: ObjectId,
  bookingId: String (unique),
  driverId: String,
  currentStatus: String,
  currentLocation: {
    latitude: Number,
    longitude: Number
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    location: { latitude, longitude }
  }],
  startedAt: Date,
  deliveredAt: Date
}
```

#### Notifications
```javascript
{
  _id: ObjectId,
  notificationId: String (unique),
  bookingId: String,
  userId: String,
  type: String,
  message: String,
  channels: {
    console: { sent: Boolean, timestamp: Date },
    email: { sent: Boolean, timestamp: Date, recipient: String }
  },
  status: String (enum: pending, sent, failed),
  createdAt: Date
}
```

---

## Inter-Service Communication

### Service Call Map

```
Frontend
├─ POST   /auth/register      → User Service
├─ POST   /auth/login         → User Service
├─ POST   /bookings           → Booking Service
├─ GET    /bookings/user/:id  → Booking Service
├─ GET    /tracking/:id       → Tracking Service
└─ GET    /notifications/:id  → Notification Service

Booking Service (5002)
├─ POST   /drivers/assign/:id → Driver Service (5003)
└─ POST   /tracking/start/:id → Tracking Service (5004)

Driver Service (5003)
└─ POST   /tracking/start/:id → Tracking Service (5004)

Tracking Service (5004)
└─ POST   /notifications/send → Notification Service (5005)

Notification Service (5005)
└─ GET    /auth/profile       → User Service (5001)
```

---

## Deployment Architecture

### Docker Compose Setup

Each service runs in its own container with:
- Isolated Node.js environment
- Environment variable injection
- Network connectivity via `porter_network`
- Health checks
- Volume persistence for MongoDB

```
porter_network
  ├─ mongodb (27017)
  ├─ user-service (5001)
  ├─ booking-service (5002)
  ├─ driver-service (5003)
  ├─ tracking-service (5004)
  ├─ notification-service (5005)
  └─ frontend (3000)
```

### Health Checks

All services implement:
- `GET /health` endpoint
- Docker health checks (ping every 30s)
- Service readiness before dependent services start
- Automatic restart on failure

---

## Scalability Considerations

**Current (Single-instance):**
- All services in one Docker Compose
- Single MongoDB instance
- Suitable for development and small load

**Future (Scalable):**
- Separate database per microservice
- Load balancer (nginx/HAProxy)
- Kubernetes orchestration
- Message queue (RabbitMQ) for async events
- Service mesh (Istio) for observability
- Cache layer (Redis)
- Database replicas

---

## Security Features

✅ Password hashing (bcryptjs)  
✅ JWT token authentication  
✅ CORS enabled on all services  
✅ Helmet.js for security headers  
✅ Input validation  
✅ Environment variable isolation  

**Future:**
- Request signing
- API rate limiting
- OAuth integration
- HTTPS enforcement
