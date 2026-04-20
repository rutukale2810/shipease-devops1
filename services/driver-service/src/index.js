const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const driverRoutes = require('./routes/driverRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Driver Service MongoDB connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use('/drivers', driverRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    service: 'driver-service',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5003;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Driver Service running on port ${PORT}`);
  });
}

module.exports = app;
