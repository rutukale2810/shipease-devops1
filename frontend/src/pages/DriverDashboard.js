import React, { useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../utils/AuthContext';

const DRIVER_API = 'https://shipease-devops-jj73.onrender.com';

const DriverDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '' });
  const [respondingTo, setRespondingTo] = useState(null);

  const fetchDriverProfile = useCallback(async () => {
    if (!user?.phone) { setLoading(false); return; }
    try {
      const response = await axios.get(`${DRIVER_API}/drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const matched = response.data?.drivers?.find((d) => d.phone === user.phone);
      setDriver(matched || null);
      if (matched?.currentLocation) {
        setLocationForm({
          latitude: matched.currentLocation.latitude,
          longitude: matched.currentLocation.longitude
        });
      }
      if (!matched) setError('Driver profile not found. Please contact admin.');
    } catch (err) {
      setError('Failed to load driver profile');
    } finally {
      setLoading(false);
    }
  }, [user?.phone, token]);

  useEffect(() => {
    fetchDriverProfile();
    // Poll every 8s to get new booking requests
    const interval = setInterval(fetchDriverProfile, 8000);
    return () => clearInterval(interval);
  }, [fetchDriverProfile]);

  const toggleAvailability = async () => {
    if (!driver?.driverId) return;
    setUpdatingStatus(true);
    setError('');
    try {
      const response = await axios.patch(
        `${DRIVER_API}/drivers/${driver.driverId}/availability`,
        { isAvailable: !driver.isAvailable },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDriver(response.data.driver);
    } catch (err) {
      setError('Could not update availability');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateLocation = async (event) => {
    event.preventDefault();
    if (!driver?.driverId) return;
    setUpdatingLocation(true);
    setError('');
    try {
      const response = await axios.patch(
        `${DRIVER_API}/drivers/${driver.driverId}/location`,
        locationForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDriver(response.data.driver);
    } catch (err) {
      setError('Could not update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const respondToBooking = async (bookingId, accept) => {
    if (!driver?.driverId) return;
    setRespondingTo(bookingId);
    try {
      await axios.post(
        `${DRIVER_API}/drivers/${driver.driverId}/respond`,
        { bookingId, accept },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDriverProfile();
    } catch (err) {
      setError('Failed to respond to booking request');
    } finally {
      setRespondingTo(null);
    }
  };

  if (loading) return <div style={styles.container}>Loading driver dashboard...</div>;

  const pendingRequests = driver?.pendingBookings || [];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Driver Dashboard</h1>
      {error && <div style={styles.error}>{error}</div>}

      {!driver ? (
        <div style={styles.card}>No driver data available.</div>
      ) : (
        <>
          {/* Incoming Booking Requests */}
          {pendingRequests.length > 0 && (
            <div style={{ ...styles.card, borderLeft: '4px solid #FF6B35' }}>
              <h2 style={styles.heading}>🔔 Incoming Booking Requests ({pendingRequests.length})</h2>
              {pendingRequests.map((req) => (
                <div key={req.bookingId} style={styles.requestCard}>
                  <div style={styles.requestInfo}>
                    <p style={styles.requestRow}><strong>Booking ID:</strong> {req.bookingId}</p>
                    <p style={styles.requestRow}><strong>Service:</strong> {req.serviceType?.toUpperCase()}</p>
                    <p style={styles.requestRow}><strong>Weight:</strong> {req.parcelWeightKg} kg</p>
                    <p style={styles.requestRow}><strong>Pickup:</strong> {req.pickupName || `${req.pickupLat}, ${req.pickupLon}`}</p>
                    <p style={styles.requestRow}><strong>Drop:</strong> {req.dropName || `${req.dropLat}, ${req.dropLon}`}</p>
                  </div>
                  <div style={styles.requestActions}>
                    <button
                      onClick={() => respondToBooking(req.bookingId, true)}
                      disabled={respondingTo === req.bookingId}
                      style={styles.acceptBtn}
                    >
                      {respondingTo === req.bookingId ? '...' : '✓ Accept'}
                    </button>
                    <button
                      onClick={() => respondToBooking(req.bookingId, false)}
                      disabled={respondingTo === req.bookingId}
                      style={styles.rejectBtn}
                    >
                      {respondingTo === req.bookingId ? '...' : '✗ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Overview */}
          <div style={styles.card}>
            <h2 style={styles.heading}>Quick Overview</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Status</span>
                <span style={styles.statValue}>{driver.isAvailable ? '🟢 Online' : '🔴 On Delivery'}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Rating</span>
                <span style={styles.statValue}>{driver.rating?.toFixed(1)}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Deliveries</span>
                <span style={styles.statValue}>{driver.totalDeliveries || 0}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Vehicle</span>
                <span style={styles.statValue}>{driver.vehicleType?.toUpperCase()}</span>
              </div>
            </div>
            <div style={styles.profileGrid}>
              <p><strong>Name:</strong> {driver.name}</p>
              <p><strong>Phone:</strong> {driver.phone}</p>
              <p><strong>Driver ID:</strong> {driver.driverId}</p>
              <p><strong>Location:</strong> {driver.currentLocation?.latitude}, {driver.currentLocation?.longitude}</p>
            </div>
            <div style={styles.actionRow}>
              <button
                onClick={toggleAvailability}
                disabled={updatingStatus}
                style={{ ...styles.button, backgroundColor: driver.isAvailable ? '#d84315' : '#2e7d32' }}
              >
                {updatingStatus ? 'Updating...' : driver.isAvailable ? 'Go Offline' : 'Go Online'}
              </button>
              <button onClick={fetchDriverProfile} style={styles.secondaryButton}>Refresh</button>
            </div>
          </div>

          {/* Update Location */}
          <div style={styles.card}>
            <h2 style={styles.heading}>Update Live Location</h2>
            <form onSubmit={updateLocation} style={styles.form}>
              <label style={styles.label}>
                Latitude
                <input type="number" step="any" name="latitude"
                  value={locationForm.latitude}
                  onChange={e => setLocationForm(p => ({ ...p, latitude: e.target.value }))}
                  style={styles.input} placeholder="28.6139" />
              </label>
              <label style={styles.label}>
                Longitude
                <input type="number" step="any" name="longitude"
                  value={locationForm.longitude}
                  onChange={e => setLocationForm(p => ({ ...p, longitude: e.target.value }))}
                  style={styles.input} placeholder="77.2090" />
              </label>
              <button type="submit" disabled={updatingLocation} style={styles.button}>
                {updatingLocation ? 'Saving...' : 'Save Location'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '20px' },
  title: { color: '#FF6B35', marginBottom: '18px' },
  card: { backgroundColor: 'white', borderRadius: '8px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', marginBottom: '16px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' },
  statCard: { backgroundColor: '#fff8f4', border: '1px solid #ffd8c5', borderRadius: '8px', padding: '14px' },
  statLabel: { display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' },
  statValue: { fontSize: '18px', fontWeight: 700, color: '#222' },
  profileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 18px' },
  actionRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' },
  heading: { marginTop: 0, color: '#222' },
  button: { marginTop: '12px', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 14px', cursor: 'pointer', backgroundColor: '#FF6B35' },
  secondaryButton: { marginTop: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 14px', cursor: 'pointer' },
  form: { display: 'grid', gap: '12px', maxWidth: '420px' },
  label: { display: 'grid', gap: '6px', fontWeight: 600, color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px 12px', fontSize: '14px' },
  error: { backgroundColor: '#ffe6e6', color: '#b71c1c', padding: '10px', borderRadius: '4px', marginBottom: '14px' },
  requestCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', border: '1px solid #ffd8c5', borderRadius: '8px', padding: '14px', marginBottom: '10px', backgroundColor: '#fff8f4', flexWrap: 'wrap', gap: '12px' },
  requestInfo: { flex: 1 },
  requestRow: { margin: '4px 0', fontSize: '14px' },
  requestActions: { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' },
  acceptBtn: { backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  rejectBtn: { backgroundColor: '#c62828', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }
};

export default DriverDashboard;
