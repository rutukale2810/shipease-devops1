import React from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

const iconBase = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

const pickupIcon = L.icon({
  iconUrl: `${iconBase}marker-icon.png`,
  shadowUrl: `${iconBase}marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const currentIcon = L.icon({
  iconUrl: `${iconBase}marker-icon.png`,
  shadowUrl: `${iconBase}marker-shadow.png`,
  iconSize: [30, 48],
  iconAnchor: [15, 48]
});

const destinationIcon = L.icon({
  iconUrl: `${iconBase}marker-icon.png`,
  shadowUrl: `${iconBase}marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const TrackingMap = ({ tracking }) => {
  if (!tracking) {
    return null;
  }

  const pickup = [tracking.pickupLocation?.latitude, tracking.pickupLocation?.longitude];
  const current = [tracking.currentLocation?.latitude, tracking.currentLocation?.longitude];
  const destination = [tracking.destinationLocation?.latitude, tracking.destinationLocation?.longitude];

  const hasPoints = pickup.every(Number.isFinite) && current.every(Number.isFinite) && destination.every(Number.isFinite);

  if (!hasPoints) {
    return <div style={styles.fallback}>Map not available for this tracking data.</div>;
  }

  return (
    <div style={styles.mapCard}>
      <h3 style={styles.title}>Live Delivery Map</h3>
      <MapContainer
        center={current}
        zoom={13}
        scrollWheelZoom={true}
        style={styles.map}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        <Polyline positions={[pickup, current, destination]} pathOptions={{ color: '#FF6B35', weight: 5 }} />

        <Marker position={pickup} icon={pickupIcon}>
          <Popup>Pickup Point</Popup>
        </Marker>

        <Marker position={current} icon={currentIcon}>
          <Popup>Current Location</Popup>
        </Marker>

        <Marker position={destination} icon={destinationIcon}>
          <Popup>Destination</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

const styles = {
  mapCard: {
    marginTop: '20px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #eee'
  },
  title: {
    margin: 0,
    padding: '12px 14px',
    backgroundColor: '#fff7f3',
    borderBottom: '1px solid #eee',
    color: '#333'
  },
  map: {
    width: '100%',
    height: '320px'
  },
  fallback: {
    marginTop: '14px',
    color: '#666'
  }
};

export default TrackingMap;
