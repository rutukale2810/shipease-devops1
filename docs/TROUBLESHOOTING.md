# Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: "Cannot connect to MongoDB"

**Error Message:**
```
MongooseError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**

1. **MongoDB not running**
   ```bash
   # Start MongoDB
   docker-compose up -d mongodb
   
   # Verify container
   docker ps | grep mongodb
   ```

2. **Wrong MongoDB URI**
   ```bash
   # Check .env file
   cat services/user-service/.env
   
   # Should be: mongodb://localhost:27017/porter_dev (local)
   # Or: mongodb+srv://user:pass@cluster.mongodb.net/porter_dev (Atlas)
   ```

3. **MongoDB Atlas connection issues**
   - Whitelist your IP in MongoDB Atlas
   - Use correct username/password
   - Check network access settings

---

### Issue 2: "Port 5001 already in use"

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::5001
```

**Solutions:**

1. **Windows:**
   ```powershell
   # Find process using port
   netstat -ano | findstr :5001
   
   # Kill process (replace PID)
   taskkill /PID <PID> /F
   ```

2. **Linux/Mac:**
   ```bash
   # Find process
   lsof -i :5001
   
   # Kill process
   kill -9 <PID>
   ```

3. **Change port in .env**
   ```
   PORT=5006  # Use different port
   ```

---

### Issue 3: Services won't start in Docker Compose

**Error Message:**
```
ERROR: for user-service  Cannot start service user-service: Mounts denied
```

**Solutions:**

1. **Docker Desktop sharing**
   - Open Docker Desktop → Preferences → Resources
   - Add project folder to "File Sharing"
   - Restart Docker

