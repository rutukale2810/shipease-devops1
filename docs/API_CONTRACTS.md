# API Contracts

## Service Communication Map

```
Frontend
  ├── User Service (5001)
  ├── Booking Service (5002)
  ├── Tracking Service (5004)
  └── Notification Service (5005)

Booking Service
  └── Driver Service (5003)
  └── Tracking Service (5004)

Driver Service
  └── Tracking Service (5004)

Tracking Service
  └── Notification Service (5005)
```

## User Service Contracts

### POST /auth/register
```json
Request: {
  "name": "Raj Kumar",
  "email": "raj@example.com",
  "phone": "9876543210",
  "password": "securepass123"
}

Response (201): {
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "name": "Raj Kumar",
    "email": "raj@example.com",
    "phone": "9876543210"
  }
}
```

### POST /auth/login
```json
Request: {
  "email": "raj@example.com",
  "password": "securepass123"
}

Response (200): {
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### GET /auth/profile
```
Header: Authorization: Bearer <JWT_TOKEN>

Response (200): {
  "user": {
    "id": "user_id",
    "name": "Raj Kumar",
    "email": "raj@example.com",
    "phone": "9876543210",
    "createdAt": "2024-04-11T10:30:00Z"
  }
}
```

## Booking Service Contracts

### POST /bookings
```json
Request: {
  "userId": "user_id",
  "pickup": {
    "name": "Delhi Airport",
    "latitude": 28.5562,
    "longitude": 77.1000
  },
  "drop": {
    "name": "Connaught Place",
    "latitude": 28.6273,
    "longitude": 77.1854
  }
}

Response (201): {
  "message": "Booking created successfully",
  "booking": {
    "bookingId": "uuid",
    "userId": "user_id",
    "pickup": { ... },
    "drop": { ... },
    "status": "pending",
    "createdAt": "2024-04-11T10:30:00Z"
  }
}
```

### GET /bookings/:bookingId
```
Response (200): { "booking": { ... } }
```

### GET /bookings/user/:userId
```
Response (200): {
  "bookings": [
    { bookingId: "...", status: "delivered", ... },
    { bookingId: "...", status: "in_transit", ... }
  ]
}
```

## Driver Service Contracts

### GET /drivers
```
Response (200): {
  "drivers": [
    {
      "driverId": "uuid",
      "name": "Priya Singh",
      "phone": "9876543211",
      "vehicleType": "auto",
      "isAvailable": true,
      "currentLocation": { "latitude": 28.6139, "longitude": 77.2090 },
      "rating": 4.8
    }
  ]
}
```

### POST /drivers/assign/:bookingId
```json
Request: {
  "bookingId": "booking_id",
  "pickupLat": 28.5562,
  "pickupLon": 77.1000
}

Response (200): {
  "message": "Driver assigned successfully",
  "assigned": true,
  "driver": {
    "driverId": "driver_id",
    "name": "Priya Singh",
    "phone": "9876543211",
    "vehicleType": "auto",
    "distance": "2.34 km"
  }
}
```

## Tracking Service Contracts

### POST /tracking/start/:bookingId
```json
Request: {
  "driverId": "driver_id",
  "pickupLat": 28.5562,
  "pickupLon": 77.1000,
  "dropLat": 28.6273,
  "dropLon": 77.1854
}

Response (200): {
  "message": "Tracking started",
  "tracking": {
    "bookingId": "booking_id",
    "currentStatus": "Order Placed",
    "currentLocation": { "latitude": 28.5562, "longitude": 77.1000 },
    "startedAt": "2024-04-11T10:30:00Z"
  }
}
```

### GET /tracking/:bookingId
```
Response (200): {
  "tracking": {
    "bookingId": "booking_id",
    "driverId": "driver_id",
    "currentStatus": "In Transit",
    "currentLocation": { "latitude": 28.5800, "longitude": 77.1400 },
    "pickupLocation": { ... },
    "destinationLocation": { ... },
    "statusHistory": [
      {
        "status": "Order Placed",
        "timestamp": "2024-04-11T10:30:00Z",
        "location": { ... }
      },
      {
        "status": "Picked Up",
        "timestamp": "2024-04-11T10:35:00Z",
        "location": { ... }
      }
    ],
    "deliveredAt": null
  }
}
```

## Notification Service Contracts

### POST /notifications/send
```json
Request: {
  "bookingId": "booking_id",
  "userId": "user_id",
  "status": "Picked Up",
  "location": { "latitude": 28.5562, "longitude": 77.1000 }
}

Response (200): {
  "message": "Notification sent successfully",
  "notification": {
    "notificationId": "uuid",
    "bookingId": "booking_id",
    "userId": "user_id",
    "message": "📦 Delivery Update: Your order status is now \"Picked Up\"...",
    "channels": {
      "console": { "sent": true, "timestamp": "2024-04-11T10:35:00Z" },
      "email": { "sent": true, "timestamp": "2024-04-11T10:35:00Z", "recipient": "user@example.com" }
    },
    "status": "sent"
  }
}
```

### GET /notifications/:bookingId
```
Response (200): {
  "notifications": [
    { notificationId: "...", message: "...", status: "sent" },
    { notificationId: "...", message: "...", status: "sent" }
  ]
}
```

## Health Check
All services expose: `GET /health`

```
Response (200): {
  "status": "UP",
  "service": "user-service",
  "timestamp": "2024-04-11T10:30:00Z"
}
```
