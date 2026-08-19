import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue with Leaflet in React bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons for different markers
const createCustomIcon = (color, symbol) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
    <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
    <text x="12" y="10" font-size="8" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">${symbol}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const icons = {
  property: createCustomIcon('#00e676', '🏠'),
  vehicle: createCustomIcon('#40c4ff', '🚛'),
  plant: createCustomIcon('#ffab40', '🏭'),
  selected: createCustomIcon('#ff5252', '📍')
};

// Udupi District Geographic Bounding Box: [South-West, North-East]
const UDUPI_BOUNDS = [
  [13.0500, 74.5500], // South-West corner (Kaup / Hejmadhi coastal line)
  [13.8500, 75.1500]  // North-East corner (Byndoor / Western Ghats edge)
];

const UDUPI_CENTER = [13.3409, 74.7421]; // Udupi City Center

// Helper to check valid lat/lng coordinates
const isInUdupiDistrict = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  return !isNaN(lat) && !isNaN(lng);
};

// Component to dynamically adjust map center & zoom within bounds
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && isInUdupiDistrict(center[0], center[1])) {
      map.setView(center, zoom || 12);
    } else {
      map.setView(UDUPI_CENTER, 12);
    }
  }, [center, zoom, map]);
  return null;
}

// Fly-to handler for search results
function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target[0] && target[1]) {
      map.flyTo(target, 16, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Click listener component for location picker mode restricted to Udupi District with Reverse Geocoding
function LocationPickerHandler({ onLocationSelect }) {
  useMapEvents({
    async click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      if (isInUdupiDistrict(lat, lng)) {
        let addressName = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name) {
            addressName = data.display_name;
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
        }
        if (onLocationSelect) {
          onLocationSelect({ lat, lng, address: addressName });
        }
      } else {
        alert("⚠️ Location selection restricted to Udupi District boundaries only.");
      }
    }
  });
  return null;
}

// ── Shared styling constants ──
const controlBarStyle = {
  position: 'absolute',
  top: '10px',
  left: '50px',
  right: '10px',
  zIndex: 1000,
  display: 'flex',
  gap: '6px',
  alignItems: 'stretch',
};

const inputStyle = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '12px',
  borderRadius: '8px',
  border: '1px solid rgba(0,230,118,0.3)',
  background: 'rgba(5,12,9,0.92)',
  color: '#e0f2e9',
  outline: 'none',
  backdropFilter: 'blur(12px)',
  minWidth: 0,
};

const btnStyle = {
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '8px',
  border: '1px solid rgba(0,230,118,0.3)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s ease',
};

const searchBtnStyle = {
  ...btnStyle,
  background: 'rgba(0,230,118,0.15)',
  color: '#00e676',
};

const liveBtnStyle = {
  ...btnStyle,
  background: 'rgba(64,196,255,0.15)',
  color: '#40c4ff',
  border: '1px solid rgba(64,196,255,0.3)',
};

const dropdownStyle = {
  position: 'absolute',
  top: '42px',
  left: '50px',
  right: '10px',
  zIndex: 1001,
  background: 'rgba(5,12,9,0.96)',
  border: '1px solid rgba(0,230,118,0.25)',
  borderRadius: '10px',
  maxHeight: '200px',
  overflowY: 'auto',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
};

const dropdownItemStyle = {
  padding: '8px 14px',
  fontSize: '12px',
  color: '#d0e8da',
  cursor: 'pointer',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  transition: 'background 0.15s ease',
};