2. **Volume permissions**
   ```bash
   # Fix permissions
   chmod -R 755 ./services
   
   # Rebuild
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Check docker-compose.yml syntax**
   ```bash
   docker-compose config
   ```

---

### Issue 4: "Service dependencies not satisfied"

**Error Message:**
```
user-service | Error: connect ECONNREFUSED
booking-service | Error: Cannot reach user-service
```

**Solutions:**

1. **Check service startup order**
   ```bash
   docker-compose up -d mongodb
   sleep 5
   docker-compose up -d
   ```

2. **Verify network connectivity**
   ```bash
   docker-compose exec booking-service ping user-service
   ```

3. **Check service URLs in .env**
   ```
   USER_SERVICE_URL=http://user-service:5001  # NOT localhost
   DRIVER_SERVICE_URL=http://driver-service:5003
   ```

---

### Issue 5: "Database connection timeout"

**Error Message:**
```
MongooseError: operation timed out
```

**Solutions:**

1. **Increase connection timeout**
   ```javascript
   // In service index.js
   mongoose.connect(process.env.MONGODB_URI, {
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
   });
   ```

2. **Check MongoDB Atlas firewall**
   - Whitelist 0.0.0.0/0 for development
   - Whitelist specific IPs for production

3. **Verify MongoDB status**
   ```bash
   docker-compose exec mongodb mongosh
   ```

---

### Issue 6: "JWT token verification failed"

**Error Message:**
```
JsonWebTokenError: invalid token
```

**Solutions:**

1. **Token expired**
   ```bash
   # Re-login to get new token
   POST http://localhost:5001/auth/login
   ```

2. **Wrong JWT_SECRET**
   ```bash
   # Ensure same secret in all services
   # User Service .env: JWT_SECRET=your_secret
   # Should match: services/user-service/.env
   ```

3. **Token format incorrect**
   ```javascript
   // Correct format
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   
   // NOT
   Authorization: eyJhbGciOiJIUzI1NiIs...  // Missing "Bearer"
   ```

---

### Issue 7: "Booking creation fails with driver assignment"

**Error Message:**
```
⚠️ Driver assignment failed: connect ECONNREFUSED driver-service
```

**Solutions:**

1. **Driver service not running**
   ```bash
   docker-compose up -d driver-service
   docker-compose ps
   ```

2. **Drivers not seeded**
   ```bash
   cd services/driver-service
   npm run seed
   ```

3. **DRIVER_SERVICE_URL incorrect**
   ```bash
   # Verify in booking-service/.env
   # Docker: http://driver-service:5003
   # Local: http://localhost:5003
   ```

---

### Issue 8: "Tracking simulation not starting"

**Error Message:**
```
Tracking started but status remains "Order Placed"
```

**Solutions:**

1. **Check tracking service logs**
   ```bash
   docker-compose logs tracking-service
   ```

2. **Notification service not running**
   ```bash
   docker-compose up -d notification-service
   ```

3. **Interval timing issue**
   - Simulation updates every 20 seconds
   - Wait 20+ seconds before checking tracking

---

### Issue 9: "Notifications not being sent"

**Error Message:**
```
No notifications in console or email
```

**Solutions:**

1. **Check notification service logs**
   ```bash
   docker-compose logs notification-service
   ```

2. **Verify tracking emitted status change**
   ```bash
   GET http://localhost:5004/tracking/<bookingId>
   # Check statusHistory array
   ```

3. **Check User Service availability**
   ```bash
   curl http://localhost:5001/health
   ```

---

### Issue 10: "Frontend won't connect to API"

**Error Message:**
```
CORS error or Connection refused in browser console
```

**Solutions:**

1. **CORS configuration**
   ```javascript
   // Each service already has cors()
   // Check header in app.use(cors())
   ```

2. **Wrong API URL in frontend**
   ```bash
   # Check frontend/.env
   REACT_APP_API_BASE_URL=http://localhost
   
   # Should match service ports
   # User Service: http://localhost:5001
   ```

3. **Services not running**
   ```bash
   docker-compose up -d
   curl http://localhost:5001/health
   curl http://localhost:5002/health
   ```

4. **Firewall blocking ports**
   - Check Windows Firewall
   - Allow ports 5001-5005, 3000, 27017

---

### Issue 11: "React frontend blank page"

**Error Message:**
```
Blank page in browser, check console
```

**Solutions:**

1. **Check browser console**
   - Press F12
   - Look for errors in Console tab

2. **Verify npm dependencies**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Clear npm cache**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

---

### Issue 12: "Docker image build fails"

**Error Message:**
```
failed to build image
```

**Solutions:**

1. **Check Dockerfile syntax**
   ```bash
   docker build -f services/user-service/Dockerfile .
   ```

2. **npm install failing**
   ```dockerfile
   # Add --no-optional flag in Dockerfile
   RUN npm ci --only=production --no-optional
   ```

3. **Disk space issues**
   ```bash
   # Clean docker
   docker system prune -a
   docker volume prune
   ```

---

## Performance Issues

### Slow API Responses

1. **Check MongoDB indexes**
   ```javascript
   db.bookings.createIndex({ userId: 1 })
   db.tracking.createIndex({ bookingId: 1 })
   ```

2. **Enable response compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

3. **Monitor service performance**
   ```bash
   docker stats
   ```

---

## Data Issues

### Database Corruption

```bash
# Backup and clear
docker-compose down -v

# Restart fresh
docker-compose up -d
npm run seed  # Reseed drivers
```

### Lost Data

Always maintain MongoDB backups:
```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /backup

# Restore
docker-compose exec mongodb mongorestore /backup
```

---

## Debugging Tips

### 1. Enable Debug Logging
```javascript
// Add to service index.js
process.env.DEBUG = '*';
```

### 2. Add Console Logs
```javascript
console.log('🔵 [EVENT] Status changed:', status);
console.log('📍 [LOCATION]', currentLocation);
console.log('❌ [ERROR]', error.message);
```

### 3. Check Health Endpoints
```bash
for i in 5001 5002 5003 5004 5005; do
  curl http://localhost:$i/health 2>/dev/null | jq .
done
```

### 4. Database Query Testing
```bash
docker-compose exec mongodb mongosh
use porter_dev
db.bookings.find()
db.drivers.find()
```

---

## Getting Help

1. **Check logs first**
   ```bash
   docker-compose logs <service-name>
   ```

2. **Test endpoints manually**
   ```bash
   curl -X GET http://localhost:5001/health
   ```

3. **Verify environment variables**
   ```bash
   docker-compose exec user-service env | grep MONGODB
   ```

4. **Check GitHub Issues** for reported problems

5. **Review documentation** - docs/ folder

---

## Quick Recovery

```bash
# Nuclear option: reset everything
docker-compose down -v
rm -rf services/*/node_modules
docker system prune -a

# Fresh start
docker-compose up --build -d
cd services/driver-service && npm run seed
```

**This should resolve 95% of issues!**
