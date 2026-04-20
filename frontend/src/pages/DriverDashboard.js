import React, { useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../utils/AuthContext';

const DriverDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '' });

  const fetchDriverProfile = useCallback(async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://localhost:5003/drivers', {
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
      if (!matched) {
        setError('Driver profile not found. Please contact admin or re-register as driver.');
      }
    } catch (err) {
      setError('Failed to load driver profile');
    } finally {
      setLoading(false);
    }
  }, [user?.phone, token]);

  const handleLocationChange = (event) => {
    const { name, value } = event.target;
    setLocationForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const refreshProfile = async () => {
    setLoading(true);
    setError('');
    await fetchDriverProfile();
  };

  useEffect(() => {
    fetchDriverProfile();
  }, [fetchDriverProfile]);

  const toggleAvailability = async () => {
    if (!driver?.driverId) {
      return;
    }

    setUpdatingStatus(true);
    setError('');

    try {
      const response = await axios.patch(
        `http://localhost:5003/drivers/${driver.driverId}/availability`,
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

    if (!driver?.driverId) {
      return;
    }

    setUpdatingLocation(true);
    setError('');

    try {
      const response = await axios.patch(
        `http://localhost:5003/drivers/${driver.driverId}/location`,
        locationForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDriver(response.data.driver);
      setLocationForm({
        latitude: response.data.driver.currentLocation.latitude,
        longitude: response.data.driver.currentLocation.longitude
      });
    } catch (err) {
      setError('Could not update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading driver dashboard...</div>;
  }

  const currentLatitude = driver?.currentLocation?.latitude ?? 'N/A';
  const currentLongitude = driver?.currentLocation?.longitude ?? 'N/A';

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Driver Dashboard</h1>
      {error && <div style={styles.error}>{error}</div>}

      {!driver ? (
        <div style={styles.card}>No driver data available.</div>
      ) : (
        <>
          <div style={styles.card}>
            <h2 style={styles.heading}>Quick Overview</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Current Status</span>
                <span style={styles.statValue}>{driver.isAvailable ? 'Online' : 'On Delivery'}</span>
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
              <p><strong>Current Location:</strong> {currentLatitude}, {currentLongitude}</p>
            </div>

            <div style={styles.actionRow}>
              <button
                onClick={toggleAvailability}
                disabled={updatingStatus}
                style={{
                  ...styles.button,
                  backgroundColor: driver.isAvailable ? '#d84315' : '#2e7d32'
                }}
              >
                {updatingStatus
                  ? 'Updating...'
                  : driver.isAvailable
                    ? 'Go Offline'
                    : 'Go Online'}
              </button>

              <button onClick={refreshProfile} style={styles.secondaryButton}>
                Refresh Profile
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.heading}>Update Live Location</h2>
            <form onSubmit={updateLocation} style={styles.form}>
              <label style={styles.label}>
                Latitude
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={locationForm.latitude}
                  onChange={handleLocationChange}
                  style={styles.input}
                  placeholder="28.6139"
                />
              </label>

              <label style={styles.label}>
                Longitude
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={locationForm.longitude}
                  onChange={handleLocationChange}
                  style={styles.input}
                  placeholder="77.2090"
                />
              </label>

              <button type="submit" disabled={updatingLocation} style={styles.button}>
                {updatingLocation ? 'Saving...' : 'Save Location'}
              </button>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.heading}>Driver Tools</h2>
            <div style={styles.toolsGrid}>
              <div style={styles.toolCard}>
                <strong>Availability Control</strong>
                <p>Go online or offline from one click.</p>
              </div>
              <div style={styles.toolCard}>
                <strong>Location Sync</strong>
                <p>Update current latitude and longitude when you move.</p>
              </div>
              <div style={styles.toolCard}>
                <strong>Profile Snapshot</strong>
                <p>See rating, deliveries, and driver ID at a glance.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px'
  },
  title: {
    color: '#FF6B35',
    marginBottom: '18px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    marginBottom: '16px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  statCard: {
    backgroundColor: '#fff8f4',
    border: '1px solid #ffd8c5',
    borderRadius: '8px',
    padding: '14px'
  },
  statLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#222'
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '8px 18px'
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '14px'
  },
  heading: {
    marginTop: 0,
    color: '#222'
  },
  button: {
    marginTop: '12px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 14px',
    cursor: 'pointer'
  },
  secondaryButton: {
    marginTop: '12px',
    backgroundColor: '#111827',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 14px',
    cursor: 'pointer'
  },
  form: {
    display: 'grid',
    gap: '12px',
    maxWidth: '420px'
  },
  label: {
    display: 'grid',
    gap: '6px',
    fontWeight: 600,
    color: '#374151'
  },
  input: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px'
  },
  toolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px'
  },
  toolCard: {
    border: '1px solid #f1f5f9',
    borderRadius: '8px',
    padding: '14px',
    backgroundColor: '#fafafa'
  },
  error: {
    backgroundColor: '#ffe6e6',
    color: '#b71c1c',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '14px'
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    lineHeight: 1.6
  }
};

export default DriverDashboard;
