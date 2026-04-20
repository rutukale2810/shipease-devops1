import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../utils/AuthContext';
import TrackingMap from '../components/TrackingMap';

const Tracking = ({ bookingId: paramBookingId }) => {
  const { user, token } = useContext(AuthContext);
  const [bookingId, setBookingId] = useState(paramBookingId || '');
  const [tracking, setTracking] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusFlow = ['Order Placed', 'Picked Up', 'In Transit', 'Delivered'];
  const formatStatus = (status) => (status === 'In Transit' ? 'In Progress' : status);

  const fetchUserBookings = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5002/bookings/user/${user?.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(response.data.bookings);
      if (bookingId) {
        const matchedBooking = (response.data.bookings || []).find((b) => b.bookingId === bookingId);
        setSelectedBooking(matchedBooking || null);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }, [bookingId, user?.id, token]);

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  useEffect(() => {
    if (!bookingId) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const updateResponse = await axios.get(
          `http://localhost:5004/tracking/${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTracking(updateResponse.data.tracking);
      } catch (err) {
        // Keep polling quiet for missing old bookings.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bookingId, token]);

  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!tracking?.driverId) {
        setDriverInfo(null);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5003/drivers', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const matchedDriver = response.data?.drivers?.find(
          (driver) => driver.driverId === tracking.driverId
        );

        setDriverInfo(matchedDriver || null);
      } catch (err) {
        setDriverInfo(null);
      }
    };

    fetchDriverInfo();
  }, [tracking?.driverId, token]);

  const handleTrackBooking = async (e) => {
    e.preventDefault();
    if (!bookingId) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(
        `http://localhost:5004/tracking/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTracking(response.data.tracking);
    } catch (err) {
      const isNotFound = err.response?.status === 404;
      const fallbackMessage = selectedBooking?.status === 'pending_driver'
        ? 'Driver is not assigned yet, tracking will start after assignment.'
        : 'Tracking has not started yet for this booking.';
      setError(isNotFound ? fallbackMessage : (err.response?.data?.message || fallbackMessage));
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = async (booking) => {
    setSelectedBooking(booking);
    setBookingId(booking.bookingId);
    setError('');
    setTracking(null);
    setLoading(true);

    try {
      const response = await axios.get(
        `http://localhost:5004/tracking/${booking.bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTracking(response.data.tracking);
    } catch (err) {
      const isNotFound = err.response?.status === 404;
      const fallbackMessage = booking.status === 'pending_driver'
        ? 'Driver is not assigned yet, tracking will start after assignment.'
        : 'Tracking has not started yet for this booking.';
      setError(isNotFound ? fallbackMessage : (err.response?.data?.message || fallbackMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🗺️ Live Tracking</h1>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.section}>
        <h3>Select a Booking</h3>
        <div style={styles.bookingList}>
          {bookings.map((b) => (
            <button
              key={b._id}
              onClick={() => handleSelectBooking(b)}
              style={{
                ...styles.bookingButton,
                backgroundColor: bookingId === b.bookingId ? '#FF6B35' : '#f0f0f0',
                color: bookingId === b.bookingId ? 'white' : 'black'
              }}
            >
              <strong>{b.pickup?.name} → {b.drop?.name}</strong>
              <span style={styles.bookingMeta}>Status: {b.status}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleTrackBooking} style={styles.form}>
        <input
          type="text"
          placeholder="Enter Booking ID"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading || !bookingId}>
          {loading ? 'Loading...' : 'Track Delivery'}
        </button>
      </form>

      {tracking && (
        <div style={styles.trackingInfo}>
          <h2>📦 Delivery Details</h2>
          <div style={styles.statusTimeline}>
            {statusFlow.map((status, idx) => (
              <div key={idx} style={{ ...styles.timelineItem, opacity: idx <= statusFlow.indexOf(tracking.currentStatus) ? 1 : 0.3 }}>
                {formatStatus(status)}
              </div>
            ))}
          </div>

          <div style={styles.infoGrid}>
            <p><strong>Current Status:</strong> {formatStatus(tracking.currentStatus)}</p>
            <p><strong>Location:</strong> {tracking.currentLocation?.latitude?.toFixed(4)}, {tracking.currentLocation?.longitude?.toFixed(4)}</p>
            <p><strong>Started At:</strong> {tracking.startedAt ? new Date(tracking.startedAt).toLocaleString() : 'Not started'}</p>
            <p><strong>Reached At:</strong> {tracking.deliveredAt ? new Date(tracking.deliveredAt).toLocaleString() : 'On the way'}</p>
          </div>

          <div style={styles.driverCard}>
            <h3 style={styles.driverTitle}>Driver Details</h3>
            {driverInfo ? (
              <>
                <p><strong>Name:</strong> {driverInfo.name}</p>
                <p><strong>Phone:</strong> {driverInfo.phone}</p>
                <p><strong>Vehicle:</strong> {driverInfo.vehicleType?.toUpperCase()}</p>
              </>
            ) : (
              <p style={styles.driverHint}>Driver info is loading or not available yet.</p>
            )}
          </div>

          <TrackingMap tracking={tracking} />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  title: { color: '#FF6B35', textAlign: 'center' },
  form: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  section: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  bookingList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  bookingButton: { padding: '12px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'grid', gap: '6px' },
  bookingMeta: { fontSize: '13px', opacity: 0.85 },
  input: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '10px', backgroundColor: '#FF6B35', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { backgroundColor: '#ffe6e6', color: 'red', padding: '10px', borderRadius: '4px', marginBottom: '15px' },
  trackingInfo: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  statusTimeline: { display: 'flex', justifyContent: 'space-around', marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' },
  timelineItem: { textAlign: 'center', fontWeight: 'bold', color: '#FF6B35', transition: 'opacity 0.3s' },
  infoGrid: { backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '20px' },
  driverCard: { backgroundColor: '#fff7f3', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #ffe0d1' },
  driverTitle: { marginTop: 0, marginBottom: '10px', color: '#333' },
  driverHint: { margin: 0, color: '#666' }
};

export default Tracking;