export function LeafletMap({ 
  properties = [], 
  vehicles = [], 
  plants = [], 
  center = UDUPI_CENTER, 
  zoom = 12,
  pickerMode = false,
  selectedLocation = null,
  onLocationSelect = null,
  height = "400px",
  showSearch = false,
  showLiveLocation = false,
}) {
  const mapCenter = (center && center[0] && isInUdupiDistrict(center[0], center[1])) ? center : UDUPI_CENTER;

  // Filter markers strictly within Udupi District
  const udupiProperties = properties.filter(p => isInUdupiDistrict(p.lat, p.lng));
  const udupiVehicles = vehicles.filter(v => isInUdupiDistrict(v.lat, v.lng));
  const udupiPlants = plants.filter(pl => isInUdupiDistrict(pl.lat, pl.lng));

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const searchTimeout = useRef(null);

  // Nominatim search restricted to Udupi District bounding box
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowDropdown(true);
    try {
      const bbox = `${UDUPI_BOUNDS[0][1]},${UDUPI_BOUNDS[0][0]},${UDUPI_BOUNDS[1][1]},${UDUPI_BOUNDS[1][0]}`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Udupi')}&bounded=1&viewbox=${bbox}&limit=8`
      );
      const data = await res.json();
      const filtered = data.filter(r => isInUdupiDistrict(parseFloat(r.lat), parseFloat(r.lon)));
      setSearchResults(filtered);
    } catch (e) {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addressName = result.display_name;
    if (isInUdupiDistrict(lat, lng)) {
      setFlyTarget([lat, lng]);
      if (onLocationSelect) {
        onLocationSelect({ lat, lng, address: addressName });
      }
      setShowDropdown(false);
      setSearchQuery(result.display_name.split(',').slice(0, 2).join(', '));
    } else {
      alert("⚠️ Selected location is outside Udupi District boundaries.");
    }
  };

  // GPS Live Location
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("⚠️ Your browser does not support geolocation.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (isInUdupiDistrict(lat, lng)) {
          setFlyTarget([lat, lng]);
          let addressName = '';
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) addressName = data.display_name;
          } catch (e) {}

          if (onLocationSelect) {
            onLocationSelect({ lat, lng, address: addressName });
          }
          setSearchQuery(`📍 My Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        } else {
          alert("⚠️ Your current location is outside Udupi District. You can only pin locations within Udupi District.");
        }
        setGpsLoading(false);
      },
      (err) => {
        alert("⚠️ Could not access your location. Please allow location permission or pin manually.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false);
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const showControls = showSearch || showLiveLocation;

  return (
    <div style={{ height: height, width: '100%', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(0, 230, 118, 0.2)', position: 'relative' }} className="relative z-0">
      
      {/* ── Search Bar & Live Location Button Overlay ── */}
      {showControls && (
        <>
          <div style={controlBarStyle} onClick={e => e.stopPropagation()}>
            {showSearch && (
              <>
                <input
                  type="text"
                  placeholder="🔍 Search place in Udupi District..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    // Auto-search after typing pauses
                    if (searchTimeout.current) clearTimeout(searchTimeout.current);
                    searchTimeout.current = setTimeout(() => {
                      if (e.target.value.trim().length >= 2) {
                        handleSearch();
                      }
                    }, 600);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                  style={inputStyle}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleSearch(); }}
                  style={searchBtnStyle}
                  onMouseEnter={e => { e.target.style.background = 'rgba(0,230,118,0.3)'; }}
                  onMouseLeave={e => { e.target.style.background = 'rgba(0,230,118,0.15)'; }}
                >
                  {searching ? '⏳' : '🔍'} Search
                </button>
              </>
            )}
            {showLiveLocation && (
              <button
                onClick={(e) => { e.stopPropagation(); handleLiveLocation(); }}
                style={liveBtnStyle}
                onMouseEnter={e => { e.target.style.background = 'rgba(64,196,255,0.3)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(64,196,255,0.15)'; }}
                disabled={gpsLoading}
              >
                {gpsLoading ? '⏳ Getting GPS...' : '📡 Live Location'}
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div style={dropdownStyle} onClick={e => e.stopPropagation()}>
              {searchResults.map((r, idx) => (
                <div
                  key={idx}
                  style={dropdownItemStyle}
                  onClick={() => handleSelectResult(r)}
                  onMouseEnter={e => { e.target.style.background = 'rgba(0,230,118,0.1)'; }}
                  onMouseLeave={e => { e.target.style.background = 'transparent'; }}
                >
                  <div style={{ fontWeight: 600, fontSize: '12px', color: '#00e676' }}>
                    📍 {r.display_name.split(',').slice(0, 2).join(', ')}
                  </div>
                  <div style={{ fontSize: '10px', color: '#7a9e8a', marginTop: '2px' }}>
                    {r.display_name}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showDropdown && !searching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <div style={dropdownStyle} onClick={e => e.stopPropagation()}>
              <div style={{ ...dropdownItemStyle, color: '#7a9e8a', textAlign: 'center', cursor: 'default' }}>
                No locations found in Udupi District for "{searchQuery}"
              </div>
            </div>
          )}
        </>
      )}

      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        minZoom={2}
        maxZoom={18}
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', background: '#08120c' }}
      >
        <ChangeMapView center={mapCenter} zoom={zoom} />
        {flyTarget && <FlyToLocation target={flyTarget} />}
        
        {/* Dark Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Udupi District GIS'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickerMode && <LocationPickerHandler onLocationSelect={onLocationSelect} />}

        {/* Selected / Picked Location Marker (Udupi only) */}
        {selectedLocation && selectedLocation.lat && selectedLocation.lng && isInUdupiDistrict(selectedLocation.lat, selectedLocation.lng) && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={icons.selected}>
            <Popup>
              <div style={{ color: '#0d1a12', fontWeight: 'bold' }}>
                📍 Pinned Udupi Location<br/>
                <small>Lat: {selectedLocation.lat.toFixed(5)}, Lng: {selectedLocation.lng.toFixed(5)}</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Property Markers (Udupi District Only) */}
        {udupiProperties.map(p => (
          <Marker key={`prop-${p.id}`} position={[p.lat, p.lng]} icon={icons.property}>
            <Popup>
              <div style={{ color: '#0d1a12' }}>
                <strong>🏢 {p.name}</strong><br/>
                <span>Type: {p.type}</span><br/>
                <small>{p.address}</small>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Vehicle Markers (Udupi District Only) */}
        {udupiVehicles.map(v => (
          <Marker key={`veh-${v.id}`} position={[v.lat, v.lng]} icon={icons.vehicle}>
            <Popup>
              <div style={{ color: '#0d1a12' }}>
                <strong>🚛 {v.licensePlate}</strong><br/>
                <span>Type: {v.type} ({v.capacity} Tons)</span><br/>
                <small>Status: {v.status}</small>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Processing Plant Markers (Udupi District Only) */}
        {udupiPlants.map(pl => (
          <Marker key={`plant-${pl.id}`} position={[pl.lat, pl.lng]} icon={icons.plant}>
            <Popup>
              <div style={{ color: '#0d1a12' }}>
                <strong>🏭 {pl.name}</strong><br/>
                <span>Type: {pl.type}</span><br/>
                <small>Cap: {pl.currentLoad}/{pl.capacity} Tons</small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
