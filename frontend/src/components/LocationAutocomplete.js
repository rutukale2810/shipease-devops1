import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const LocationAutocomplete = ({
  label,
  placeholder,
  onSelectLocation,
  countryCode = 'in'
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: query,
            format: 'jsonv2',
            addressdetails: 1,
            limit: 5,
            countrycodes: countryCode
          },
          headers: {
            'Accept-Language': 'en'
          }
        });

        setSuggestions(response.data || []);
        setIsOpen(true);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, countryCode]);

  const handleInputChange = (event) => {
    setQuery(event.target.value);
    onSelectLocation(null);
  };

  const handleSelect = (item) => {
    setQuery(item.display_name);
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation({
      name: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    });
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        style={styles.input}
      />

      {loading && <div style={styles.helper}>Searching location...</div>}

      {isOpen && suggestions.length > 0 && (
        <div style={styles.dropdown}>
          {suggestions.map((item) => (
            <button
              type="button"
              key={`${item.place_id}-${item.lat}-${item.lon}`}
              onClick={() => handleSelect(item)}
              style={styles.option}
            >
              {item.display_name}
            </button>
          ))}
        </div>
      )}

      {!loading && query.trim().length > 0 && query.trim().length < 3 && (
        <div style={styles.helper}>Type at least 3 characters.</div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'relative',
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  helper: {
    marginTop: '6px',
    color: '#666',
    fontSize: '12px'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 20,
    maxHeight: '220px',
    overflowY: 'auto',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 8px 18px rgba(0,0,0,0.1)',
    marginTop: '4px'
  },
  option: {
    width: '100%',
    textAlign: 'left',
    padding: '10px',
    border: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0'
  }
};

export default LocationAutocomplete;
