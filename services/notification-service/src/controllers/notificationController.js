const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');

const sendNotification = async (req, res) => {
  try {
    const { bookingId, userId, status, location } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Fetch user email
    let userEmail = 'customer@porter.com';
    try {
      if (userId) {
        const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${req.body.token || 'demo-token'}` }
        });
        userEmail = userResponse.data.user.email;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch user email, using default');
    }

    const notificationId = uuidv4();
    const message = `📦 Delivery Update: Your order status is now "${status}". Location: ${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}`;

    const notification = new Notification({
      notificationId,
      bookingId,
      userId,
      type: 'status_update',
      message,
      status: 'pending'
    });

    // Console notification
    console.log('\n' + '='.repeat(80));
    console.log('📬 NOTIFICATION SENT');
    console.log('='.repeat(80));
    console.log(`📌 Booking ID: ${bookingId}`);
    console.log(`👤 User Email: ${userEmail}`);
    console.log(`📍 Status: ${status}`);
    console.log(`📝 Message: ${message}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');

    notification.channels.console = {
      sent: true,
      timestamp: new Date()
    };

    // Email simulation
    console.log(`📧 EMAIL SIMULATION: Sent to ${userEmail}`);
    console.log(`Subject: Porter Delivery Update`);
    console.log(`Body: ${message}\n`);

    notification.channels.email = {
      sent: true,
      timestamp: new Date(),
      recipient: userEmail
    };

    notification.status = 'sent';
    await notification.save();

    res.status(200).json({
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Send Notification Error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ bookingId: req.params.bookingId })
      .sort({ createdAt: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Get User Notifications Error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  getUserNotifications
};
