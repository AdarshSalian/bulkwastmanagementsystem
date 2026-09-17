import React, { useState, useEffect, Component } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  StatusBar, Modal, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { mobileApi, setServerHost, autoFindWorkingHost, getBaseUrl } from './src/services/api';

// ─── Error Boundary ─── catches JS crashes and shows them on-screen ───
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#07120c', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: '800', marginBottom: 12 }}>⚠️ App Crashed</Text>
          <Text style={{ color: '#f1f5f9', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center' }}>
            {this.state.error?.stack?.slice(0, 300)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}


function AppMain() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  // Server Host Config
  const [serverIp, setServerIp] = useState('192.168.68.100:5000');
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  // Auth fields
  const [username, setUsername] = useState('driver');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState('trips'); // 'trips' | 'gps' | 'plants' | 'leaves' | 'alerts'

  // Data states
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [myVehicle, setMyVehicle] = useState(null);
  const [plants, setPlants] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Live Location Tracker states
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [currentCoords, setCurrentCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [gpsSpeed, setGpsSpeed] = useState('28 km/h');
  const [lastSyncedTime, setLastSyncedTime] = useState('Just now');

  // Pickup Modal state
  const [collectModalReq, setCollectModalReq] = useState(null);
  const [collectWeight, setCollectWeight] = useState('');
  const [collectCategory, setCollectCategory] = useState('');

  // Receipt Modal state
  const [receiptModal, setReceiptModal] = useState(null);

  // Plant Delivery state
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [plantDeliveryReqId, setPlantDeliveryReqId] = useState('');
  const [segregation, setSegregation] = useState({ organicWeight: '', recyclableWeight: '', residualWeight: '' });

  // Test Server Connection
  const checkConnection = async (targetHost) => {
    if (targetHost) setServerHost(targetHost);
    setConnectionStatus('Testing connection...');
    const working = await autoFindWorkingHost();
    const ok = await mobileApi.ping();
    if (ok) {
      setConnectionStatus('CONNECTED ✅');
      const cleanHost = working.replace(/^https?:\/\//, '').replace(/\/api$/, '');
      setServerIp(cleanHost);
    } else {
      setConnectionStatus('OFFLINE ⚠️ (Check Server IP & Wi-Fi)');
    }
  };

  // Helper to check if today is on or past the scheduled date
  const isScheduledDateOrPast = (scheduledDateStr) => {
    if (!scheduledDateStr) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate;
    if (typeof scheduledDateStr === 'string' && scheduledDateStr.includes('-')) {
      const parts = scheduledDateStr.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        // DD-MM-YYYY format
        targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      targetDate = new Date(scheduledDateStr);
    }
    targetDate.setHours(0, 0, 0, 0);

    return today.getTime() >= targetDate.getTime();
  };

  const getRemainingDays = (scheduledDateStr) => {
    if (!scheduledDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate;
    if (typeof scheduledDateStr === 'string' && scheduledDateStr.includes('-')) {
      const parts = scheduledDateStr.split('-');
      if (parts[0].length === 4) {
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      targetDate = new Date(scheduledDateStr);
    }
    if (isNaN(targetDate.getTime())) return 0;
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setServerHost(serverIp);
      const data = await mobileApi.login(username, password);
      setToken(data.token);
      setUser(data.user);
      loadDriverData(data.user);
    } catch (err) {
      Alert.alert('Login Connection Error', err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const loadDriverData = async (currUser) => {
    try {
      const [reqs, vehs, plts, lvs, notifs] = await Promise.all([
        mobileApi.getAssignedRequests(),
        mobileApi.getVehicles(),
        mobileApi.getPlants(),
        mobileApi.getDriverLeaves(),
        mobileApi.getNotifications()
      ]);
      setAssignedRequests(reqs || []);
      setVehicles(vehs || []);
      setPlants(plts || []);
      setLeaves(lvs || []);
      setNotifications(notifs || []);

      const assignedVeh = (vehs || []).find(v => v.driverId === (currUser?.id || user?.id));
      if (assignedVeh) {
        setMyVehicle(assignedVeh);
        if (assignedVeh.lat && assignedVeh.lng) {
          setCurrentCoords({ lat: assignedVeh.lat, lng: assignedVeh.lng });
        }
      }
    } catch (err) {
      console.error('loadDriverData error:', err);
    }
  };

  // Live GPS Interval Sync
  useEffect(() => {
    if (!token || !myVehicle || !isGpsActive) return;

    const interval = setInterval(() => {
      // Simulate live vehicle movement along Malpe route
      const timeSec = Date.now() / 10000;
      const newLat = Math.round((12.9716 + 0.008 * Math.sin(timeSec)) * 10000) / 10000;
      const newLng = Math.round((77.5946 + 0.008 * Math.cos(timeSec)) * 10000) / 10000;

      setCurrentCoords({ lat: newLat, lng: newLng });
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Broadcast live GPS coordinates to backend
      mobileApi.updateVehicleLocation(myVehicle.id, newLat, newLng)
        .catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, myVehicle, isGpsActive]);

  // Live Notifications Interval Sync
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      mobileApi.getNotifications().then(data => {
        if (data && Array.isArray(data)) setNotifications(data);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkNotificationsRead = async () => {
    try {
      await mobileApi.markNotificationsRead();
      const updated = await mobileApi.getNotifications();
      setNotifications(updated || []);
    } catch (err) {
      console.error('Driver mark notifs read error:', err);
    }
  };

  const handleCollectionSubmit = async () => {
    if (!collectModalReq) return;
    const w = parseFloat(collectWeight);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid scale weight greater than 0 tons.');
      return;
    }

    try {
      setLoading(true);
      const isFood = (collectCategory || collectModalReq.wasteType) === 'Organic';
      await mobileApi.collectWaste(collectModalReq.id, collectWeight, collectCategory || collectModalReq.wasteType, {
        driverCollectedFromUser: isFood,
        driverPaidToUserAmount: !isFood ? (collectModalReq.amount || 500) : 0
      });

      Alert.alert('Success', 'Collection and scale weight recorded successfully!');
      setCollectModalReq(null);
      setCollectWeight('');
      setCollectCategory('');

      // Reload data
      const updatedReqs = await mobileApi.getAssignedRequests();
      setAssignedRequests(updatedReqs || []);
      const target = (updatedReqs || []).find(r => r.id === collectModalReq.id);
      if (target) setReceiptModal(target);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to complete collection');
    } finally {
      setLoading(false);
    }
  };

  const handlePlantDeliverySubmit = async () => {
    if (!selectedPlantId || !plantDeliveryReqId) {
      Alert.alert('Missing Fields', 'Please select both a processing plant and an assigned trip.');
      return;
    }

    try {
      setLoading(true);
      await mobileApi.recordPlantDelivery(selectedPlantId, {
        requestId: plantDeliveryReqId,
        organicWeight: parseFloat(segregation.organicWeight) || 0,
        recyclableWeight: parseFloat(segregation.recyclableWeight) || 0,
        residualWeight: parseFloat(segregation.residualWeight) || 0
      });

      Alert.alert('Delivery Logged', 'Waste load dump and segregation recorded successfully!');
      setPlantDeliveryReqId('');
      setSegregation({ organicWeight: '', recyclableWeight: '', residualWeight: '' });
      loadDriverData(user);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to log plant delivery');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#07120c" />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <View style={styles.loginCard}>
            <Text style={styles.appBadge}>BULK WASTE MANAGEMENT</Text>
            <Text style={styles.loginTitle}>Transporter Driver App</Text>
            <Text style={styles.loginSub}>Live Location Tracker & Trip Dispatch Center</Text>

            {/* Server IP Config Box */}
            <View style={styles.serverBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.serverLabel}>Backend Server API Host</Text>
                <Text style={[styles.statusBadge, connectionStatus.includes('CONNECTED') ? styles.statusConnected : styles.statusOffline]}>
                  {connectionStatus}
                </Text>
              </View>
              <TextInput 
                style={styles.serverInput} 
                value={serverIp} 
                onChangeText={setServerIp}
                placeholder="192.168.68.100:5000 / localhost:5000"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {['192.168.68.100:5000', 'localhost:5000', '10.0.2.2:5000'].map(preset => (
                  <TouchableOpacity 
                    key={preset}
                    style={styles.presetChip}
                    onPress={() => { setServerIp(preset); checkConnection(preset); }}
                  >
                    <Text style={styles.presetText}>{preset.split(':')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driver Username</Text>
              <TextInput 
                style={styles.input} 
                value={username} 
                onChangeText={setUsername}
                placeholder="e.g. driver / john_doe"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput 
                style={styles.input} 
                value={password} 
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter password"
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>LOGIN TO DRIVER APP</Text>}
            </TouchableOpacity>

            <Text style={styles.demoCredentials}>Demo Accounts: driver / admin · driver2 / admin</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07120c" />
      
      {/* Driver Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{user?.name || 'John Doe (Transporter)'}</Text>
          <Text style={styles.vehiclePlate}>
            🚛 Fleet: {myVehicle ? `${myVehicle.licensePlate} (${myVehicle.type})` : 'TRK-9844 (Compactor)'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Notification Bell Button */}
          <TouchableOpacity 
            style={styles.notifBellBtn} 
            onPress={() => setIsNotifOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={() => { setToken(''); setUser(null); }}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'trips' && styles.tabItemActive]} onPress={() => setActiveTab('trips')}>
          <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>🚛 Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'gps' && styles.tabItemActive]} onPress={() => setActiveTab('gps')}>
          <Text style={[styles.tabText, activeTab === 'gps' && styles.tabTextActive]}>📡 Live GPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'plants' && styles.tabItemActive]} onPress={() => setActiveTab('plants')}>
          <Text style={[styles.tabText, activeTab === 'plants' && styles.tabTextActive]}>🏬 Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'leaves' && styles.tabItemActive]} onPress={() => setActiveTab('leaves')}>
          <Text style={[styles.tabText, activeTab === 'leaves' && styles.tabTextActive]}>📅 Leaves</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'alerts' && styles.tabItemActive]} onPress={() => setActiveTab('alerts')}>
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>🔔 Alerts</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* TAB 1: TRIPS & DISPATCHES */}
        {activeTab === 'trips' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Assigned Pickup Trips & Dispatches</Text>
            {assignedRequests.length === 0 ? (
              <Text style={styles.emptyText}>No active pickup dispatches assigned to your fleet.</Text>
            ) : (
              assignedRequests.map(r => (
                <View key={r.id} style={styles.tripCard}>
                  <View style={styles.tripCardHeader}>
                    <Text style={styles.tripRef}>{r.id}</Text>
                    <Text style={[styles.badge, r.status === 'Pending' ? styles.badgePending : r.status === 'Assigned' ? styles.badgeAssigned : styles.badgeCompleted]}>
                      {r.status}
                    </Text>
                  </View>

                  <Text style={styles.generatorName}>{r.generatorName}</Text>
                  <Text style={styles.propertyAddress}>📍 {r.propertyName} — {r.propertyAddress}</Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Category:</Text>
                    <Text style={styles.infoVal}>{r.wasteType}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Est. Quantity:</Text>
                    <Text style={styles.infoVal}>{r.wasteQuantity} Tons</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Target Date:</Text>
                    <Text style={styles.infoVal}>{r.scheduledDate}</Text>
                  </View>

                  {r.wasteType !== 'Organic' ? (
                    <View style={styles.payoutBox}>
                      <Text style={styles.payoutTitle}>💰 Admin Dispatched Payout Fund</Text>
                      <Text style={styles.payoutText}>Admin dispatched ₹{r.adminDispatchedFunds || r.amount || 500} to your wallet. Weigh waste at scale and pay User directly!</Text>
                    </View>
                  ) : (
                    <View style={styles.foodBox}>
                      <Text style={styles.foodTitle}>🍔 Food Waste Collection Rule</Text>
                      <Text style={styles.foodText}>User pays ₹{r.amount || 100} pickup fee directly to you upon collection.</Text>
                    </View>
                  )}

                  {r.status === 'Assigned' || r.status === 'En Route' ? (
                    isScheduledDateOrPast(r.scheduledDate) ? (
                      <View style={{ gap: 8 }}>
                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: '#0284c7' }]} 
                          onPress={async () => {
                            try {
                              setLoading(true);
                              await mobileApi.startTrip(r.id);
                              Alert.alert('Trip Started! 🚛', 'Live GPS location sharing activated for User & Admin tracking.');
                              const updated = await mobileApi.getAssignedRequests();
                              setAssignedRequests(updated || []);
                              setActiveTab('gps');
                            } catch (err) {
                              Alert.alert('Start Trip Error', err.message || 'Could not start trip');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          <Text style={styles.actionBtnText}>🗺️ Start Trip & Navigate (Live Tracking)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.actionBtn} 
                          onPress={() => { setCollectModalReq(r); setCollectWeight(r.wasteQuantity.toString()); setCollectCategory(r.wasteType); }}
                        >
                          <Text style={styles.actionBtnText}>⚖️ Record Scale Weight & Collect</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, padding: 14, borderRadius: 12, gap: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
                          📅 Trip Scheduled ({getRemainingDays(r.scheduledDate)} {getRemainingDays(r.scheduledDate) === 1 ? 'day' : 'days'} remaining)
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>
                          Scheduled for {r.scheduledDate} · Link locked until scheduled date
                        </Text>
                        <TouchableOpacity 
                          disabled 
                          style={[styles.actionBtn, { backgroundColor: '#1e293b', opacity: 0.5, width: '100%', marginTop: 2 }]}
                        >
                          <Text style={[styles.actionBtnText, { color: '#64748b' }]}>🔒 Start Trip & Navigate ({getRemainingDays(r.scheduledDate)} days remaining)</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  ) : r.status === 'In Transit' ? (
                    <View style={{ gap: 8 }}>
                      <View style={{ backgroundColor: '#0369a122', borderColor: '#38bdf8', borderWidth: 1, padding: 8, borderRadius: 8 }}>
                        <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 12 }}>🚛 TRIP IN PROGRESS — Live Tracking Active for User & Admin</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => { setCollectModalReq(r); setCollectWeight(r.wasteQuantity.toString()); setCollectCategory(r.wasteType); }}
                      >
                        <Text style={styles.actionBtnText}>⚖️ Record Scale Weight & Collect</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.completedText}>✅ Collection Completed ({r.weight || r.wasteQuantity} Tons)</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: LIVE GPS LOCATION TRACKER */}
        {activeTab === 'gps' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Live GPS Location Sharing Module</Text>
            
            <View style={styles.gpsStatusCard}>
              <View style={styles.gpsRow}>
                <Text style={styles.gpsLabel}>GPS Location Broadcasting:</Text>
                <TouchableOpacity 
                  style={[styles.toggleBtn, isGpsActive ? styles.toggleBtnActive : styles.toggleBtnPaused]}
                  onPress={() => setIsGpsActive(!isGpsActive)}
                >
                  <Text style={styles.toggleText}>{isGpsActive ? 'ACTIVE (SYNCING)' : 'PAUSED'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.gpsGrid}>
                <View style={styles.gpsGridItem}>
                  <Text style={styles.gpsSubLabel}>Current Latitude</Text>
                  <Text style={styles.gpsVal}>{currentCoords.lat}° N</Text>
                </View>
                <View style={styles.gpsGridItem}>
                  <Text style={styles.gpsSubLabel}>Current Longitude</Text>
                  <Text style={styles.gpsVal}>{currentCoords.lng}° E</Text>
                </View>
                <View style={styles.gpsGridItem}>
                  <Text style={styles.gpsSubLabel}>Live Moving Speed</Text>
                  <Text style={styles.gpsVal}>{gpsSpeed}</Text>
                </View>
                <View style={styles.gpsGridItem}>
                  <Text style={styles.gpsSubLabel}>Last Cloud Sync</Text>
                  <Text style={styles.gpsVal}>{lastSyncedTime}</Text>
                </View>
              </View>

              <View style={styles.routeBox}>
                <Text style={styles.routeTitle}>📍 Active Live Route Navigation Map</Text>
                {assignedRequests.find(r => r.status === 'In Transit' || r.status === 'En Route') ? (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {(() => {
                      const activeReq = assignedRequests.find(r => r.status === 'In Transit' || r.status === 'En Route');
                      const pLat = activeReq.propertyLat || 12.9800;
                      const pLng = activeReq.propertyLng || 77.6000;
                      return (
                        <>
                          <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 13 }}>
                            🎯 Destination: {activeReq.propertyName || 'User Property'}
                          </Text>
                          <Text style={{ color: '#cbd5e1', fontSize: 12 }}>
                            📍 Address: {activeReq.propertyAddress}
                          </Text>
                          
                          {/* Embedded Live Leaflet Route Map (Web) / Native GPS Card (Mobile) */}
                          {Platform.OS === 'web' ? (
                            <View style={{ marginTop: 10, height: 260, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#00e67640' }}>
                              <iframe 
                                title="Live Driver Leaflet Map"
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }}
                                srcDoc={`
                                  <!DOCTYPE html>
                                  <html>
                                  <head>
                                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                    <style>
                                      body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #08120c; }
                                      .custom-marker { font-size: 24px; text-align: center; }
                                    </style>
                                  </head>
                                  <body>
                                    <div id="map"></div>
                                    <script>
                                      const map = L.map('map').setView([${currentCoords.lat}, ${currentCoords.lng}], 13);
                                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        maxZoom: 19
                                      }).addTo(map);

                                      const driverIcon = L.divIcon({ html: '🚛', className: 'custom-marker', iconSize: [30, 30] });
                                      const userIcon = L.divIcon({ html: '🏠', className: 'custom-marker', iconSize: [30, 30] });

                                      L.marker([${currentCoords.lat}, ${currentCoords.lng}], { icon: driverIcon }).addTo(map).bindPopup("<b>🚛 Driver Truck</b><br/>Status: Live Syncing");
                                      L.marker([${pLat}, ${pLng}], { icon: userIcon }).addTo(map).bindPopup("<b>🏠 ${activeReq.propertyName || 'Pickup Destination'}</b>");

                                      L.polyline([
                                        [${currentCoords.lat}, ${currentCoords.lng}],
                                        [${pLat}, ${pLng}]
                                      ], { color: '#00e676', weight: 4, dashArray: '8, 8' }).addTo(map);

                                      const bounds = L.latLngBounds([[${currentCoords.lat}, ${currentCoords.lng}], [${pLat}, ${pLng}]]);
                                      map.fitBounds(bounds, { padding: [30, 30] });
                                    </script>
                                  </body>
                                  </html>
                                `}
                              />
                            </View>
                          ) : (
                            <View style={{ marginTop: 10, padding: 14, backgroundColor: '#07150e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)' }}>
                              <Text style={{ color: '#00e676', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
                                📡 Live GPS Navigating to Destination
                              </Text>
                              <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                Truck Location: {currentCoords.lat}° N, {currentCoords.lng}° E
                              </Text>
                              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                                Destination Coords: {pLat}° N, {pLng}° E
                              </Text>
                              <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 6, fontWeight: '600' }}>
                                🟢 Live Location broadcasting to User & Admin dispatch
                              </Text>
                            </View>
                          )}
                        </>
                      );
                    })()}
                  </View>
                ) : (
                  <Text style={styles.routeText}>Base Hub (Malpe) ➔ Generator Pickup Address ➔ Processing Plant</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: PLANT DELIVERY */}
        {activeTab === 'plants' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Plant Waste Drop-Off & Segregation</Text>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Select Processing Plant Hub</Text>
              {plants.map(p => (
                <TouchableOpacity 
                  key={p.id}
                  style={[styles.radioItem, selectedPlantId === p.id && styles.radioItemActive]}
                  onPress={() => setSelectedPlantId(p.id)}
                >
                  <Text style={styles.radioText}>{p.name} ({p.type})</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Select Assigned Trip to Drop</Text>
              {assignedRequests.map(r => (
                <TouchableOpacity 
                  key={r.id}
                  style={[styles.radioItem, plantDeliveryReqId === r.id && styles.radioItemActive]}
                  onPress={() => setPlantDeliveryReqId(r.id)}
                >
                  <Text style={styles.radioText}>{r.id} — {r.wasteType} ({r.weight || r.wasteQuantity}t)</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Segregation Weights (Tons)</Text>
              <TextInput 
                style={styles.input}
                placeholder="Organic Weight (t)"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={segregation.organicWeight}
                onChangeText={t => setSegregation({ ...segregation, organicWeight: t })}
              />
              <TextInput 
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Recyclable Weight (t)"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={segregation.recyclableWeight}
                onChangeText={t => setSegregation({ ...segregation, recyclableWeight: t })}
              />
              <TextInput 
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Residual Weight (t)"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={segregation.residualWeight}
                onChangeText={t => setSegregation({ ...segregation, residualWeight: t })}
              />

              <TouchableOpacity style={[styles.actionBtn, { marginTop: 16 }]} onPress={handlePlantDeliverySubmit}>
                <Text style={styles.actionBtnText}>Submit Plant Drop-Off Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 4: LEAVE MANAGEMENT */}
        {activeTab === 'leaves' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Driver Leave Requests & History</Text>
            {leaves.length === 0 ? (
              <Text style={styles.emptyText}>No leave requests submitted yet.</Text>
            ) : (
              leaves.map(l => (
                <View key={l.id} style={styles.leaveCard}>
                  <View style={styles.tripCardHeader}>
                    <Text style={styles.leaveType}>{l.leaveType} Leave</Text>
                    <Text style={[styles.badge, l.status === 'Approved' ? styles.badgeCompleted : styles.badgePending]}>{l.status}</Text>
                  </View>
                  <Text style={styles.leaveDates}>Dates: {l.startDate} to {l.endDate}</Text>
                  <Text style={styles.leaveReason}>Reason: {l.reason}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: ALERTS */}
        {activeTab === 'alerts' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Live Notifications & Dispatches</Text>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No new alerts.</Text>
            ) : (
              notifications.map(n => (
                <View key={n.id} style={styles.notifCard}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMsg}>{n.message}</Text>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>

      {/* WEIGHING & COLLECTION MODAL */}
      {collectModalReq && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Scale Weighing & Settlement</Text>
              <Text style={styles.modalSub}>Req ID: {collectModalReq.id} ({collectModalReq.generatorName})</Text>

              <Text style={styles.inputLabel}>Scale Measured Weight (Tons)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={collectWeight} 
                onChangeText={setCollectWeight}
                placeholder="Enter weight in tons"
                placeholderTextColor="#666"
              />

              {collectModalReq.wasteType !== 'Organic' ? (
                <View style={styles.payoutBox}>
                  <Text style={styles.payoutTitle}>Payout to User</Text>
                  <Text style={styles.payoutText}>You will pay ₹{collectModalReq.amount || 500} to the User out of Admin funds.</Text>
                </View>
              ) : (
                <View style={styles.foodBox}>
                  <Text style={styles.foodTitle}>Collection Fee</Text>
                  <Text style={styles.foodText}>User will pay ₹{collectModalReq.amount || 100} fee to you.</Text>
                </View>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCollectModalReq(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleCollectionSubmit}>
                  <Text style={styles.confirmText}>Confirm Collection</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Notification Modal / Overlay just like Web */}
      <Modal visible={isNotifOpen} transparent animationType="fade">
        <View style={styles.notifModalOverlay}>
          <View style={styles.notifModalContent}>
            <View style={styles.notifHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.notifHeaderTitle}>🔔 Notifications</Text>
                {unreadNotifCount > 0 && (
                  <View style={styles.notifNewPill}>
                    <Text style={styles.notifNewPillText}>{unreadNotifCount} new</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {unreadNotifCount > 0 && (
                  <TouchableOpacity onPress={handleMarkNotificationsRead} style={styles.notifMarkAllBtn}>
                    <Text style={styles.notifMarkAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsNotifOpen(false)} style={styles.notifCloseBtn}>
                  <Text style={styles.notifCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingVertical: 4 }}>
              {notifications.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>📭</Text>
                  <Text style={{ color: '#737373', fontSize: 12 }}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map(n => (
                  <View 
                    key={n.id} 
                    style={[
                      styles.notifItemCard,
                      n.read ? styles.notifItemRead : styles.notifItemUnread
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Text style={[
                        styles.notifItemTitle,
                        {
                          color: n.type === 'warning' ? '#fbbf24' :
                                 n.type === 'success' ? '#00e676' :
                                 n.type === 'danger' ? '#f87171' :
                                 '#ffffff'
                        }
                      ]}>
                        {n.title}
                      </Text>
                      <Text style={styles.notifItemTime}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.notifItemMsg}>{n.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07120c' },
  loginContainer: { flex: 1, backgroundColor: '#07120c', padding: 20 },
  loginCard: { width: '100%', maxWidth: 400, backgroundColor: '#0f2418', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(82,183,136,0.3)', marginVertical: 20 },
  appBadge: { color: '#52b788', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  loginTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  loginSub: { color: '#a0aec0', fontSize: 12, marginBottom: 16 },

  serverBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)' },
  serverLabel: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  serverInput: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8, color: '#38bdf8', fontSize: 12, fontFamily: 'monospace', marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statusBadge: { fontSize: 9, fontWeight: '800', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  statusConnected: { backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981' },
  statusOffline: { backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  presetChip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  presetText: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },

  inputGroup: { marginBottom: 14 },
  inputLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  loginButton: { backgroundColor: '#2d6a4f', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  demoCredentials: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  driverName: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  vehiclePlate: { color: '#52b788', fontSize: 12, fontWeight: '600', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { color: '#ff6b6b', fontSize: 12, fontWeight: '700' },

  tabBar: { flexDirection: 'row', backgroundColor: '#0b1d13', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#52b788' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#52b788' },

  body: { flex: 1, padding: 16 },
  tabSection: { gap: 14 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#64748b', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

  tripCard: { backgroundColor: '#0f2418', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)', marginBottom: 12 },
  tripCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripRef: { color: '#38bdf8', fontSize: 12, fontWeight: '800', fontFamily: 'monospace' },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, fontSize: 10, fontWeight: '800' },
  badgePending: { backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  badgeAssigned: { backgroundColor: 'rgba(56,189,248,0.2)', color: '#38bdf8' },
  badgeCompleted: { backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981' },
  generatorName: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  propertyAddress: { color: '#94a3b8', fontSize: 12, marginTop: 2, marginBottom: 8 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  infoLabel: { color: '#64748b', fontSize: 12 },
  infoVal: { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },

  payoutBox: { backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  payoutTitle: { color: '#f59e0b', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  payoutText: { color: '#fbbf24', fontSize: 11, marginTop: 2 },

  foodBox: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  foodTitle: { color: '#10b981', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  foodText: { color: '#6ee7b7', fontSize: 11, marginTop: 2 },

  actionBtn: { backgroundColor: '#2d6a4f', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  completedText: { color: '#10b981', fontSize: 12, fontWeight: '700', fontStyle: 'italic', marginTop: 8 },

  gpsStatusCard: { backgroundColor: '#0f2418', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)' },
  gpsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsLabel: { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  toggleBtnActive: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10b981' },
  toggleBtnPaused: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#ef4444' },
  toggleText: { color: '#10b981', fontSize: 10, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 },
  gpsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gpsGridItem: { width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 },
  gpsSubLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  gpsVal: { color: '#38bdf8', fontSize: 13, fontWeight: '800', marginTop: 2 },

  routeBox: { backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: 10, padding: 10, marginTop: 14 },
  routeTitle: { color: '#38bdf8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  routeText: { color: '#e0f2fe', fontSize: 11, marginTop: 2 },

  formCard: { backgroundColor: '#0f2418', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)' },
  radioItem: { padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 6 },
  radioItemActive: { backgroundColor: 'rgba(82,183,136,0.2)', borderWidth: 1, borderColor: '#52b788' },
  radioText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  leaveCard: { backgroundColor: '#0f2418', borderRadius: 12, padding: 14, marginBottom: 8 },
  leaveType: { color: '#fff', fontSize: 14, fontWeight: '700' },
  leaveDates: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  leaveReason: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },

  notifCard: { backgroundColor: '#0f2418', borderRadius: 12, padding: 14, marginBottom: 8 },
  notifTitle: { color: '#38bdf8', fontSize: 13, fontWeight: '800' },
  notifMsg: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f2418', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(82,183,136,0.3)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: '#cbd5e1', fontWeight: '700' },
  confirmBtn: { flex: 2, padding: 12, borderRadius: 12, backgroundColor: '#2d6a4f', alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '800' },

  notifBellBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative'
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#07120c'
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900'
  },
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 16
  },
  notifModalContent: {
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262626',
    maxHeight: 520,
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 20
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    marginBottom: 10
  },
  notifHeaderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  notifNewPill: {
    backgroundColor: 'rgba(0,230,118,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)'
  },
  notifNewPillText: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: '800'
  },
  notifMarkAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  notifMarkAllText: {
    color: '#00e676',
    fontSize: 11,
    fontWeight: '700'
  },
  notifCloseBtn: {
    padding: 6,
    backgroundColor: '#171717',
    borderRadius: 8
  },
  notifCloseText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  notifItemCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  notifItemUnread: {
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#242424'
  },
  notifItemRead: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#171717',
    opacity: 0.65
  },
  notifItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    marginRight: 6
  },
  notifItemTime: {
    color: '#737373',
    fontSize: 10
  },
  notifItemMsg: {
    color: '#a3a3a3',
    fontSize: 11,
    lineHeight: 16
  }
});

// Wrap main app in ErrorBoundary so crashes show on screen (not blank)
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppMain />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
