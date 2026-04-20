import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../utils/AuthContext';

const BookingHistory = () => {
  const { user, token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5002/bookings/user/${user?.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError('Could not load booking history.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Booking History</h1>
        <Link to="/bookings" style={styles.backButton}>Back to Create Booking</Link>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.emptyCard}>Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div style={styles.emptyCard}>No previous bookings yet.</div>
      ) : (
        <div style={styles.grid}>
          {bookings.map((b) => (
            <div key={b._id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.idLabel}>Booking ID</span>
                <span style={styles.idValue}>{b.bookingId}</span>
              </div>
              <p><strong>From:</strong> {b.pickup?.name}</p>
              <p><strong>To:</strong> {b.drop?.name}</p>
              <p><strong>Receiver:</strong> {b.receiver?.name} ({b.receiver?.phone})</p>
              <p><strong>Service:</strong> {(b.serviceType || '').replace('_', ' ')}</p>
              <p><strong>Weight:</strong> {b.parcelWeightKg} kg</p>
              <p><strong>Fare:</strong> INR {b.fareBreakdown?.totalFare}</p>
              <p><strong>Status:</strong> <span style={styles.status}>{b.status}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '24px', maxWidth: '980px', margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  title: { margin: 0, color: '#FF6B35' },
  backButton: { textDecoration: 'none', backgroundColor: '#111827', color: 'white', borderRadius: '10px', padding: '10px 14px', fontWeight: 600 },
  error: { backgroundColor: '#ffe6e6', color: '#b71c1c', padding: '10px', borderRadius: '8px', marginBottom: '12px' },
  emptyCard: { backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  grid: { display: 'grid', gap: '14px' },
  card: { backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', boxShadow: '0 6px 16px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'grid', marginBottom: '8px' },
  idLabel: { color: '#6b7280', fontSize: '12px' },
  idValue: { fontWeight: 700 },
  status: { textTransform: 'capitalize', fontWeight: 700, color: '#222' }
};

export default BookingHistory;
