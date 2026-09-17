1import React, { useState, useEffect, Component } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  StatusBar, Modal, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { userApi, setServerHost, autoFindWorkingHost, getBaseUrl } from './src/services/api';

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(e, i) { console.error('[ErrorBoundary]', e, i); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#07120c', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 20, fontWeight: '800', marginBottom: 12 }}>⚠️ App Crashed</Text>
          <Text style={{ color: '#f1f5f9', fontSize: 13, textAlign: 'center' }}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Status Badge Helper ────────────────────────────────────────────────────
const statusColor = (s) => {
  if (!s) return { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8' };
  const sl = s.toLowerCase();
  if (sl.includes('pending')) return { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' };
  if (sl.includes('assigned') || sl.includes('dispatch')) return { bg: 'rgba(56,189,248,0.2)', text: '#38bdf8' };
  if (sl.includes('completed') || sl.includes('collected') || sl.includes('paid')) return { bg: 'rgba(16,185,129,0.2)', text: '#10b981' };
  if (sl.includes('cancel')) return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
  return { bg: 'rgba(82,183,136,0.2)', text: '#52b788' };
};

function AppMain() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'requests' | 'complaints' | 'marketplace' | 'profile'

  // Connection
  const [serverIp, setServerIp] = useState('192.168.68.100:5000');
  const [connStatus, setConnStatus] = useState('Checking...');

  // Auth
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('generator');
  const [password, setPassword] = useState('password');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [orgName, setOrgName] = useState('');
  const [propertyRelationship, setPropertyRelationship] = useState('Society President / Secretary');
  const [propertyHeadName, setPropertyHeadName] = useState('');
  const [propertyHeadContact, setPropertyHeadContact] = useState('');
  const [authorizationLetterNote, setAuthorizationLetterNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Data
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [marketplaceFilter, setMarketplaceFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Property Form State
  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propCategory, setPropCategory] = useState('Residential');
  const [propLat, setPropLat] = useState('13.3409');
  const [propLng, setPropLng] = useState('74.7421');

  // Request Form State
  const [selectedPropId, setSelectedPropId] = useState('');
  const [wasteCategory, setWasteCategory] = useState('Organic / Food Waste');
  const [estWeight, setEstWeight] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Complaint Form State
  const [refReqId, setRefReqId] = useState('');
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');

  // Marketplace Form State
  const [newMarketModal, setNewMarketModal] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mCategory, setMCategory] = useState('Recyclable');
  const [mPrice, setMPrice] = useState('');
  const [mCondition, setMCondition] = useState('Used - Good');
  const [mLocation, setMLocation] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mPhone, setMPhone] = useState('');

  // Request detail modal & Marketplace Razorpay modal
  const [detailReq, setDetailReq] = useState(null);
  const [payMarketModalItem, setPayMarketModalItem] = useState(null);
  const [payPickupModalReq, setPayPickupModalReq] = useState(null);

  useEffect(() => {
    checkConn(serverIp);
  }, []);

  // Polling loop for live notifications every 6s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      userApi.getNotifications().then(data => {
        if (data && Array.isArray(data)) setNotifications(data);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const checkConn = async (host) => {
    if (host) setServerHost(host);
    setConnStatus('Connecting...');
    const working = await autoFindWorkingHost();
    const ok = await userApi.ping();
    setConnStatus(ok ? 'CONNECTED ✅' : 'OFFLINE ⚠️');
    const cleanHost = working.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    setServerIp(cleanHost);
  };

  const loadData = async () => {
    try {
      const [props, reqs, comps, mkts, notifs] = await Promise.all([
        userApi.getMyProperties(),
        userApi.getMyRequests(),
        userApi.getMyComplaints(),
        userApi.getMarketplaceItems(),
        userApi.getNotifications()
      ]);
      setProperties(props || []);
      setRequests(reqs || []);
      setComplaints(comps || []);
      setMarketplaceItems(mkts || []);
      setNotifications(notifs || []);
    } catch (e) { console.warn('loadData:', e.message); }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await userApi.markNotificationsRead();
      const updated = await userApi.getNotifications();
      setNotifications(updated || []);
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogin = async () => {
    if (!username || !password) { Alert.alert('Error', 'Enter username and password'); return; }
    try {
      setLoading(true);
      setServerHost(serverIp);
      const data = await userApi.login(username, password);
      setUser(data.user);
      setScreen('home');
      loadData();
    } catch (e) {
      Alert.alert('Login Failed', e.message);
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!username || !password || !name || !email) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Username, Email, Password)');
      return;
    }
    try {
      setLoading(true);
      setServerHost(serverIp);
      const data = await userApi.register({ 
        username, 
        password, 
        name, 
        email, 
        contact, 
        organizationName: orgName || name,
        propertyRelationship,
        propertyHeadName,
        propertyHeadContact,
        authorizationLetterNote,
        role: 'Generator' 
      });
      Alert.alert('✅ Registered!', data.message || 'Registration submitted with Property Relationship & Authority verification. Awaiting Admin approval.');
      setAuthMode('login');
    } catch (e) {
      Alert.alert('Registration Failed', e.message);
    } finally { setLoading(false); }
  };

  // Universal Live GPS Location Detect Handler
  const handleDetectLiveLocation = async () => {
    Alert.alert('📍 Detecting GPS Location...', 'Fetching live latitude and longitude coordinates.');
    
    // Tier 1: Expo Native Location (Expo Go / Android / iOS native)
    try {
      if (Location && Location.requestForegroundPermissionsAsync) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc && loc.coords) {
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            setPropLat(lat.toFixed(6));
            setPropLng(lng.toFixed(6));
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
                headers: { 'User-Agent': 'BulkWasteApp/1.0', 'Accept': 'application/json' }
              });
              const text = await res.text();
              if (res.ok && text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (data && data.display_name) setPropAddress(data.display_name);
              }
            } catch (e) {}
            Alert.alert('✅ Live Location Detected!', `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Expo Location fallback:', e.message);
    }

    // Tier 2: Browser Navigator Geolocation (Web)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPropLat(lat.toFixed(6));
          setPropLng(lng.toFixed(6));
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
              headers: { 'User-Agent': 'BulkWasteApp/1.0', 'Accept': 'application/json' }
            });
            const text = await res.text();
            if (res.ok && text.trim().startsWith('{')) {
              const data = JSON.parse(text);
              if (data && data.display_name) setPropAddress(data.display_name);
            }
          } catch (e) {}
          Alert.alert('✅ Live Location Detected!', `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        },
        async () => {
          await fallbackIpLocation();
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
      return;
    }

    // Tier 3: IP Geolocation / Udupi Region Fallback
    await fallbackIpLocation();
  };

  const fallbackIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        setPropLat(parseFloat(data.latitude).toFixed(6));
        setPropLng(parseFloat(data.longitude).toFixed(6));
        if (data.city) setPropAddress(`${data.city}, ${data.region || 'Karnataka'}, India`);
        Alert.alert('✅ Region Location Mapped!', `Detected region: ${data.city || 'Udupi'} (${data.latitude}, ${data.longitude})`);
        return;
      }
    } catch (e) {}
    setPropLat('13.3409');
    setPropLng('74.7421');
    Alert.alert('✅ Location Mapped!', 'Set coordinates for Udupi Central Region (13.3409, 74.7421).');
  };

  const handleSearchAddressOnMap = async () => {
    const q = propAddress.trim();
    if (!q) {
      Alert.alert('Search Address', 'Please type a street address first');
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' Udupi')}&limit=1`, {
        headers: { 'User-Agent': 'BulkWasteApp/1.0', 'Accept': 'application/json' }
      });
      const text = await res.text();
      if (res.ok && text.trim().startsWith('[')) {
        const data = JSON.parse(text);
        if (data && data.length > 0) {
          const item = data[0];
          setPropLat(parseFloat(item.lat).toFixed(6));
          setPropLng(parseFloat(item.lon).toFixed(6));
          setPropAddress(item.display_name);
          Alert.alert('✅ Address Located!', `Mapped coordinates: ${item.lat}, ${item.lon}`);
          return;
        }
      }
      setPropLat('13.3409');
      setPropLng('74.7421');
      Alert.alert('Address Located', `Mapped location for "${q}" (Udupi Region: 13.3409, 74.7421).`);
    } catch (e) {
      setPropLat('13.3409');
      setPropLng('74.7421');
      Alert.alert('Location Set', `Set location for "${q}" (Udupi Region: 13.3409, 74.7421).`);
    }
  };

  // 1. Register Property Handler
  const handleRegisterProperty = async () => {
    if (!propName || !propAddress) {
      Alert.alert('Error', 'Please fill in Property Name and Exact Address');
      return;
    }
    try {
      setLoading(true);
      await userApi.addProperty({
        name: propName,
        address: propAddress,
        type: propCategory,
        lat: parseFloat(propLat) || 13.3409,
        lng: parseFloat(propLng) || 74.7421,
        city: 'Udupi'
      });
      Alert.alert('✅ Property Registered!', 'Your property has been successfully saved.');
      setPropName('');
      setPropAddress('');
      loadData();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // 2. Create Pickup Request Handler
  const handleCreateRequest = async () => {
    if (!selectedPropId) {
      Alert.alert('Error', 'Please select a property from the dropdown');
      return;
    }
    try {
      setLoading(true);
      const weightVal = parseFloat(estWeight) || 1.0;
      await userApi.submitRequest({
        propertyId: selectedPropId,
        propertyAddress: selProp ? (selProp.name ? `${selProp.name} - ${selProp.address}` : selProp.address) : '',
        wasteType: wasteCategory.includes('Organic') ? 'Organic' : wasteCategory.includes('Recyclable') ? 'Recyclable' : 'Hazardous',
        wasteQuantity: weightVal,
        estimatedWeight: weightVal,
        scheduledDate: scheduledDate || new Date().toISOString().split('T')[0]
      });
      Alert.alert('✅ Request Created!', 'Your pickup request has been dispatched.');
      setSelectedPropId('');
      setEstWeight('');
      setScheduledDate('');
      loadData();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // 3. Submit Complaint Handler
  const handleSubmitComplaint = async () => {
    if (!compTitle || !compDesc) {
      Alert.alert('Error', 'Please enter Title/Topic and Detailed Issue Description');
      return;
    }
    try {
      setLoading(true);
      await userApi.submitComplaint({
        requestId: refReqId || null,
        subject: compTitle,
        description: compDesc
      });
      Alert.alert('✅ Support Ticket Raised!', 'Your complaint ticket has been submitted to Admin.');
      setRefReqId('');
      setCompTitle('');
      setCompDesc('');
      loadData();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // 4. Create Marketplace Listing Handler
  const handleCreateMarketItem = async () => {
    if (!mTitle || !mPrice || !mLocation) {
      Alert.alert('Error', 'Please enter Title, Price, and Location');
      return;
    }
    try {
      setLoading(true);
      await userApi.createMarketplaceItem({
        title: mTitle,
        category: mCategory,
        price: parseFloat(mPrice) || 0,
        condition: mCondition,
        location: mLocation,
        description: mDesc,
        contactPhone: mPhone
      });
      Alert.alert('✅ Listing Posted!', 'Your item is live on OLX Marketplace.');
      setNewMarketModal(false);
      setMTitle(''); setMPrice(''); setMLocation(''); setMDesc(''); setMPhone('');
      loadData();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleBuyMarketItem = (item) => {
    if (!item) return;
    if (item.status === 'Sold') {
      Alert.alert('Notice', 'This Marketplace item has already been purchased and sold.');
      return;
    }
    setPayMarketModalItem(item);
  };

  const handleConfirmRazorpayBuy = async () => {
    if (!payMarketModalItem) return;
    try {
      setLoading(true);
      const res = await userApi.buyMarketplaceItem(payMarketModalItem.id, {
        paymentMethod: 'Razorpay Gateway',
        transactionId: `pay_rzp_mob_${Date.now()}`
      });
      Alert.alert('✅ Razorpay Payment Success!', res.message || `Successfully purchased "${payMarketModalItem.title}" for ₹${payMarketModalItem.price} via Razorpay!`);
      setPayMarketModalItem(null);
      loadData();
    } catch (e) {
      Alert.alert('Payment Error', e.message || 'Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRazorpayPickupFee = async () => {
    if (!payPickupModalReq) return;
    try {
      setLoading(true);
      const res = await userApi.payRequest(payPickupModalReq.id, 'Razorpay Mobile Checkout');
      Alert.alert('✅ Pickup Payment Success!', res.message || `Payment of ₹${payPickupModalReq.amount} for Pickup #${payPickupModalReq.id?.slice(-5)} verified via Razorpay!`);
      setPayPickupModalReq(null);
      loadData();
    } catch (e) {
      Alert.alert('Payment Error', e.message || 'Failed to process pickup payment');
    } finally {
      setLoading(false);
    }
  };

  // ─── AUTH SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'login' || screen === 'register') {
    return (
      <SafeAreaView style={s.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#07120c" />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          
          <View style={s.logoBlock}>
            <Text style={s.logoEmoji}>♻️</Text>
            <Text style={s.logoTitle}>BulkWaste</Text>
            <Text style={s.logoSub}>MANAGEMENT HUB — USER MODULE</Text>
          </View>

          <View style={s.serverBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={s.serverLabel}>Backend Server Host</Text>
              <Text style={[s.connBadge, connStatus.includes('CONNECTED') ? s.connOk : s.connFail]}>{connStatus}</Text>
            </View>
            <TextInput
              style={s.serverInput}
              value={serverIp}
              onChangeText={setServerIp}
              onSubmitEditing={() => checkConn(serverIp)}
              placeholder="192.168.68.100:5000"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {['192.168.68.100:5000', 'localhost:5000', '10.0.2.2:5000'].map(ip => (
                <TouchableOpacity key={ip} onPress={() => { setServerIp(ip); checkConn(ip); }} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}>{ip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.authTabs}>
            <TouchableOpacity style={[s.authTab, authMode === 'login' && s.authTabActive]} onPress={() => setAuthMode('login')}>
              <Text style={[s.authTabText, authMode === 'login' && s.authTabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.authTab, authMode === 'register' && s.authTabActive]} onPress={() => setAuthMode('register')}>
              <Text style={[s.authTabText, authMode === 'register' && s.authTabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          {authMode === 'login' ? (
            <View style={s.formCard}>
              <Text style={s.formTitle}>User Portal Sign In</Text>
              <Text style={s.formSub}>Waste Generator Account</Text>
              
              <Text style={s.label}>Username</Text>
              <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="generator" placeholderTextColor="#555" autoCapitalize="none" />
              
              <Text style={s.label}>Password</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
              
              <TouchableOpacity style={s.primaryBtn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>SIGN IN →</Text>}
              </TouchableOpacity>
              <Text style={s.hintText}>Demo: generator / password</Text>
            </View>
          ) : (
            <View style={s.formCard}>
              <Text style={s.formTitle}>Register Waste Generator</Text>
              <Text style={s.formSub}>Create a verified Waste Generator account</Text>

              <Text style={s.label}>Full Name *</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Applicant Full Name" placeholderTextColor="#555" />

              <Text style={s.label}>Organization / Society Name *</Text>
              <TextInput style={s.input} value={orgName} onChangeText={setOrgName} placeholder="e.g. Greenwood Housing Society" placeholderTextColor="#555" />

              <Text style={s.label}>Relationship with Property *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[
                  'Society President / Secretary',
                  'Owner / Property Head',
                  'Facility Manager',
                  'Authorized Rep',
                  'Tenant / Resident'
                ].map(rel => (
                  <TouchableOpacity
                    key={rel}
                    style={[s.chip, propertyRelationship === rel && s.chipActive]}
                    onPress={() => setPropertyRelationship(rel)}
                  >
                    <Text style={[s.chipText, propertyRelationship === rel && { color: '#fff' }]}>{rel}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Property Head / Authority Name</Text>
              <TextInput style={s.input} value={propertyHeadName} onChangeText={setPropertyHeadName} placeholder="e.g. Dr. Rajesh Rao (Chairman)" placeholderTextColor="#555" />

              <Text style={s.label}>Property Head Official Phone</Text>
              <TextInput style={s.input} value={propertyHeadContact} onChangeText={setPropertyHeadContact} placeholder="+91 98765 00000" placeholderTextColor="#555" keyboardType="phone-pad" />

              <Text style={s.label}>Letter from Property Head / NOC Ref</Text>
              <TextInput style={s.input} value={authorizationLetterNote} onChangeText={setAuthorizationLetterNote} placeholder="Letter Ref: RWA/2026/NOC-01 on official letterhead" placeholderTextColor="#555" />

              <Text style={s.label}>Applicant Contact Number</Text>
              <TextInput style={s.input} value={contact} onChangeText={setContact} placeholder="+91 98765 43210" placeholderTextColor="#555" keyboardType="phone-pad" />

              <Text style={s.label}>Username *</Text>
              <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="generator_user" placeholderTextColor="#555" autoCapitalize="none" />

              <Text style={s.label}>Email *</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="society@example.com" placeholderTextColor="#555" autoCapitalize="none" keyboardType="email-address" />

              <Text style={s.label}>Password *</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />

              <TouchableOpacity style={s.primaryBtn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>SUBMIT REGISTRATION →</Text>}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── 1. PROPERTIES INFO TAB ──────────────────────────────────────────────
  const renderPropertiesTab = () => (
    <ScrollView style={s.tabBody} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52b788" />}>
      <Text style={s.tabHeaderTitle}>Register Property</Text>
      
      <View style={s.formCard}>
        <Text style={s.label}>Property Name</Text>
        <TextInput style={s.input} value={propName} onChangeText={setPropName} placeholder="e.g. Block A Residential Complex" placeholderTextColor="#555" />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={s.label}>Exact Street Address</Text>
          <TouchableOpacity onPress={handleSearchAddressOnMap} style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(56,189,248,0.15)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)' }}>
            <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '800' }}>🔍 Find Address</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={s.input} value={propAddress} onChangeText={setPropAddress} placeholder="Street, City, State (e.g. Manipal, Udupi)" placeholderTextColor="#555" />

        <Text style={s.label}>Property Category</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {['Residential', 'Commercial', 'Industrial', 'Institutional'].map(cat => (
            <TouchableOpacity key={cat} style={[s.chip, propCategory === cat && s.chipActive]} onPress={() => setPropCategory(cat)}>
              <Text style={[s.chipText, propCategory === cat && { color: '#fff' }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live GPS Location Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={s.label}>GPS Map Coordinates</Text>
          <TouchableOpacity onPress={handleDetectLiveLocation} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(82,183,136,0.15)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(82,183,136,0.3)' }}>
            <Text style={{ color: '#52b788', fontSize: 11, fontWeight: '800' }}>🎯 Detect Live GPS Location</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <TextInput style={s.input} value={propLat} onChangeText={setPropLat} placeholder="Latitude" placeholderTextColor="#555" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput style={s.input} value={propLng} onChangeText={setPropLng} placeholder="Longitude" placeholderTextColor="#555" keyboardType="numeric" />
          </View>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={handleRegisterProperty} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>+ Save & Register Property</Text>}
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Registered Properties ({properties.length})</Text>
      {properties.length === 0 ? (
        <Text style={s.emptyText}>No properties registered yet. Fill in the form above to add your first property.</Text>
      ) : (
        properties.map((p, idx) => (
          <View key={idx} style={s.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.itemTitle}>{p.name || `Property #${idx + 1}`}</Text>
              <Text style={[s.badge, { backgroundColor: 'rgba(82,183,136,0.15)', color: '#52b788' }]}>{p.type || 'Residential'}</Text>
            </View>
            <Text style={s.itemSub}>📍 {p.address}</Text>
            <Text style={s.itemMeta}>GPS: {p.lat || 13.3409}, {p.lng || 74.7421}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  // ─── 2. PICKUP REQUESTS TAB ──────────────────────────────────────────────
  const renderPickupRequestsTab = () => (
    <ScrollView style={s.tabBody} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52b788" />}>
      <Text style={s.tabHeaderTitle}>Pickup Requests</Text>

      {/* Form Card */}
      <View style={s.formCard}>
        <Text style={s.formTitle}>Create Pickup Request</Text>

        <Text style={s.label}>Select Property</Text>
        {properties.length === 0 ? (
          <Text style={{ color: '#f59e0b', fontSize: 12, marginBottom: 12 }}>⚠️ Please register a property first in Properties Info tab.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {properties.map((p) => (
                <TouchableOpacity key={p.id} style={[s.chip, selectedPropId === p.id && s.chipActive]} onPress={() => setSelectedPropId(p.id)}>
                  <Text style={[s.chipText, selectedPropId === p.id && { color: '#fff' }]}>{p.name || p.address}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={s.label}>Waste Category</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {['Organic / Food Waste', 'Recyclable Waste', 'Hazardous Waste'].map(cat => (
            <TouchableOpacity key={cat} style={[s.chip, wasteCategory === cat && s.chipActive]} onPress={() => setWasteCategory(cat)}>
              <Text style={[s.chipText, wasteCategory === cat && { color: '#fff' }]}>{cat.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Estimated Weight (Tons)</Text>
        <TextInput style={s.input} value={estWeight} onChangeText={setEstWeight} placeholder="e.g. 4.5" placeholderTextColor="#555" keyboardType="numeric" />

        <Text style={s.label}>Scheduled Date</Text>
        <TextInput style={s.input} value={scheduledDate} onChangeText={setScheduledDate} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />

        {/* Estimated Fee Breakdown Box */}
        <View style={s.feeBox}>
          <Text style={s.feeTitle}>Estimated Fee Breakdown (Base Hub: Malpe, Udupi)</Text>
          <Text style={s.feeRow}>• Transport: Calculated at pickup (1km free, ₹15/km next)</Text>
          <Text style={s.feeRow}>• Base Rate: ₹50 base + ₹10/ton</Text>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={handleCreateRequest} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>+ Create Request</Text>}
        </TouchableOpacity>
      </View>

      {/* Requests History List */}
      <Text style={s.sectionTitle}>Your Pickup Requests ({requests.length})</Text>
      {requests.length === 0 ? (
        <Text style={s.emptyText}>No pickup requests submitted yet.</Text>
      ) : (
        requests.map((r, idx) => {
          const sc = statusColor(r.status);
          return (
            <View key={idx} style={s.itemCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={s.itemTitle}>{r.wasteType || 'Organic'} Waste</Text>
                <Text style={[s.badge, { backgroundColor: sc.bg, color: sc.text }]}>{r.status || 'Pending'}</Text>
              </View>
              <Text style={s.itemSub}>{r.propertyAddress || r.address || 'Property address'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={s.itemMeta}>Est. Weight: {r.estimatedWeight || r.wasteQuantity || r.weight || 1}t</Text>
                <Text style={{ color: r.wasteType === 'Recyclable' ? '#38bdf8' : '#10b981', fontWeight: '800', fontSize: 13 }}>
                  {r.wasteType === 'Recyclable' ? `Resell Scrap Payout: ₹${r.amount || 500}` : `Pickup Fee: ₹${r.amount || 270}`}
                </Text>
              </View>
              <Text style={[s.itemMeta, { marginTop: 4 }]}>Driver: {r.driverName || 'Unassigned'} • Scheduled: {r.scheduledDate || r.date || 'Pending'}</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
                <Text style={{ fontSize: 11, color: r.paymentStatus?.includes('Paid') ? '#10b981' : '#f59e0b', fontWeight: '700' }}>
                  {r.wasteType === 'Recyclable' ? (
                    r.paymentStatus?.includes('Paid') ? `💰 Payout Received: ₹${r.paymentDetails?.amountPaidToUser || r.amount}` : `💰 Scrap Payout at Scale`
                  ) : (
                    r.paymentStatus?.includes('Paid') ? `✅ Paid: ₹${r.amount}` : `Payment: Unpaid (₹${r.amount || 270})`
                  )}
                </Text>
                {r.wasteType !== 'Recyclable' && !r.paymentStatus?.includes('Paid') && (
                  <TouchableOpacity 
                    style={{ backgroundColor: '#10b981', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8 }}
                    onPress={() => setPayPickupModalReq(r)}
                  >
                    <Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>💳 Pay Fee</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  // ─── 3. FILE COMPLAINTS TAB ──────────────────────────────────────────────
  const renderComplaintsTab = () => (
    <ScrollView style={s.tabBody} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52b788" />}>
      <Text style={s.tabHeaderTitle}>File Complaints & Support</Text>

      <View style={s.formCard}>
        <Text style={s.formTitle}>Raise Support Ticket</Text>

        <Text style={s.label}>Reference Request ID (Optional)</Text>
        {requests.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {requests.map(r => (
                <TouchableOpacity key={r.id} style={[s.chip, refReqId === r.id && s.chipActive]} onPress={() => setRefReqId(r.id)}>
                  <Text style={[s.chipText, refReqId === r.id && { color: '#fff' }]}>REQ-{r.id?.slice(-5)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={s.label}>Title / Topic *</Text>
        <TextInput style={s.input} value={compTitle} onChangeText={setCompTitle} placeholder="e.g. Driver Delayed / Missed Pickup" placeholderTextColor="#555" />

        <Text style={s.label}>Detailed Issue Description *</Text>
        <TextInput style={[s.input, { height: 90 }]} value={compDesc} onChangeText={setCompDesc} placeholder="Describe the complaint details..." placeholderTextColor="#555" multiline />

        <TouchableOpacity style={s.primaryBtn} onPress={handleSubmitComplaint} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Submit Complaint Ticket</Text>}
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Your Support Tickets ({complaints.length})</Text>
      {complaints.length === 0 ? (
        <Text style={s.emptyText}>No support tickets raised yet.</Text>
      ) : (
        complaints.map((c, idx) => {
          const sc = statusColor(c.status || 'Pending');
          return (
            <View key={idx} style={s.itemCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={s.itemTitle}>{c.subject || c.title || 'Support Ticket'}</Text>
                <Text style={[s.badge, { backgroundColor: sc.bg, color: sc.text }]}>{c.status || 'RESOLVED'}</Text>
              </View>
              <Text style={s.itemSub}>{c.description || 'No description provided'}</Text>
              {c.resolution && (
                <View style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(82,183,136,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)' }}>
                  <Text style={{ color: '#52b788', fontSize: 11, fontWeight: '800' }}>ADMIN RESOLUTION:</Text>
                  <Text style={{ color: '#d8f3dc', fontSize: 12, marginTop: 2 }}>{c.resolution}</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );

  // ─── 4. OLX MARKETPLACE TAB ──────────────────────────────────────────────
  const renderMarketplaceTab = () => {
    const filtered = marketplaceItems.filter(item => {
      if (marketplaceFilter === 'All') return true;
      return item.category === marketplaceFilter;
    });

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={s.fab} onPress={() => setNewMarketModal(true)}>
          <Text style={s.fabText}>+ Sell Item</Text>
        </TouchableOpacity>
        <ScrollView style={s.tabBody} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52b788" />}>
          <Text style={s.tabHeaderTitle}>Buy & Sell Items Marketplace</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>Browse active listings, contact sellers, or list products onto platform.</Text>

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['All', 'Electronics', 'Furniture', 'Vehicles', 'Equipment', 'Recyclables', 'Other'].map(cat => (
                <TouchableOpacity key={cat} style={[s.chip, marketplaceFilter === cat && s.chipActive]} onPress={() => setMarketplaceFilter(cat)}>
                  <Text style={[s.chipText, marketplaceFilter === cat && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {filtered.length === 0 ? (
            <Text style={s.emptyText}>No marketplace listings found. Tap "+ Sell Item" to create one.</Text>
          ) : (
            filtered.map((item, idx) => (
              <View key={idx} style={s.itemCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={s.itemTitle}>{item.title}</Text>
                  <Text style={{ color: '#52b788', fontSize: 18, fontWeight: '900' }}>₹{item.price}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <Text style={[s.badge, { backgroundColor: 'rgba(82,183,136,0.15)', color: '#52b788' }]}>{item.category || 'Recyclable'}</Text>
                  <Text style={[s.badge, { backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }]}>{item.condition || 'Used - Good'}</Text>
                </View>
                {item.description ? <Text style={s.itemSub}>{item.description}</Text> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={s.itemMeta}>📍 {item.location || 'Udupi'}</Text>
                  {item.status === 'Sold' ? (
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '900', backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      SOLD
                    </Text>
                  ) : (
                    <TouchableOpacity 
                      style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      onPress={() => handleBuyMarketItem(item)}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>💳 Buy via Razorpay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Create Marketplace Modal */}
        <Modal visible={newMarketModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={s.modalContent}>
                <Text style={s.modalTitle}>Post Listing on Marketplace</Text>
                
                <Text style={s.label}>Item Title *</Text>
                <TextInput style={s.input} value={mTitle} onChangeText={setMTitle} placeholder="Title" placeholderTextColor="#555" />

                <Text style={s.label}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {['Recyclables', 'Electronics', 'Furniture', 'Vehicles', 'Equipment', 'Other'].map(c => (
                    <TouchableOpacity key={c} style={[s.chip, mCategory === c && s.chipActive]} onPress={() => setMCategory(c)}>
                      <Text style={[s.chipText, mCategory === c && { color: '#fff' }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>Price (₹) *</Text>
                <TextInput style={s.input} value={mPrice} onChangeText={setMPrice} keyboardType="numeric" placeholder="e.g. 500" placeholderTextColor="#555" />

                <Text style={s.label}>Location / Address *</Text>
                <TextInput style={s.input} value={mLocation} onChangeText={setMLocation} placeholder="Location" placeholderTextColor="#555" />

                <Text style={s.label}>Contact Phone Number</Text>
                <TextInput style={s.input} value={mPhone} onChangeText={setMPhone} keyboardType="phone-pad" placeholder="+91 9876543210" placeholderTextColor="#555" />

                <Text style={s.label}>Description</Text>
                <TextInput style={[s.input, { height: 70 }]} value={mDesc} onChangeText={setMDesc} placeholder="Description..." placeholderTextColor="#555" multiline />

                <View style={s.modalBtnRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setNewMarketModal(false)}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} onPress={handleCreateMarketItem} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmText}>Post Listing</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Razorpay Marketplace Item Payment Modal */}
        <Modal visible={!!payMarketModalItem} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { borderTopWidth: 4, borderTopColor: '#2563eb' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Razorpay Payment Gateway</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>Test Mode Sandbox · Key: rzp_test_SC7GZQVzAK7jRK</Text>
                </View>
                <TouchableOpacity onPress={() => setPayMarketModalItem(null)}>
                  <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {payMarketModalItem && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>ITEM TO BUY</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{payMarketModalItem.title}</Text>
                  <Text style={{ color: '#52b788', fontSize: 20, fontWeight: '900', marginTop: 4 }}>₹{payMarketModalItem.price}</Text>
                </View>
              )}

              <Text style={s.label}>Cardholder Name</Text>
              <TextInput style={s.input} defaultValue={user?.name || 'User Generator'} placeholder="Cardholder Name" placeholderTextColor="#555" />

              <Text style={s.label}>Razorpay Card Details (Test)</Text>
              <TextInput style={s.input} defaultValue="4111 2222 3333 4444" placeholder="4111 2222 3333 4444" placeholderTextColor="#555" />

              <Text style={s.label}>UPI ID Option</Text>
              <TextInput style={s.input} defaultValue={`${user?.username || 'user'}@upi`} placeholder="user@upi" placeholderTextColor="#555" />

              <View style={s.modalBtnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setPayMarketModalItem(null)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#2563eb' }]} onPress={handleConfirmRazorpayBuy} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmText}>Authorize ₹{payMarketModalItem?.price}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Razorpay Pickup Fee Payment Modal */}
        <Modal visible={!!payPickupModalReq} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { borderTopWidth: 4, borderTopColor: '#10b981' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Razorpay Pickup Fee Checkout</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>Test Mode Sandbox · Key: rzp_test_SC7GZQVzAK7jRK</Text>
                </View>
                <TouchableOpacity onPress={() => setPayPickupModalReq(null)}>
                  <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {payPickupModalReq && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>PICKUP REQUEST REF</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{payPickupModalReq.wasteType} Waste Collection (#{payPickupModalReq.id?.slice(-5)})</Text>
                  <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '900', marginTop: 4 }}>₹{payPickupModalReq.amount}</Text>
                </View>
              )}

              <Text style={s.label}>Cardholder Name</Text>
              <TextInput style={s.input} defaultValue={user?.name || 'User Generator'} placeholder="Cardholder Name" placeholderTextColor="#555" />

              <Text style={s.label}>Razorpay Card / UPI Details (Test)</Text>
              <TextInput style={s.input} defaultValue="4111 2222 3333 4444" placeholder="4111 2222 3333 4444" placeholderTextColor="#555" />

              <View style={s.modalBtnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setPayPickupModalReq(null)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#10b981' }]} onPress={handleConfirmRazorpayPickupFee} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={[s.confirmText, { color: '#000' }]}>Authorize ₹{payPickupModalReq?.amount}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ─── 5. MY PROFILE TAB ───────────────────────────────────────────────────
  const renderProfileTab = () => (
    <ScrollView style={s.tabBody} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.profileHeaderCard}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{(user?.name || 'G')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.profileName}>{user?.name || 'Greenwood Residential Society'}</Text>
        <Text style={s.profileRoleBadge}>USER MODULE</Text>
        <Text style={s.profileSub}>Waste Generator (User Module) — Submit and track waste pickup requests.</Text>
      </View>

      <Text style={s.sectionTitle}>ACCOUNT INFORMATION</Text>

      <View style={s.profileRow}>
        <Text style={s.profileRowLabel}>USERNAME</Text>
        <Text style={s.profileRowVal}>{user?.username || 'generator'}</Text>
      </View>

      <View style={s.profileRow}>
        <Text style={s.profileRowLabel}>FULL NAME</Text>
        <Text style={s.profileRowVal}>{user?.name || 'Greenwood Residential Society'}</Text>
      </View>

      <View style={s.profileRow}>
        <Text style={s.profileRowLabel}>ROLE</Text>
        <Text style={s.profileRowVal}>User Module (Generator)</Text>
      </View>

      <View style={s.profileRow}>
        <Text style={s.profileRowLabel}>EMAIL</Text>
        <Text style={s.profileRowVal}>{user?.email || 'society@example.com'}</Text>
      </View>

      <View style={s.profileRow}>
        <Text style={s.profileRowLabel}>CONTACT</Text>
        <Text style={s.profileRowVal}>{user?.contact || '+91 9876543210'}</Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={() => { setUser(null); setScreen('login'); }}>
        <Text style={s.logoutBtnText}>🚪 Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── MAIN APP NAVIGATION ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07120c" />

      {/* Top Header */}
      <View style={s.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>♻️</Text>
          <View>
            <Text style={s.topHeaderTitle}>BulkWaste</Text>
            <Text style={s.topHeaderSub}>MANAGEMENT HUB</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell Button with Live Badge */}
          <TouchableOpacity 
            style={s.notifBellBtn} 
            onPress={() => setIsNotifOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{user?.name || 'Generator'}</Text>
            <Text style={{ color: '#52b788', fontSize: 10, fontWeight: '800' }}>USER MODULE</Text>
          </View>
        </View>
      </View>

      {/* Screen Body */}
      <View style={{ flex: 1 }}>
        {activeTab === 'properties' && renderPropertiesTab()}
        {activeTab === 'requests' && renderPickupRequestsTab()}
        {activeTab === 'complaints' && renderComplaintsTab()}
        {activeTab === 'marketplace' && renderMarketplaceTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </View>

      {/* Notification Modal / Overlay just like Web */}
      <Modal visible={isNotifOpen} transparent animationType="fade">
        <View style={s.notifModalOverlay}>
          <View style={s.notifModalContent}>
            <View style={s.notifHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.notifHeaderTitle}>🔔 Notifications</Text>
                {unreadCount > 0 && (
                  <View style={s.notifNewPill}>
                    <Text style={s.notifNewPillText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkNotificationsRead} style={s.notifMarkAllBtn}>
                    <Text style={s.notifMarkAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsNotifOpen(false)} style={s.notifCloseBtn}>
                  <Text style={s.notifCloseText}>✕</Text>
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
                      s.notifItemCard,
                      n.read ? s.notifItemRead : s.notifItemUnread
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Text style={[
                        s.notifItemTitle,
                        {
                          color: n.type === 'warning' ? '#fbbf24' :
                                 n.type === 'success' ? '#00e676' :
                                 n.type === 'danger' ? '#f87171' :
                                 '#ffffff'
                        }
                      ]}>
                        {n.title}
                      </Text>
                      <Text style={s.notifItemTime}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={s.notifItemMsg}>{n.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Exact 5 Navigation Tabs matching Web App */}
      <View style={s.bottomNav}>
        {[
          { id: 'properties', icon: '👤', label: 'Properties Info' },
          { id: 'requests', icon: '📦', label: 'Pickup Requests' },
          { id: 'complaints', icon: '⚠️', label: 'File Complaints' },
          { id: 'marketplace', icon: '🛍️', label: 'OLX Marketplace' },
          { id: 'profile', icon: '👤', label: 'My Profile' },
        ].map((t) => (
          <TouchableOpacity key={t.id} style={[s.navItem, activeTab === t.id && s.navItemActive]} onPress={() => setActiveTab(t.id)}>
            <Text style={{ fontSize: 16 }}>{t.icon}</Text>
            <Text style={[s.navLabel, activeTab === t.id && s.navLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#07120c' },
  logoBlock: { alignItems: 'center', marginBottom: 20 },
  logoEmoji: { fontSize: 44 },
  logoTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 4 },
  logoSub: { fontSize: 11, color: '#52b788', marginTop: 2, fontWeight: '800', letterSpacing: 1 },

  serverBox: { backgroundColor: '#0b1d13', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)' },
  serverLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  connBadge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  connOk: { backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' },
  connFail: { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  serverInput: { backgroundColor: '#132e1f', color: '#f1f5f9', borderRadius: 8, padding: 8, fontSize: 12, marginTop: 4 },

  authTabs: { flexDirection: 'row', backgroundColor: '#0b1d13', borderRadius: 10, padding: 3, marginBottom: 14 },
  authTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  authTabActive: { backgroundColor: '#2d6a4f' },
  authTabText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  authTabTextActive: { color: '#fff' },

  formCard: { backgroundColor: '#0f2418', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)', marginBottom: 16 },
  formTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  formSub: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },

  label: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  input: { backgroundColor: '#132e1f', color: '#f1f5f9', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  primaryBtn: { backgroundColor: '#2d6a4f', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  hintText: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 8 },

  container: { flex: 1, backgroundColor: '#07120c' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#0b1d13', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  topHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  topHeaderSub: { color: '#52b788', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  tabBody: { flex: 1, padding: 14 },
  tabHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 14 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 14, marginBottom: 10 },
  emptyText: { color: '#64748b', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 16 },

  feeBox: { backgroundColor: 'rgba(82,183,136,0.08)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)' },
  feeTitle: { color: '#52b788', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  feeRow: { color: '#94a3b8', fontSize: 11 },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: '#2d6a4f', borderColor: '#52b788' },
  chipText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

  itemCard: { backgroundColor: '#0f2418', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)' },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  itemSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  itemMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, fontSize: 10, fontWeight: '800' },

  fab: { position: 'absolute', bottom: 16, right: 14, zIndex: 99, backgroundColor: '#2d6a4f', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  profileHeaderCard: { backgroundColor: '#0f2418', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(82,183,136,0.2)' },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#2d6a4f', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  profileRoleBadge: { color: '#52b788', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(82,183,136,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: 4 },
  profileSub: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 6 },

  profileRow: { backgroundColor: '#0f2418', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(82,183,136,0.15)' },
  profileRowLabel: { color: '#64748b', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  profileRowVal: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 },

  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  logoutBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 13 },

  bottomNav: { flexDirection: 'row', backgroundColor: '#0b1d13', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navItemActive: { borderTopWidth: 2, borderTopColor: '#52b788' },
  navLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', marginTop: 2 },
  navLabelActive: { color: '#52b788' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center' },
  modalContent: { backgroundColor: '#0f2418', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(82,183,136,0.3)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  confirmBtn: { flex: 2, padding: 10, borderRadius: 8, backgroundColor: '#2d6a4f', alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  notifBellBtn: {
    padding: 8,
    backgroundColor: '#0d1a12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppMain />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
