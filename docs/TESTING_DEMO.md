# Testing & Demo Guide

## Pre-Demo Checklist

- [ ] All services running: `docker-compose ps`
- [ ] MongoDB healthy: `docker-compose logs mongodb`
- [ ] All health checks pass: `curl http://localhost:5001/health` (for each port 5001-5005)
- [ ] Frontend loads: http://localhost:3000
- [ ] Drivers seeded: `npm run seed` in driver-service
- [ ] Network connectivity verified
- [ ] Test account credentials ready
- [ ] Postman collection imported
- [ ] Take screenshot of running services

---

## Demo Script (5-10 Minutes)

### Part 1: System Overview (1-2 min)

**Show Architecture Diagram**
```
Display docs/ARCHITECTURE.md in browser
Explain 5 microservices + MongoDB
Show how they communicate
```

**Browser:** Open http://localhost:3000

---

### Part 2: User Authentication (1-2 min)

**Register New User:**
```
Click "Register"
Fill Form:
  Name: Raj Kumar
  Email: raj@porter.demo@example.com
  Phone: 9876543210
  Password: demo@123
Click "Register"
```

**Expected:** 
- ✅ Redirects to Bookings page
- ✅ Logout button shows user name

---

### Part 3: Create Booking (2 min)

**Fill Booking Form:**
```
Pickup Location:
  Address: Delhi Airport Terminal 1
  Latitude: 28.5562
  Longitude: 77.1000

Drop Location:
  Address: Connaught Place
  Latitude: 28.6273
  Longitude: 77.1854

Click "Create Booking"
```

**Expected:**
- ✅ Booking created successfully message
- ✅ Booking appears in "Your Bookings" list
- ✅ Copy booking ID

**Watch Console (Docker):**
```bash
docker-compose logs notification-service
# Should show notification sent message
```

---

### Part 4: Live Tracking (2-3 min)

**Start Tracking:**
```
Click "Tracking" tab
Select booking from list OR paste booking ID
Click "Track Delivery"
```

**Expected:**
- ✅ Booking details load
- ✅ Status timeline shows: Order Placed → Picked Up → In Transit → Delivered
- ✅ Status updates every 20 seconds
- ✅ Location coordinates change

**Watch Status Updates:**
```
Order Placed (starts immediately)
    ↓↓↓ Wait 20 seconds
Picked Up
    ↓↓↓ Wait 20 seconds
In Transit (coordinates change)
    ↓↓↓ Wait 20 seconds
Delivered (final location = drop point)
```

**Show Console Notifications:**
```bash
docker-compose logs notification-service
# Show email simulation output
```

---

### Part 5: API Testing (Optional - 2 min)

**Open Postman:**
1. Import collection: `tests/postman/Porter.postman_collection.json`
2. Set baseUrl: `http://localhost`
3. Run login request → copy token to variable
4. Run create booking → copy bookingId
5. Run get tracking → observe live updates

**Test All Endpoints:**
- [ ] User Service (register, login, profile)
- [ ] Booking Service (create, get, list)
- [ ] Driver Service (list drivers)
- [ ] Tracking Service (get tracking)
- [ ] Notification Service (get notifications)

---

### Part 6: DevOps Demonstration (2-3 min)

**Show Docker Compose:**
```bash
# Show all running services
docker-compose ps

# Show logs from all services
docker-compose logs --tail=50

# Show health checks
curl http://localhost:5001/health | jq .
curl http://localhost:5002/health | jq .
```

**Show CI/CD Pipeline:**
- URL: https://github.com/<username>/<repo>/actions
- Show workflow runs
- Show test reports

**Show Project Structure:**
```
Porter/
├── services/          (5 microservices)
├── frontend/          (React app)
├── docker-compose.yml (orchestration)
├── .github/workflows/  (CI/CD)
└── docs/              (documentation)
```

---

## Happy Path Test (Complete Flow)

### Manual Complete Test

1. **Open terminal**
   ```bash
   # Start services
   docker-compose up -d
   
   # Check all healthy
   docker-compose ps
   ```

2. **Open browser** and test workflow
   ```
   Register → Login → Create Booking → View Tracking
   ```

3. **Verify notifications**
   ```bash
   docker-compose logs notification-service | grep "NOTIFICATION"
   ```

4. **Check database**
   ```bash
   docker-compose exec mongodb mongosh
   use porter_dev
   db.bookings.findOne()
   db.tracking.findOne()
   ```

---

## Automated Test Scenarios

### Scenario 1: Complete Delivery Flow

