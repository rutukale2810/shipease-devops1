import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../utils/AuthContext';
import { Link } from 'react-router-dom';
import LocationAutocomplete from '../components/LocationAutocomplete';

const serviceRules = {
  bike: {
    label: 'Bike',
    minWeight: 0,
    maxWeight: 5,
    baseFare: 60,
    perKmRate: 9,
    perKgRate: 4
  },
  small_tempo: {
    label: 'Small Tempo',
    minWeight: 5,
    maxWeight: 50,
    baseFare: 140,
    perKmRate: 14,
    perKgRate: 3
  },
  truck: {
    label: 'Truck',
    minWeight: 50,
    maxWeight: 500,
    baseFare: 320,
    perKmRate: 22,
    perKgRate: 2
  }
};

const round2 = (value) => Math.round(value * 100) / 100;

const calculateDistanceKm = (pickup, drop) => {
  if (!pickup || !drop) {
    return 0;
  }

  const lat1 = Number(pickup.latitude);
  const lon1 = Number(pickup.longitude);
  const lat2 = Number(drop.latitude);
  const lon2 = Number(drop.longitude);

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return 0;
  }

  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const Booking = () => {
  const { user, token } = useContext(AuthContext);
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [receiver, setReceiver] = useState({ name: '', phone: '' });
  const [receiverPhoneError, setReceiverPhoneError] = useState('');
  const [parcelWeightKg, setParcelWeightKg] = useState('');
  const [serviceType, setServiceType] = useState('bike');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const estimatedDistanceKm = round2(calculateDistanceKm(pickup, drop));
  const selectedService = serviceRules[serviceType];
  const parsedWeight = Number(parcelWeightKg);
  const hasReceiver = Boolean(receiver.name.trim()) && /^\d{10}$/.test(receiver.phone.trim());
  const hasLocations = Boolean(pickup && drop);
  const isWeightValid =
    Number.isFinite(parsedWeight) &&
    parsedWeight > 0 &&
    parsedWeight >= selectedService.minWeight &&
    parsedWeight <= selectedService.maxWeight;
  const canPreviewFare = hasReceiver && hasLocations && Number.isFinite(parsedWeight) && parsedWeight > 0;

  const farePreview = {
    baseFare: selectedService.baseFare,
    distanceFare: round2(estimatedDistanceKm * selectedService.perKmRate),
    weightFare: Number.isFinite(parsedWeight) ? round2(parsedWeight * selectedService.perKgRate) : 0
  };
  farePreview.totalFare = round2(farePreview.baseFare + farePreview.distanceFare + farePreview.weightFare);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!pickup || !drop) {
      setError('Please select both pickup and drop locations from suggestions.');
      setLoading(false);
      return;
    }

    if (!receiver.name.trim() || !receiver.phone.trim()) {
      setError('Please enter receiver name and phone.');
      setLoading(false);
      return;
    }

    if (!/^\d{10}$/.test(receiver.phone.trim())) {
      setError('Receiver phone must be a 10-digit number.');
      setLoading(false);
      return;
    }

    if (!isWeightValid) {
      setError(
        `Selected service supports ${selectedService.minWeight}-${selectedService.maxWeight} kg. Please update weight or service.`
      );
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5002/bookings',
        {
          userId: user?.id,
          pickup,
          drop,
          receiver,
          parcelWeightKg: parsedWeight,
          serviceType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Booking created successfully! Booking ID: ${response.data?.booking?.bookingId || 'generated'}`);
      setPickup(null);
      setDrop(null);
      setReceiver({ name: '', phone: '' });
      setReceiverPhoneError('');
      setParcelWeightKg('');
      setServiceType('bike');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Create Booking</h1>
        <Link to="/bookings/history" style={styles.historyButton}>Open Booking History</Link>
      </div>
      
      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleCreateBooking} style={styles.form}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Receiver Details</h3>
          <input
            type="text"
            placeholder="Receiver Name"
            value={receiver.name}
            onChange={(e) => setReceiver((prev) => ({ ...prev, name: e.target.value }))}
            style={styles.input}
            required
          />
          <input
            type="tel"
            placeholder="Receiver Phone (10 digits)"
            value={receiver.phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
              setReceiver((prev) => ({ ...prev, phone: cleaned }));
              setReceiverPhoneError(cleaned.length === 10 ? '' : 'Please enter exactly 10 digits');
            }}
            style={styles.input}
            required
          />
          {receiver.phone && (
            <p style={{ ...styles.helperText, color: receiverPhoneError ? '#b71c1c' : '#0a7a2f' }}>
              {receiverPhoneError || 'Valid 10-digit receiver phone'}
            </p>
          )}
          
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Pickup Location</h3>
          <LocationAutocomplete
            label="Pickup Address"
            placeholder="Search pickup location (e.g. IGI Airport Delhi)"
            onSelectLocation={setPickup}
          />
          {pickup && (
            <p style={styles.meta}>
              Selected: {pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Drop Location</h3>
          <LocationAutocomplete
            label="Drop Address"
            placeholder="Search destination (e.g. Connaught Place)"
            onSelectLocation={setDrop}
          />
          {drop && (
            <p style={styles.meta}>
              Selected: {drop.latitude.toFixed(4)}, {drop.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Parcel Details</h3>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Parcel Weight (kg)"
            value={parcelWeightKg}
            onChange={(e) => setParcelWeightKg(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Select Transportation Service</h3>
          <div style={styles.serviceGrid}>
            {Object.entries(serviceRules).map(([key, service]) => (
              <button
                type="button"
                key={key}
                onClick={() => setServiceType(key)}
                style={{
                  ...styles.serviceCard,
                  ...(serviceType === key ? styles.serviceCardActive : {})
                }}
              >
                <strong>{service.label}</strong>
                <span>{service.minWeight}-{service.maxWeight} kg</span>
              </button>
            ))}
          </div>
          {!isWeightValid && parcelWeightKg && (
            <p style={styles.weightHint}>
              Weight not supported for {selectedService.label}. Allowed range: {selectedService.minWeight}-{selectedService.maxWeight} kg.
            </p>
          )}
        </div>

        {canPreviewFare && (
          <div style={styles.fareCard}>
            <h3 style={styles.sectionTitle}>Fare Calculation</h3>
            <p><strong>Estimated Distance:</strong> {estimatedDistanceKm} km</p>
            <p><strong>Base Fare:</strong> INR {farePreview.baseFare}</p>
            <p><strong>Distance Fare:</strong> INR {farePreview.distanceFare}</p>
            <p><strong>Weight Fare:</strong> INR {farePreview.weightFare}</p>
            <p style={styles.totalFare}><strong>Total:</strong> INR {farePreview.totalFare}</p>
          </div>
        )}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Creating...' : 'Create Booking'}
        </button>

        {success && <div style={styles.successUnderButton}>{success}</div>}
      </form>
    </div>
  );
};

const styles = {
  container: { padding: '24px', maxWidth: '960px', margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' },
  title: { color: '#FF6B35', margin: 0 },
  historyButton: { backgroundColor: '#111827', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '10px 14px', fontWeight: 600 },
  form: { backgroundColor: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
  section: { marginBottom: '20px', padding: '14px', border: '1px solid #f0f0f0', borderRadius: '10px', backgroundColor: '#fafafa' },
  sectionTitle: { marginTop: 0, marginBottom: '10px' },
  helperText: { marginTop: 0, marginBottom: 0, color: '#666', fontSize: '13px' },
  meta: { marginTop: '8px', marginBottom: '0', color: '#666', fontSize: '13px' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' },
  serviceGrid: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
  serviceCard: { textAlign: 'left', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '10px', padding: '12px', display: 'grid', gap: '4px', cursor: 'pointer' },
  serviceCardActive: { borderColor: '#FF6B35', backgroundColor: '#fff3ed', boxShadow: '0 0 0 2px rgba(255,107,53,0.15)' },
  weightHint: { color: '#b71c1c', marginTop: '10px', marginBottom: 0 },
  fareCard: { backgroundColor: '#fffaf5', border: '1px solid #ffd6bf', borderRadius: '10px', padding: '14px', marginBottom: '18px' },
  totalFare: { fontSize: '18px', color: '#222' },
  button: { width: '100%', padding: '12px', backgroundColor: '#FF6B35', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 },
  error: { backgroundColor: '#ffe6e6', color: 'red', padding: '10px', borderRadius: '8px', marginBottom: '15px' },
  successUnderButton: { backgroundColor: '#e8fff0', color: '#05603a', padding: '10px', borderRadius: '8px', marginTop: '12px' }
};

export default Booking;
