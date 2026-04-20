import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './utils/AuthContext';
import { PrivateRoute } from './utils/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Booking from './pages/Booking';
import BookingHistory from './pages/BookingHistory';
import Tracking from './pages/Tracking';
import DriverDashboard from './pages/DriverDashboard';

const getRoleBasedHomeRoute = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return '/login';
    return user.role === 'driver' ? '/driver' : '/bookings';
  } catch (error) {
    return '/login';
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<PrivateRoute allowedRoles={['user']} />}>
            <Route path="/bookings" element={<Booking />} />
            <Route path="/bookings/history" element={<BookingHistory />} />
            <Route path="/tracking" element={<Tracking />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['driver']} />}>
            <Route path="/driver" element={<DriverDashboard />} />
          </Route>
          
          <Route path="/" element={<Navigate to={getRoleBasedHomeRoute()} />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
