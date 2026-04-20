# Deployment Guide

## Prerequisites

- Docker Desktop installed with WSL2 enabled
- MongoDB instance (local or Atlas)
- Git configured
- GitHub account with repository

## Local Development Setup

### 1. Clone Repository
```bash
git clone <repo-url>
cd Porter
```

### 2. Configure Environment Variables

Each service needs a `.env` file:

**User Service** (`services/user-service/.env`)
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/porter_dev
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=24h
NODE_ENV=development
```

**Booking Service** (`services/booking-service/.env`)
```
PORT=5002
MONGODB_URI=mongodb://localhost:27017/porter_dev
DRIVER_SERVICE_URL=http://localhost:5003
TRACKING_SERVICE_URL=http://localhost:5004
```

**Driver Service** (`services/driver-service/.env`)
```
PORT=5003
MONGODB_URI=mongodb://localhost:27017/porter_dev
BOOKING_SERVICE_URL=http://localhost:5002
TRACKING_SERVICE_URL=http://localhost:5004
```

**Tracking Service** (`services/tracking-service/.env`)
```
PORT=5004
MONGODB_URI=mongodb://localhost:27017/porter_dev
NOTIFICATION_SERVICE_URL=http://localhost:5005
```

**Notification Service** (`services/notification-service/.env`)
```
PORT=5005
MONGODB_URI=mongodb://localhost:27017/porter_dev
USER_SERVICE_URL=http://localhost:5001
```

**Frontend** (`frontend/.env`)
```
REACT_APP_API_BASE_URL=http://localhost
```

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# Verify all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Seed Initial Data

```bash
# Seed drivers
docker-compose exec driver-service npm run seed
```

### 5. Access Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| User Service Docs | http://localhost:5001/health |
| Booking Service Docs | http://localhost:5002/health |
| Driver Service Docs | http://localhost:5003/health |
| Tracking Service Docs | http://localhost:5004/health |
| Notification Service Docs | http://localhost:5005/health |

## Testing the Application

### 1. Register & Login
```bash
# Open http://localhost:3000
# Click "Register"
# Fill form and submit
# Login with credentials
```

### 2. Create Booking
```bash
# Click "Bookings"
# Enter pickup location: Delhi Airport (28.5562, 77.1000)
# Enter drop location: Connaught Place (28.6273, 77.1854)
# Click "Create Booking"
```

### 3. Track Delivery
```bash
# Click "Tracking"
# Select your booking from list
# Watch live status updates
# Observe status timeline
```

### 4. Using Postman
1. Import `tests/postman/Porter.postman_collection.json` into Postman
2. Set variables (baseUrl, token, userId, etc.)
3. Test each endpoint

## Production-Ready Deployment

### Option 1: Docker Compose on VM

```bash
# SSH into VM
ssh user@your-server

# Clone repo
git clone <repo-url>
cd Porter

# Set production environment variables
export NODE_ENV=production
export JWT_SECRET=<strong-random-key>
export MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/porter_prod

# Start services
docker-compose -f docker-compose.yml up -d

# Monitor
docker logs -f <container-name>
```

### Option 2: Kubernetes Deployment

**Create ConfigMaps and Secrets:**
```bash
kubectl create configmap porter-config --from-literal=JWT_SECRET=<strong-key>
kubectl create secret generic db-secret --from-literal=MONGODB_URI=<connection-string>
```

**Deploy Services:**
```bash
kubectl apply -f infra/k8s/deployment.yaml
kubectl apply -f infra/k8s/service.yaml
```

### Option 3: Cloud Platforms

**Render.com:**
1. Connect GitHub repository
2. Create Web Services for each microservice
3. Set environment variables
4. Deploy

**Railway.app:**
1. Link GitHub
2. Auto-detect services
3. Configure environment
4. Deploy

**AWS Elastic Beanstalk:**
1. Package as Docker container
2. Create .ebextensions/
3. Deploy via eb cli

## CI/CD Pipeline

### GitHub Actions Setup

Workflow is already configured in `.github/workflows/ci.yml`

**Triggers:**
- Push to main/develop
- Pull requests to main

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Lint code
5. Build Docker images
6. Run tests
7. Upload artifacts

**To manually trigger:**
```bash
git push origin main
# GitHub Actions automatically runs
```

## Monitoring & Logs

### Docker Compose Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service

# Last 100 lines
docker-compose logs --tail=100
```

### Health Checks
```bash
# Check all services
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health
curl http://localhost:5005/health
```

## Troubleshooting

### Services Won't Start
```bash
# Check Docker Compose syntax
docker-compose config

# Rebuild images
docker-compose build --no-cache

# Remove old containers
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues
```bash
# Verify MongoDB is running
docker ps | grep mongodb

# Check connection string
# Verify network: docker network ls
```

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :5001

# Change port in docker-compose.yml
# Restart services
```

## Scaling Considerations

### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  booking-service:
    deploy:
      replicas: 3
    ports:
      - "5002:5002"
      - "5002:5002"
      - "5002:5002"
```

### Load Balancing
Add nginx reverse proxy:
```nginx
upstream booking {
    server booking-service:5002;
    server booking-service-2:5002;
    server booking-service-3:5002;
}
```

## Rollback Procedure

```bash
# Tag production version
git tag v1.0.0
git push origin v1.0.0

# Rollback to previous version
git checkout v0.9.9
docker-compose build
docker-compose up -d
```

## Performance Optimization

1. **Enable Caching**
   - Redis for session storage
   - Implement rate limiting

2. **Database Optimization**
   - Create indexes on frequently queried fields
   - Archive old records

3. **API Optimization**
   - Implement response pagination
   - Use compression (gzip)

4. **Frontend**
   - Code splitting
   - Lazy loading
   - Service worker caching

## Security Hardening

- [ ] Update all dependencies regularly
- [ ] Use strong JWT secrets (64+ char random)
- [ ] Enable HTTPS in production
- [ ] Set up firewall rules
- [ ] Regular security audits
- [ ] Implement rate limiting
- [ ] Add authentication for admin endpoints

## Maintenance Schedule

| Task | Frequency |
|------|-----------|
| Dependency updates | Weekly |
| Security patches | ASAP |
| Database backups | Daily |
| Log rotation | Daily |
| Performance monitoring | Continuous |