```bash
#!/bin/bash

# 1. Register user
USER=$(curl -s -X POST http://localhost:5001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","phone":"9999999999","password":"test123"}' \
  | jq -r '.user.id')

# 2. Get token
TOKEN=$(curl -s -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  | jq -r '.token')

# 3. Create booking
BOOKING=$(curl -s -X POST http://localhost:5002/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER\",\"pickup\":{\"name\":\"Start\",\"latitude\":28.5562,\"longitude\":77.1000},\"drop\":{\"name\":\"End\",\"latitude\":28.6273,\"longitude\":77.1854}}" \
  | jq -r '.booking.bookingId')

# 4. Get tracking
curl -s http://localhost:5004/tracking/$BOOKING | jq '.tracking.currentStatus'

# Wait for delivery
sleep 90

# 5. Final status
curl -s http://localhost:5004/tracking/$BOOKING | jq '.tracking | {currentStatus, deliveredAt}'
```

---

## Load Testing (Advanced)

### Using Apache ab (ApacheBench)

```bash
# Test booking creation under load
ab -n 100 -c 10 \
  -p payload.json \
  -T application/json \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5002/bookings

# Results show:
# - Requests per second
# - Response time
# - Failed requests
```

### Using k6 (Modern Load Testing)

```javascript
// loadtest.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let response = http.get('http://localhost:5001/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## Testing Checklist

### Functionality Tests

- [ ] User can register
- [ ] User can login
- [ ] User can create booking
- [ ] Booking triggers driver assignment
- [ ] Driver assigned closest to pickup
- [ ] Tracking starts automatically
- [ ] Status updates every 20 seconds
- [ ] Notifications sent on status change
- [ ] Can view booking history
- [ ] Can view tracking history

### API Tests

- [ ] All endpoints return correct status codes
- [ ] Error messages are meaningful
- [ ] Validation works (test with invalid data)
- [ ] Authentication required where needed
- [ ] CORS headers present
- [ ] Request/response times acceptable

### DevOps Tests

- [ ] Docker Compose builds all images
- [ ] Health checks pass for all services
- [ ] Services communicate correctly
- [ ] Data persists in MongoDB
- [ ] Logs are visible
- [ ] Container restart works
- [ ] Network isolation works

### Frontend Tests

- [ ] UI loads without errors
- [ ] Login form validates input
- [ ] Booking form validates locations
- [ ] Tracking updates in real-time
- [ ] Notifications display correctly
- [ ] Logout works
- [ ] Protected routes redirect

---

## Common Demo Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| "Services unavailable" | Run `docker-compose up -d` |
| "No drivers" | Run `docker-compose exec driver-service npm run seed` |
| "Frontend blank" | Check browser console, `npm start` frontend |
| "Notifications missing" | Check `docker-compose logs notification-service` |
| "Tracking stuck" | Wait 20 seconds for automatic update |
| "Port in use" | Change port in docker-compose.yml |

---

## Presentation Tips

1. **Have backup plan**
   - Pre-record demo video if live demo risky
   - Have screenshots ready

2. **Explain as you go**
   - Point out microservice communication
   - Show real-time updates
   - Demonstrate different status states

3. **Show the code**
   - Driver assignment algorithm
   - Tracking simulation logic
   - Notification flow

4. **Discuss architecture**
   - Why microservices?
   - How does scaling work?
   - What are trade-offs?

5. **Be ready for questions**
   - "How does driver assignment work?" (nearest-first algorithm)
   - "What happens if driver goes offline?" (simulation only, production would have recovery)
   - "How to scale to millions of deliveries?" (database sharding, K8s, load balancer)

---

## Final Demonstration Output

**Evaluators should see:**

✅ Working login/register  
✅ Create booking with coordinates  
✅ Automatic driver assignment  
✅ Real-time tracking updates  
✅ Notifications in multiple channels  
✅ All services running in Docker  
✅ Clean UI showing status timeline  
✅ Evidence of CI/CD pipeline  
✅ Project documentation  
✅ Microservice architecture in action  

---

## Recording Demo (If Video Required)

**Tools:** OBS Studio, Camtasia, or ScreenCapture

**Steps:**
1. Start all services
2. Close other windows
3. Start recording
4. Follow demo script
5. Record console logs showing notifications
6. Show docker-compose ps
7. Stop and save

**Video Specs:**
- Duration: 5-10 minutes
- Resolution: 1080p
- Format: MP4
- No background noise
- Clear narration

---

## Post-Demo Checklist

- [ ] Export test results
- [ ] Save logs in document
- [ ] Screenshot of running services
- [ ] Screenshot of happy path completion
- [ ] Document any issues encountered
- [ ] Note timing (how long each step took)

---

**You're now ready to demonstrate a production-quality microservices delivery system!** 🎉
