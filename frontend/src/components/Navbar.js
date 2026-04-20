import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../utils/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>🚚 ShipEase</Link>
        <div style={styles.links}>
          {user ? (
            <>
              {user.role === 'driver' ? (
                <Link to="/driver" style={styles.link}>Driver Panel</Link>
              ) : (
                <>
                  <Link to="/bookings" style={styles.link}>Bookings</Link>
                  <Link to="/bookings/history" style={styles.link}>History</Link>
                  <Link to="/tracking" style={styles.link}>Tracking</Link>
                </>
              )}
              <span style={styles.user}>{user.name}</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Login</Link>
              <Link to="/register" style={styles.link}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  navbar: { backgroundColor: '#FF6B35', padding: '15px 0', color: 'white' },
  container: { maxWidth: '1200px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '24px', fontWeight: 'bold', color: 'white', textDecoration: 'none' },
  links: { display: 'flex', gap: '20px', alignItems: 'center' },
  link: { color: 'white', textDecoration: 'none' },
  user: { color: 'white' },
  logoutBtn: { backgroundColor: 'white', color: '#FF6B35', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }
};

export default Navbar;
