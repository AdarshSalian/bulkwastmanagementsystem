import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, Plus, Shield, MapPin, Truck, Activity, DollarSign, AlertCircle, CheckCircle, 
  Clock, FileText, Send, User, LogOut, Bell, FileDown, ShieldAlert, BarChart3, Settings, 
  Navigation, RefreshCw, Layers, ShieldCheck, X, Search, Crosshair, Compass, Calendar, ShoppingBag
} from 'lucide-react';
import { api } from './api';
import { LeafletMap } from './LeafletMap';

// --- Toast System Component ---
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = type === 'success' ? 'border-emerald-500 bg-emerald-950/80 text-emerald-300' 
                : type === 'error' ? 'border-red-500 bg-red-950/80 text-red-300' 
                : 'border-cyan-500 bg-cyan-950/80 text-cyan-300';

  return (
    <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border glass flex items-center gap-3 shadow-lg animate-slide-in ${bgClass}`}>
      {type === 'success' && <CheckCircle size={20} className="text-emerald-400" />}
      {type === 'error' && <AlertCircle size={20} className="text-red-400" />}
      {type === 'info' && <Clock size={20} className="text-cyan-400" />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// --- Custom SVG Bar Chart Component ---
function SimpleBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.waste || 1));
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="h-48 flex items-end justify-between gap-4 pt-6 border-b border-white/10">
        {data.map((item, idx) => {
          const heightPercent = (item.waste / maxVal) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* Tooltip */}
              <div 
                className="absolute -top-6 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border"
                style={{ background: 'var(--bg-surface-solid)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', zIndex: 10 }}
              >
                {item.waste} tons
              </div>
              <div 
                style={{ 
                  height: `${heightPercent}%`,
                  background: 'linear-gradient(to top, var(--primary), var(--primary-hover, var(--primary)))',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 4px 12px var(--primary-glow)',
                  transition: 'opacity 0.25s ease'
                }} 
                className="w-full hover:opacity-85"
              ></div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        {data.map((item, idx) => (
          <span key={idx} className="flex-1 text-center">{item.name}</span>
        ))}
      </div>
    </div>
  );
}

// --- Custom SVG Pie Chart Component ---
function SimplePieChart({ data }) {
  let total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) total = 1;
  let accumulatedAngle = 0;

  const colors = ['#10B981', '#06B6D4', '#EF4444']; // Organic, Recyclable, Residual

  return (
    <div className="flex items-center gap-6 justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
        {data.map((item, idx) => {
          const percentage = item.value / total;
          const angle = percentage * 360;
          const x1 = 80 + 70 * Math.cos((accumulatedAngle * Math.PI) / 180);
          const y1 = 80 + 70 * Math.sin((accumulatedAngle * Math.PI) / 180);
          accumulatedAngle += angle;
          const x2 = 80 + 70 * Math.cos((accumulatedAngle * Math.PI) / 180);
          const y2 = 80 + 70 * Math.sin((accumulatedAngle * Math.PI) / 180);
          const largeArcFlag = angle > 180 ? 1 : 0;

          return (
            <path
              key={idx}
              d={`M 80 80 L ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={colors[idx % colors.length]}
              stroke="#ffffff"
              strokeWidth="2"
              className="hover:opacity-85 transition-opacity cursor-pointer"
            >
              <title>{item.name}: {item.value} tons ({Math.round(percentage * 100)}%)</title>
            </path>
          );
        })}
        <circle cx="80" cy="80" r="35" fill="#ffffff" />
      </svg>

      <div className="flex flex-col gap-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
            <span className="text-gray-300 font-medium">{item.name}:</span>
            <span className="text-white font-semibold">{item.value} t</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Dynamic Interactive Route Simulator Map Component ---
function LiveSimulatorMap({ startPoint, endPoint, speedMultiplier = 1 }) {
  const canvasRef = useRef(null);
  const [truckPos, setTruckPos] = useState({ x: 80, y: 150 });
  const [status, setStatus] = useState('Idle');
  const [tripProgress, setTripProgress] = useState(0);

  // Define route steps
  const routes = [
    { name: 'Transporter Depot', x: 50, y: 250 },
    { name: 'Generator Property', x: 250, y: 80 },
    { name: 'Processing Plant', x: 450, y: 220 }
  ];

  useEffect(() => {
    let animationId;
    if (status === 'In-Transit') {
      let t = tripProgress;
      const animate = () => {
        t += 0.005 * speedMultiplier;
        if (t >= 1) {
          t = 1;
          setStatus('Delivered');
          setTripProgress(1);
        } else {
          setTripProgress(t);
          // Calculate linear interpolation along the route points
          if (t < 0.5) {
            // First leg: Depot -> Generator
            const legT = t * 2;
            const px = routes[0].x + (routes[1].x - routes[0].x) * legT;
            const py = routes[0].y + (routes[1].y - routes[0].y) * legT;
            setTruckPos({ x: px, y: py });
          } else {
            // Second leg: Generator -> Plant
            const legT = (t - 0.5) * 2;
            const px = routes[1].x + (routes[2].x - routes[1].x) * legT;
            const py = routes[1].y + (routes[2].y - routes[1].y) * legT;
            setTruckPos({ x: px, y: py });
          }
          animationId = requestAnimationFrame(animate);
        }
      };
      animationId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationId);
  }, [status, tripProgress, speedMultiplier]);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 500, 300);

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 500; i += 25) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 300);
      ctx.stroke();
    }
    for (let j = 0; j < 300; j += 25) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(500, j);
      ctx.stroke();
    }

    // Draw Route Paths
    ctx.strokeStyle = 'rgba(72, 149, 239, 0.4)';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(routes[0].x, routes[0].y);
    ctx.lineTo(routes[1].x, routes[1].y);
    ctx.lineTo(routes[2].x, routes[2].y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Draw Route nodes
    routes.forEach((node, idx) => {
      // Glow circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 1 ? 'rgba(45, 106, 79, 0.15)' : 'rgba(72, 149, 239, 0.15)';
      ctx.fill();

      // Node point
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 1 ? '#2D6A4F' : '#4895EF';
      ctx.fill();

      // Label text
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillText(node.name, node.x - 45, node.y - 18);
    });

    // Draw Active Truck Position
    ctx.beginPath();
    ctx.arc(truckPos.x, truckPos.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#52B788';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pulse effect around truck
    ctx.beginPath();
    ctx.arc(truckPos.x, truckPos.y, 16 + 4 * Math.sin(Date.now() / 200), 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(82, 183, 136, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [truckPos]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative border border-white/10 rounded-xl overflow-hidden bg-slate-950/80">
        <canvas ref={canvasRef} width="500" height="300" className="w-full max-w-full block" />
        <div className="absolute top-3 left-3 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${status === 'In-Transit' ? 'bg-cyan-400 animate-pulse' : status === 'Delivered' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          Status: {status}
        </div>
        {status === 'In-Transit' && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 border border-white/10 px-3 py-2 rounded-lg">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Transit Progress</span>
              <span>{Math.round(tripProgress * 100)}%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full transition-all duration-100" style={{ width: `${tripProgress * 100}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => {
            setStatus('In-Transit');
            setTripProgress(0);
          }} 
          disabled={status === 'In-Transit'}
          className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
        >
          <Navigation size={16} /> Simulate Route Run
        </button>
        <button 
          onClick={() => {
            setStatus('Idle');
            setTruckPos({ x: 50, y: 250 });
            setTripProgress(0);
          }} 
          className="btn-secondary py-2 px-4 text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ====================================================
// MAIN COMPONENT ENTRY POINT
// ====================================================
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  // App Global State caches
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [plants, setPlants] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]); // Admin only
  const [activities, setActivities] = useState([]); // Admin only
  const [pricingSettings, setPricingSettings] = useState(null); // Admin pricing config
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserFields, setNewUserFields] = useState({
    username: '', password: '', role: 'Driver', name: '', contact: '', email: '', organizationName: ''
  });

  // Screen/Tab state
  const [activeTab, setActiveTab] = useState('overview');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Organic');
  const [paymentModalReq, setPaymentModalReq] = useState(null);
  const [assignModalReq, setAssignModalReq] = useState(null);
  const [operatorRecordReq, setOperatorRecordReq] = useState(null);
  const [resolutionModalComp, setResolutionModalComp] = useState(null);
  const [viewOrderModalReq, setViewOrderModalReq] = useState(null);
  const [collectionReceiptModal, setCollectionReceiptModal] = useState(null);
  const [viewUserDetail, setViewUserDetail] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileFields, setEditProfileFields] = useState({ name: '', email: '', contact: '', organizationName: '' });

  // Form Fields
  const [loginFields, setLoginFields] = useState({ username: '', password: '' });
  const [regFields, setRegFields] = useState({
    username: '', password: '', role: 'Generator', name: '', contact: '', email: '', organizationName: ''
  });
  const [regFile, setRegFile] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // OLX Marketplace States
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [marketplaceCategoryFilter, setMarketplaceCategoryFilter] = useState('All');
  const [marketplaceSearchQuery, setMarketplaceSearchQuery] = useState('');
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState(null);
  const [newMarketplaceItem, setNewMarketplaceItem] = useState({
    title: '', category: 'Electronics', price: '', location: 'Udupi / Malpe', condition: 'Used - Like New', description: '', contactPhone: '+91 9876543210', imageUrl: ''
  });
  const [marketplaceImageFile, setMarketplaceImageFile] = useState(null);

  // New item creation fields
  const [newProp, setNewProp] = useState({ name: '', address: '', type: 'Residential', details: '', lat: '', lng: '' });
  const [newRequest, setNewRequest] = useState({ propertyId: '', wasteType: 'Organic', wasteQuantity: '', scheduledDate: '' });
  const [newVehicle, setNewVehicle] = useState({ licensePlate: '', type: 'Compactor', capacity: '', driverId: '', lat: '', lng: '' });
  const [newPlant, setNewPlant] = useState({ name: '', location: '', capacity: '', type: 'Composting', lat: '', lng: '' });
  const [newComplaint, setNewComplaint] = useState({ requestId: '', title: '', description: '' });
  const [pickedLocation, setPickedLocation] = useState(null);

  // Custom Allocation/Weight inputs
  const [assignState, setAssignState] = useState({ driverId: '', vehicleId: '' });
  const [collectWeight, setCollectWeight] = useState('');
  const [collectCategory, setCollectCategory] = useState('');
  const [segregationInput, setSegregationInput] = useState({ organicWeight: '', recyclableWeight: '', residualWeight: '' });
  const [resolutionText, setResolutionText] = useState('');

  // Fetch initial profile if token exists
  useEffect(() => {
    if (token) {
      api.getMe()
        .then(u => {
          setUser(u);
          triggerInitialDataLoad(u);
        })
        .catch(err => {
          showToast('Session expired. Please login again.', 'error');
          handleLogout();
        });
    }
  }, [token]);

  const [driverLeaves, setDriverLeaves] = useState([]);
  const [newLeaveFields, setNewLeaveFields] = useState({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
  const [leavePrescriptionFile, setLeavePrescriptionFile] = useState(null);
  const [reviewLeaveModal, setReviewLeaveModal] = useState(null);
  const [adminLeaveComment, setAdminLeaveComment] = useState('');

  // Query notifications and data refresh loop
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadNotifications();
      // Lightly refresh requests/deliveries
      api.getRequests().then(setRequests).catch(console.error);
      if (user.role === 'Admin' || user.role === 'Driver') {
        api.getDriverLeaves().then(setDriverLeaves).catch(console.error);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setActiveTab('overview');
    // Clear cache
    setProperties([]);
    setRequests([]);
    setVehicles([]);
    setPlants([]);
    setComplaints([]);
    setNotifications([]);
    setAnalytics(null);
  };

  const triggerInitialDataLoad = (currUser) => {
    loadNotifications();
    api.getMarketplaceItems().then(setMarketplaceItems).catch(console.error);
    
    // Role based fetches
    if (currUser.role === 'Admin') {
      api.getAdminUsers().then(setUsersList).catch(console.error);
      api.getProperties().then(setProperties).catch(console.error);
      api.getRequests().then(setRequests).catch(console.error);
      api.getVehicles().then(setVehicles).catch(console.error);
      api.getPlants().then(setPlants).catch(console.error);
      api.getComplaints().then(setComplaints).catch(console.error);
      api.getAnalyticsSummary().then(setAnalytics).catch(console.error);
      api.getActivities().then(setActivities).catch(console.error);
      api.getSettings().then(setPricingSettings).catch(console.error);
      api.getDriverLeaves().then(setDriverLeaves).catch(console.error);
    } else if (currUser.role === 'Generator') {
      api.getProperties().then(setProperties).catch(console.error);
      api.getRequests().then(setRequests).catch(console.error);
      api.getComplaints().then(setComplaints).catch(console.error);
      api.getSettings().then(setPricingSettings).catch(console.error);
    } else if (currUser.role === 'Driver') {
      api.getRequests().then(setRequests).catch(console.error);
      api.getVehicles().then(setVehicles).catch(console.error);
      api.getDriverLeaves().then(setDriverLeaves).catch(console.error);
    } else if (currUser.role === 'Operator') {
      api.getRequests().then(setRequests).catch(console.error);
      api.getPlants().then(setPlants).catch(console.error);
      api.getPlantDeliveries().then(d => {
        // Use delivery list in operator views
      }).catch(console.error);
    }
  };

  const loadNotifications = () => {
    api.getNotifications().then(setNotifications).catch(console.error);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.login(loginFields.username, loginFields.password);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      triggerInitialDataLoad(data.user);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const data = await api.updateProfile(editProfileFields);
      setUser(data.user);
      setIsEditingProfile(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!regFields.username || !regFields.username.trim() || regFields.username.trim().length < 3) {
        showToast('Username must be at least 3 characters long', 'error');
        return;
      }

      if (!regFields.password || regFields.password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regFields.email || !emailRegex.test(regFields.email.trim())) {
        showToast('Please enter a valid email address', 'error');
        return;
      }

      if (!regFields.name || !regFields.name.trim()) {
        showToast('Full name is required', 'error');
        return;
      }

      if (regFields.role === 'Generator' && !regFields.organizationName.trim()) {
        showToast('Organization/Society Name is required for Waste Generators', 'error');
        return;
      }

      const fd = new FormData();
      fd.append('username', regFields.username.trim());
      fd.append('password', regFields.password);
      fd.append('role', regFields.role);
      fd.append('name', regFields.name.trim());
      fd.append('contact', regFields.contact.trim());
      fd.append('email', regFields.email.trim());
      if (regFields.role === 'Generator') {
        fd.append('organizationName', regFields.organizationName.trim());
        if (regFile) {
          fd.append('document', regFile);
        }
      }

      const res = await api.register(fd);
      showToast(res.message, 'success');
      setIsRegisterMode(false);
      // Clear forms
      setRegFields({
        username: '', password: '', role: 'Generator', name: '', contact: '', email: '', organizationName: ''
      });
      setRegFile(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- CRUD API Actions ---

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    try {
      if (!newProp.name || !newProp.name.trim()) {
        showToast('Property name is required', 'error');
        return;
      }

      if (!newProp.address || !newProp.address.trim()) {
        showToast('Property address is required', 'error');
        return;
      }

      const created = await api.createProperty(newProp);
      setProperties([...properties, created]);
      showToast('Property registered successfully', 'success');
      setNewProp({ name: '', address: '', type: 'Residential', details: '', lat: '', lng: '' });
      setPickedLocation(null);
      setActiveTab('overview');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      if (!newRequest.propertyId) {
        showToast('Please select a property for pickup', 'error');
        return;
      }

      const qty = parseFloat(newRequest.wasteQuantity);
      if (isNaN(qty) || qty <= 0) {
        showToast('Waste quantity must be a positive number greater than 0', 'error');
        return;
      }

      if (qty > 500) {
        showToast('Maximum allowed single request volume is 500 tons', 'error');
        return;
      }

      if (!newRequest.scheduledDate) {
        showToast('Please select a pickup scheduled date', 'error');
        return;
      }

      const created = await api.createRequest(newRequest);
      setRequests([...requests, created]);
      showToast('Waste collection request created!', 'success');
      setNewRequest({ propertyId: '', wasteType: 'Organic', wasteQuantity: '', scheduledDate: '' });
      setActiveTab('requests');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!assignState.driverId || !assignState.vehicleId) {
        showToast('Please select both a driver and fleet vehicle', 'error');
        return;
      }

      await api.assignRequest(assignModalReq.id, assignState.driverId, assignState.vehicleId);
      showToast('Trip successfully assigned to transporter', 'success');
      setAssignModalReq(null);
      // Reload lists
      api.getRequests().then(setRequests);
      api.getAnalyticsSummary().then(setAnalytics);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCollectionSubmit = async (e, reqId, defaultType, extraData = {}) => {
    e.preventDefault();
    try {
      const weightNum = parseFloat(collectWeight);
      if (isNaN(weightNum) || weightNum <= 0) {
        showToast('Please enter a valid scale weight reading greater than 0 tons', 'error');
        return;
      }

      const categoryToSubmit = collectCategory || defaultType;
      await api.collectWaste(reqId, collectWeight, categoryToSubmit, extraData);
      showToast('Waste pickup weight and payment/collection logged!', 'success');
      setCollectWeight('');
      setCollectCategory('');
      const updatedReqs = await api.getRequests();
      setRequests(updatedReqs);
      const targetReq = updatedReqs.find(r => r.id === reqId);
      if (targetReq) {
        setCollectionReceiptModal(targetReq);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOperatorDeliverySubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedPlant = plants[0]; // Auto select first plant or let operator choose
      if (!selectedPlant) {
        showToast('No active processing plant available', 'error');
        return;
      }

      const orgWeight = parseFloat(segregationInput.organicWeight) || 0;
      const recWeight = parseFloat(segregationInput.recyclableWeight) || 0;
      const resWeight = parseFloat(segregationInput.residualWeight) || 0;

      if (orgWeight + recWeight + resWeight <= 0) {
        showToast('Please enter measured weight for at least one segregated component', 'error');
        return;
      }

      await api.recordPlantDelivery(selectedPlant.id, {
        requestId: operatorRecordReq.id,
        organicWeight: orgWeight,
        recyclableWeight: recWeight,
        residualWeight: resWeight
      });
      showToast('Delivery recorded and waste segregated successfully', 'success');
      setOperatorRecordReq(null);
      setSegregationInput({ organicWeight: '', recyclableWeight: '', residualWeight: '' });
      api.getRequests().then(setRequests);
      api.getPlants().then(setPlants);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDriverLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newLeaveFields.startDate || !newLeaveFields.endDate) {
        showToast('Both leave start date and end date are required', 'error');
        return;
      }

      if (new Date(newLeaveFields.endDate) < new Date(newLeaveFields.startDate)) {
        showToast('Leave end date cannot be earlier than start date', 'error');
        return;
      }

      if (!newLeaveFields.reason || !newLeaveFields.reason.trim()) {
        showToast('Please state a reason for taking leave', 'error');
        return;
      }

      if (newLeaveFields.leaveType === 'Medical' && !leavePrescriptionFile) {
        showToast('Medical prescription document is required for medical leaves!', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('leaveType', newLeaveFields.leaveType);
      formData.append('startDate', newLeaveFields.startDate);
      formData.append('endDate', newLeaveFields.endDate);
      formData.append('reason', newLeaveFields.reason.trim());
      if (leavePrescriptionFile) {
        formData.append('prescription', leavePrescriptionFile);
      }
      await api.submitDriverLeave(formData);
      showToast('Leave request submitted! Awaiting Admin approval.', 'success');
      setNewLeaveFields({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
      setLeavePrescriptionFile(null);
      api.getDriverLeaves().then(setDriverLeaves);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReviewLeaveSubmit = async (status) => {
    try {
      if (!reviewLeaveModal) return;
      await api.reviewDriverLeave(reviewLeaveModal.id, status, adminLeaveComment);
      showToast(`Leave request has been ${status.toLowerCase()}.`, status === 'Approved' ? 'success' : 'info');
      setReviewLeaveModal(null);
      setAdminLeaveComment('');
      api.getDriverLeaves().then(setDriverLeaves);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRazorpayCheckout = (reqItem) => {
    const razorpayKey = 'rzp_test_SC7GZQVzAK7jRK';
    const amountInPaise = Math.round((reqItem.amount || 0) * 100);

    // Options for Razorpay Checkout Popup
    const options = {
      key: razorpayKey,
      amount: amountInPaise > 0 ? amountInPaise : 100, // Amount in paise
      currency: 'INR',
      name: 'Bulk Waste Management',
      description: `Payment for Waste Collection Request #${reqItem.id} (${reqItem.wasteType})`,
      image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      handler: async function (response) {
        try {
          const razorpayPaymentId = response.razorpay_payment_id || `pay_rzp_${Date.now()}`;
          await api.payRequest(reqItem.id, {
            paymentMethod: 'Razorpay Checkout (UPI/Card/Netbanking)',
            transactionId: razorpayPaymentId
          });
          showToast(`Razorpay Payment Successful! Txn Ref: ${razorpayPaymentId}`, 'success');
          setPaymentModalReq(null);
          api.getRequests().then(setRequests);
        } catch (err) {
          showToast(err.message || 'Failed to record Razorpay payment', 'error');
        }
      },
      prefill: {
        name: user?.name || 'Bulk Waste Customer',
        email: user?.email || 'customer@bulkwaste.com',
        contact: user?.contact || '9876543210'
      },
      notes: {
        requestId: reqItem.id,
        wasteCategory: reqItem.wasteType
      },
      theme: {
        color: '#2d6a4f'
      }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        showToast(`Payment Failed: ${response.error.description || 'Transaction cancelled'}`, 'error');
      });
      rzp.open();
    } else {
      // Fallback modal if SDK script has not loaded
      setPaymentModalReq(reqItem);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.payRequest(paymentModalReq.id, {
        paymentMethod: 'Razorpay Online Gateway',
        transactionId: `pay_razor_${Date.now()}`
      });
      showToast('Payment processed via Razorpay! Invoice generated.', 'success');
      setPaymentModalReq(null);
      api.getRequests().then(setRequests);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateMarketplaceItem = async (e) => {
    e.preventDefault();
    try {
      if (!newMarketplaceItem.title || !newMarketplaceItem.title.trim()) {
        showToast('Item title is required', 'error');
        return;
      }
      const priceNum = parseFloat(newMarketplaceItem.price);
      if (isNaN(priceNum) || priceNum < 0) {
        showToast('Please enter a valid price amount', 'error');
        return;
      }
      if (!newMarketplaceItem.location || !newMarketplaceItem.location.trim()) {
        showToast('Pickup location is required', 'error');
        return;
      }

      const fd = new FormData();
      fd.append('title', newMarketplaceItem.title.trim());
      fd.append('category', newMarketplaceItem.category);
      fd.append('price', priceNum);
      fd.append('location', newMarketplaceItem.location.trim());
      fd.append('condition', newMarketplaceItem.condition);
      fd.append('description', newMarketplaceItem.description.trim());
      fd.append('contactPhone', newMarketplaceItem.contactPhone.trim());
      if (marketplaceImageFile) {
        fd.append('image', marketplaceImageFile);
      } else if (newMarketplaceItem.imageUrl) {
        fd.append('imageUrl', newMarketplaceItem.imageUrl);
      }

      const res = await api.createMarketplaceItem(fd);
      showToast(res.message || 'Item listed on OLX Marketplace!', 'success');
      setNewMarketplaceItem({
        title: '', category: 'Electronics', price: '', location: 'Udupi / Malpe', condition: 'Used - Like New', description: '', contactPhone: '+91 9876543210', imageUrl: ''
      });
      setMarketplaceImageFile(null);
      api.getMarketplaceItems().then(setMarketplaceItems);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteMarketplaceItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this listing from Marketplace?")) return;
    try {
      await api.deleteMarketplaceItem(itemId);
      showToast('Item removed from OLX Marketplace', 'success');
      if (selectedMarketplaceItem?.id === itemId) setSelectedMarketplaceItem(null);
      api.getMarketplaceItems().then(setMarketplaceItems);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    try {
      if (!newComplaint.requestId) {
        showToast('Please select an associated pickup request', 'error');
        return;
      }
      if (!newComplaint.title || !newComplaint.title.trim()) {
        showToast('Ticket title is required', 'error');
        return;
      }
      if (!newComplaint.description || !newComplaint.description.trim()) {
        showToast('Detailed description is required', 'error');
        return;
      }

      const created = await api.createComplaint(newComplaint);
      setComplaints([...complaints, created]);
      showToast('Complaint ticket logged successfully', 'success');
      setNewComplaint({ requestId: '', title: '', description: '' });
      setActiveTab('complaints');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResolveComplaintSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!resolutionText || !resolutionText.trim()) {
        showToast('Resolution remark is required', 'error');
        return;
      }
      await api.resolveComplaint(resolutionModalComp.id, resolutionText.trim());
      showToast('Support ticket marked as resolved', 'success');
      setResolutionModalComp(null);
      setResolutionText('');
      api.getComplaints().then(setComplaints);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (!newUserFields.username || !newUserFields.username.trim()) {
        showToast('Username is required', 'error');
        return;
      }
      if (!newUserFields.password || newUserFields.password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
      }
      if (!newUserFields.name || !newUserFields.name.trim()) {
        showToast('Name is required', 'error');
        return;
      }

      await api.createUser(newUserFields);
      showToast('User created successfully!', 'success');
      setNewUserFields({
        username: '', password: '', role: 'Driver', name: '', contact: '', email: '', organizationName: ''
      });
      api.getAdminUsers().then(setUsersList);
      api.getActivities().then(setActivities);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    try {
      await api.deleteUser(userId);
      showToast('User deleted successfully', 'success');
      if (selectedUser?.id === userId) setSelectedUser(null);
      api.getAdminUsers().then(setUsersList);
      api.getActivities().then(setActivities);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.approveUser(userId);
      showToast('Generator account approved!', 'success');
      api.getAdminUsers().then(setUsersList);
      api.getActivities().then(setActivities);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      await api.suspendUser(userId);
      showToast('Account suspended', 'warning');
      api.getAdminUsers().then(setUsersList);
      api.getActivities().then(setActivities);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      if (!newVehicle.licensePlate || !newVehicle.licensePlate.trim()) {
        showToast('Vehicle license plate is required', 'error');
        return;
      }

      const cap = parseFloat(newVehicle.capacity);
      if (isNaN(cap) || cap <= 0) {
        showToast('Vehicle capacity must be a positive number', 'error');
        return;
      }

      await api.createVehicle(newVehicle);
      showToast('Vehicle added to fleet', 'success');
      setNewVehicle({ licensePlate: '', type: 'Compactor', capacity: '', driverId: '' });
      api.getVehicles().then(setVehicles);
      api.getActivities().then(setActivities);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddPlant = async (e) => {
    e.preventDefault();
    try {
      if (!newPlant.name || !newPlant.name.trim()) {
        showToast('Plant facility name is required', 'error');
        return;
      }
      if (!newPlant.location || !newPlant.location.trim()) {
        showToast('Facility location is required', 'error');
        return;
      }

      const cap = parseFloat(newPlant.capacity);
      if (isNaN(cap) || cap <= 0) {
        showToast('Plant processing capacity must be a positive number', 'error');
        return;
      }

      await api.createPlant(newPlant);
      showToast('Processing plant registered', 'success');
      setNewPlant({ name: '', location: '', capacity: '', type: 'Composting' });
      api.getPlants().then(setPlants);
      api.getActivities().then(setActivities);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const markNotificationsAsRead = () => {
    api.markNotificationsRead()
      .then(() => {
        loadNotifications();
        setIsNotificationsOpen(false);
      })
      .catch(console.error);
  };

  // --- Export Reports utility ---
  const handleExportCSV = (type) => {
    let dataToExport = [];
    let filename = 'report.csv';

    if (type === 'waste') {
      filename = 'waste_collection_report.csv';
      dataToExport = requests.map(r => ({
        'Request ID': r.id,
        'Generator': r.generatorName,
        'Address': r.propertyAddress,
        'Waste Type': r.wasteType,
        'Planned Vol (t)': r.wasteQuantity,
        'Actual Scaled (t)': r.weight,
        'Scheduled Date': r.scheduledDate,
        'Status': r.status,
        'Payment Status': r.paymentStatus
      }));
    } else if (type === 'revenue') {
      filename = 'revenue_billing_report.csv';
      dataToExport = requests.filter(r => r.paymentStatus === 'Paid').map(r => ({
        'Request ID': r.id,
        'Generator': r.generatorName,
        'Amount Paid': `$${r.amount}`,
        'Method': r.paymentDetails?.paymentMethod || 'N/A',
        'Transaction ID': r.paymentDetails?.transactionId || 'N/A',
        'Paid At': r.paymentDetails?.paidAt || 'N/A'
      }));
    }

    if (dataToExport.length === 0) {
      showToast('No records available to export', 'error');
      return;
    }

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Report downloaded: ${filename}`, 'success');
  };

  // Filter lists for dashboard selectors
  const activeNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen flex flex-col relative ${user ? 'theme-sage md:h-screen md:overflow-hidden' : ''}`}>
      <div className="grid-bg"></div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* HEADER NAVBAR */}
      <header className="glass sticky top-0 z-40 border-b border-white/5 py-4 px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trash2 size={22} className="text-slate-900 font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">BulkWaste</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Management Hub</span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            {/* Notifications panel toggle */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors relative"
              >
                <Bell size={18} className="text-gray-300" />
                {activeNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-slate-950 animate-pulse">
                    {activeNotificationsCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 glass border border-white/10 rounded-2xl p-4 shadow-xl z-50 animate-fade-in">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    {activeNotificationsCount > 0 && (
                      <button onClick={markNotificationsAsRead} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto flex flex-col gap-2.5">
                    {notifications.length === 0 ? (
                      <span className="text-xs text-gray-500 text-center py-4">No notifications</span>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-2.5 rounded-xl border ${n.read ? 'bg-transparent border-white/5 opacity-60' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-semibold text-xs text-white">{n.title}</span>
                            <span className="text-[9px] text-gray-500">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>


            {/* Profile pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white">{user.name}</p>
                <span className="badge badge-info mt-0.5 py-0.5">{user.role === 'Generator' ? 'User Module' : user.role}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 transition-colors"
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* BODY CONTENT AREA */}
      <main className="flex-1 flex flex-col md:flex-row">
        
        {/* IF NOT LOGGED IN - SHOW AUTHENTICATION */}
        {!user ? (
          <div className="login-container" style={{flex: 1, display: 'flex', minHeight: 'calc(100vh - 73px)', background: '#050c09'}}>

            {/* ── LEFT PANEL (HIDDEN ON MOBILE) ───────────────── */}
            <div className="login-left-panel" style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(160deg, #071a0e 0%, #0e2d1c 35%, #122b1e 65%, #071610 100%)',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '52px 60px',
            }}>
              {/* Decorative orbs */}
              <div style={{position:'absolute',top:'-80px',left:'-80px',width:'400px',height:'400px',borderRadius:'50%',background:'radial-gradient(circle, rgba(0,230,118,0.15) 0%, transparent 70%)',pointerEvents:'none'}}></div>
              <div style={{position:'absolute',bottom:'-100px',right:'-60px',width:'360px',height:'360px',borderRadius:'50%',background:'radial-gradient(circle, rgba(64,196,255,0.1) 0%, transparent 70%)',pointerEvents:'none'}}></div>
              <div style={{position:'absolute',top:'45%',left:'50%',width:'280px',height:'280px',borderRadius:'50%',background:'radial-gradient(circle, rgba(0,230,118,0.08) 0%, transparent 70%)',pointerEvents:'none',transform:'translate(-50%,-50%)'}}></div>
              {/* Dot grid */}
              <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none'}}></div>

              {/* Logo */}
              <div style={{position:'relative',zIndex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'64px'}}>
                  <div style={{width:'46px',height:'46px',borderRadius:'14px',background:'linear-gradient(135deg,#1f5c3a,#52B788)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(82,183,136,0.3)'}}>
                    <Trash2 size={22} style={{color:'#fff'}} />
                  </div>
                  <div>
                    <div style={{color:'#fff',fontWeight:800,fontSize:'1.15rem',letterSpacing:'-0.02em',lineHeight:1}}>BulkWaste</div>
                    <div style={{color:'#52B788',fontWeight:700,fontSize:'0.65rem',letterSpacing:'0.12em',textTransform:'uppercase',marginTop:'2px'}}>Management Hub</div>
                  </div>
                </div>

                <div style={{marginBottom:'12px',display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(82,183,136,0.1)',border:'1px solid rgba(82,183,136,0.25)',borderRadius:'999px',padding:'5px 14px'}}>
                  <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#52B788',display:'inline-block',boxShadow:'0 0 0 3px rgba(82,183,136,0.25)'}}></span>
                  <span style={{color:'#52B788',fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>System Online</span>
                </div>

                <h1 style={{color:'#fff',fontWeight:800,fontSize:'2.6rem',lineHeight:1.15,letterSpacing:'-0.03em',marginBottom:'18px'}}>
                  The smarter way<br/>to manage<br/>
                  <span style={{background:'linear-gradient(90deg,#52B788,#4895EF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>bulk waste.</span>
                </h1>
                <p style={{color:'rgba(255,255,255,0.45)',fontSize:'0.88rem',lineHeight:1.7,maxWidth:'340px'}}>
                  Built for municipalities, housing societies, transporters, and processing plants — all on one unified platform.
                </p>
              </div>

              {/* Stats row */}
              <div style={{position:'relative',zIndex:1}}>


                {/* Testimonial / caption */}
                <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px 22px'}}>
                  <p style={{color:'rgba(255,255,255,0.6)',fontSize:'0.82rem',lineHeight:1.65,fontStyle:'italic',marginBottom:'14px'}}>
                    "Manages our entire waste pipeline — from collection requests to plant processing — without any external database setup."
                  </p>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#2D6A4F,#52B788)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,color:'#fff'}}>A</div>
                    <div>
                      <div style={{color:'rgba(255,255,255,0.8)',fontWeight:700,fontSize:'0.78rem'}}>Administrator</div>
                      <div style={{color:'rgba(255,255,255,0.35)',fontSize:'0.68rem'}}>System Admin Account</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL ────────────────────────────────── */}
            <div className="login-right-panel" style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 32px',
              background: 'linear-gradient(160deg, #070f0a 0%, #0a1510 100%)',
              position: 'relative',
              overflowY: 'auto',
            }}>
              {/* subtle bg accent */}
              <div style={{position:'absolute',top:0,right:0,width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(0,230,118,0.06),transparent 70%)',pointerEvents:'none'}}></div>
              <div style={{position:'absolute',bottom:0,left:0,width:'240px',height:'240px',borderRadius:'50%',background:'radial-gradient(circle,rgba(64,196,255,0.05),transparent 70%)',pointerEvents:'none'}}></div>

              <div style={{width:'100%',maxWidth:'400px',position:'relative',zIndex:1}} className="animate-fade-in">


                {/* Card */}
                <div style={{background:'rgba(13,26,18,0.85)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderRadius:'20px',border:'1px solid rgba(0,230,118,0.15)',boxShadow:'0 0 0 1px rgba(0,230,118,0.05), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,230,118,0.08)',padding:'40px 40px 36px'}}>

                  {/* Title block */}
                  <div style={{marginBottom:'28px'}}>
                    <h2 style={{fontWeight:800,fontSize:'1.55rem',letterSpacing:'-0.025em',color:'#e8f5e9',marginBottom:'6px',lineHeight:1.2}}>
                      {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
                    </h2>
                    <p style={{fontSize:'0.82rem',color:'#558b6e',lineHeight:1.5}}>
                      {isRegisterMode
                        ? 'Register your organization to get started'
                        : 'Enter your credentials to access the dashboard'}
                    </p>
                  </div>

              {!isRegisterMode ? (
                <form onSubmit={handleLoginSubmit} style={{display:'flex',flexDirection:'column',gap:'18px'}}>

                  {/* Username */}
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#558b6e'}}>Username</label>
                    <div style={{position:'relative'}}>
                      <User size={14} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#558b6e'}} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. admin, generator, driver"
                        value={loginFields.username}
                        onChange={e => setLoginFields({ ...loginFields, username: e.target.value })}
                        style={{paddingLeft:'2.2rem',background:'rgba(0,0,0,0.3)',border:'1.5px solid rgba(0,230,118,0.15)',borderRadius:'10px',fontSize:'0.875rem',color:'#e8f5e9',width:'100%',outline:'none',transition:'all 0.2s'}}
                        onFocus={e => { e.target.style.borderColor='#00e676'; e.target.style.boxShadow='0 0 0 3px rgba(0,230,118,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor='rgba(0,230,118,0.15)'; e.target.style.boxShadow='none'; }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#558b6e'}}>Password</label>
                      <span style={{fontSize:'0.72rem',color:'#00e676',fontWeight:600,cursor:'default'}}>Forgot password?</span>
                    </div>
                    <div style={{position:'relative'}}>
                      <Shield size={14} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#558b6e'}} />
                      <input
                        type="password"
                        required
                        placeholder="Enter your password"
                        value={loginFields.password}
                        onChange={e => setLoginFields({ ...loginFields, password: e.target.value })}
                        style={{paddingLeft:'2.2rem',background:'rgba(0,0,0,0.3)',border:'1.5px solid rgba(0,230,118,0.15)',borderRadius:'10px',fontSize:'0.875rem',color:'#e8f5e9',width:'100%',outline:'none',transition:'all 0.2s'}}
                        onFocus={e => { e.target.style.borderColor='#00e676'; e.target.style.boxShadow='0 0 0 3px rgba(0,230,118,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor='rgba(0,230,118,0.15)'; e.target.style.boxShadow='none'; }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <button type="submit" style={{marginTop:'4px',width:'100%',padding:'13px',borderRadius:'10px',background:'linear-gradient(135deg,#00e676,#00b248)',color:'#050c09',fontWeight:800,fontSize:'0.9rem',letterSpacing:'0.02em',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:'0 4px 24px rgba(0,230,118,0.4)',transition:'all 0.2s'}}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 36px rgba(0,230,118,0.6)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow='0 4px 24px rgba(0,230,118,0.4)'; e.currentTarget.style.transform='translateY(0)'; }}
                  >
                    Sign In &nbsp;<Send size={15} />
                  </button>

                  {/* Divider */}
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{flex:1,height:'1px',background:'rgba(0,230,118,0.1)'}}></div>
                    <span style={{fontSize:'0.68rem',color:'#558b6e',fontWeight:600}}>OR</span>
                    <div style={{flex:1,height:'1px',background:'rgba(0,230,118,0.1)'}}></div>
                  </div>

                  {/* Register button */}
                  <button type="button" onClick={() => setIsRegisterMode(true)}
                    style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1.5px solid rgba(0,230,118,0.2)',background:'rgba(0,230,118,0.06)',fontSize:'0.85rem',fontWeight:600,color:'#a5d6a7',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,230,118,0.4)'; e.currentTarget.style.color='#00e676'; e.currentTarget.style.background='rgba(0,230,118,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,230,118,0.2)'; e.currentTarget.style.color='#a5d6a7'; e.currentTarget.style.background='rgba(0,230,118,0.06)'; }}
                  >
                    Register a New Organization
                  </button>

                  {/* Trust line */}
                  <p style={{textAlign:'center',fontSize:'0.68rem',color:'#558b6e',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',marginTop:'-4px'}}>
                    <ShieldCheck size={12} style={{color:'#00e676'}} /> Secured with JWT authentication
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} style={{display:'flex',flexDirection:'column',gap:'14px',maxHeight:'440px',overflowY:'auto',paddingRight:'2px'}}>
                  {[
                    {label:'Username', type:'text', ph:'Choose a unique username', key:'username'},
                    {label:'Password', type:'password', ph:'Create a strong password', key:'password'},
                  ].map(f => (
                    <div key={f.key} style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                      <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#475569'}}>{f.label}</label>
                      <input type={f.type} required placeholder={f.ph} value={regFields[f.key]} onChange={e => setRegFields({...regFields,[f.key]:e.target.value})}
                        style={{background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'0.875rem',color:'#1E293B',outline:'none'}}
                        onFocus={e => e.target.style.borderColor='#2D6A4F'} onBlur={e => e.target.style.borderColor='#E2E8F0'}
                      />
                    </div>
                  ))}
                  <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                    <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#475569'}}>Account Role</label>
                    <select value={regFields.role} onChange={e => setRegFields({...regFields, role: e.target.value})} style={{background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'0.875rem',color:'#1E293B',outline:'none'}}>
                      <option value="Generator">User (Waste Generator)</option>
                      <option value="Driver">Transporter / Driver</option>
                      <option value="Operator">Plant Operator</option>
                    </select>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                    <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#475569'}}>Full Name</label>
                    <input type="text" required placeholder="First and Last name" value={regFields.name} onChange={e => setRegFields({...regFields,name:e.target.value})}
                      style={{background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'0.875rem',color:'#1E293B',outline:'none'}}
                      onFocus={e => e.target.style.borderColor='#2D6A4F'} onBlur={e => e.target.style.borderColor='#E2E8F0'}
                    />
                  </div>
                  {regFields.role === 'Generator' && (
                    <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                      <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#475569'}}>Organization Name</label>
                      <input type="text" required placeholder="e.g. Greenwood Housing Society" value={regFields.organizationName} onChange={e => setRegFields({...regFields,organizationName:e.target.value})}
                        style={{background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'0.875rem',color:'#1E293B',outline:'none'}}
                        onFocus={e => e.target.style.borderColor='#2D6A4F'} onBlur={e => e.target.style.borderColor='#E2E8F0'}
                      />
                    </div>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    {[
                      {label:'Contact', type:'text', ph:'+91 98765 43210', key:'contact'},
                      {label:'Email', type:'email', ph:'name@org.com', key:'email'},
                    ].map(f => (
                      <div key={f.key} style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                        <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#475569'}}>{f.label}</label>
                        <input type={f.type} required={f.key==='email'} placeholder={f.ph} value={regFields[f.key]} onChange={e => setRegFields({...regFields,[f.key]:e.target.value})}
                          style={{background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:'10px',fontSize:'0.82rem',color:'#1E293B',outline:'none'}}
                          onFocus={e => e.target.style.borderColor='#2D6A4F'} onBlur={e => e.target.style.borderColor='#E2E8F0'}
                        />
                      </div>
                    ))}
                  </div>
                  {regFields.role === 'Generator' && (
                    <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                      <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#475569'}}>Document Upload</label>
                      <input type="file" onChange={e => setRegFile(e.target.files[0])} className="file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900" />
                    </div>
                  )}
                  <button type="submit" style={{marginTop:'4px',width:'100%',padding:'13px',borderRadius:'10px',background:'linear-gradient(135deg,#1f5c3a,#2D6A4F)',color:'#fff',fontWeight:700,fontSize:'0.9rem',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:'0 4px 14px rgba(45,106,79,0.35)'}}>
                    Submit Registration &nbsp;<Send size={15} />
                  </button>
                  <button type="button" onClick={() => setIsRegisterMode(false)} style={{textAlign:'center',fontSize:'0.78rem',color:'#64748B',fontWeight:600,cursor:'pointer',background:'none',border:'none',textDecoration:'underline'}}>
                    Already have an account? Sign In
                  </button>
                </form>
              )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          
          // ====================================================
          // RENDER USER ROLE DASHBOARDS
          // ====================================================
          <div className="flex-1 flex flex-col md:flex-row md:h-[calc(100vh-73px)] overflow-hidden">
            
            {/* SIDEBAR NAVIGATION PANEL */}
            <aside className="w-full md:w-64 glass border-b md:border-b-0 md:border-r border-white/5 p-4 flex md:flex-col gap-2 md:gap-1.5 shrink-0 overflow-x-auto md:overflow-y-auto">
              
              {user.role === 'Admin' && (
                <>
                  <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`nav-btn ${activeTab === 'overview' ? 'nav-btn-active' : ''}`}
                  >
                    <BarChart3 size={18} /> Overview & Metrics
                  </button>
                  <button 
                    onClick={() => setActiveTab('map')} 
                    className={`nav-btn ${activeTab === 'map' ? 'nav-btn-active' : ''}`}
                  >
                    <MapPin size={18} /> Live GIS Map Tracker
                  </button>
                  <button 
                    onClick={() => setActiveTab('properties')} 
                    className={`nav-btn ${activeTab === 'properties' ? 'nav-btn-active' : ''}`}
                  >
                    <Layers size={18} /> Registered Properties
                  </button>
                  <button 
                    onClick={() => setActiveTab('rates')} 
                    className={`nav-btn ${activeTab === 'rates' ? 'nav-btn-active' : ''}`}
                  >
                    <DollarSign size={18} /> Tariff & Rate Control
                  </button>
                  <button 
                    onClick={() => setActiveTab('categories')} 
                    className={`nav-btn ${activeTab === 'categories' ? 'nav-btn-active' : ''}`}
                  >
                    <Trash2 size={18} /> Waste Category Hubs
                  </button>
                  <button 
                    onClick={() => setActiveTab('approvals')} 
                    className={`nav-btn ${activeTab === 'approvals' ? 'nav-btn-active' : ''}`}
                  >
                    <ShieldCheck size={18} /> Approvals
                  </button>
                  <button 
                    onClick={() => setActiveTab('users')} 
                    className={`nav-btn ${activeTab === 'users' ? 'nav-btn-active' : ''}`}
                  >
                    <User size={18} /> User Management
                  </button>
                  <button 
                    onClick={() => setActiveTab('requests')} 
                    className={`nav-btn ${activeTab === 'requests' ? 'nav-btn-active' : ''}`}
                  >
                    <Layers size={18} /> Pickup Dispatches
                  </button>
                  <button 
                    onClick={() => setActiveTab('payments')} 
                    className={`nav-btn ${activeTab === 'payments' ? 'nav-btn-active' : ''}`}
                  >
                    <DollarSign size={18} /> Payment Section
                  </button>
                  <button 
                    onClick={() => setActiveTab('leaves')} 
                    className={`nav-btn ${activeTab === 'leaves' ? 'nav-btn-active' : ''}`}
                  >
                    <Calendar size={18} /> Driver Leaves {driverLeaves.filter(l => l.status === 'Pending').length > 0 && <span className="badge badge-danger text-[9px] px-1.5 py-0.5 ml-auto">{driverLeaves.filter(l => l.status === 'Pending').length}</span>}
                  </button>
                  <button 
                    onClick={() => setActiveTab('vehicles')} 
                    className={`nav-btn ${activeTab === 'vehicles' ? 'nav-btn-active' : ''}`}
                  >
                    <Truck size={18} /> Fleet Inventory
                  </button>
                  <button 
                    onClick={() => setActiveTab('plants')} 
                    className={`nav-btn ${activeTab === 'plants' ? 'nav-btn-active' : ''}`}
                  >
                    <Activity size={18} /> Processing Plants
                  </button>
                  <button 
                    onClick={() => setActiveTab('complaints')} 
                    className={`nav-btn ${activeTab === 'complaints' ? 'nav-btn-active' : ''}`}
                  >
                    <ShieldAlert size={18} /> Support Tickets
                  </button>
                  <button 
                    onClick={() => setActiveTab('activities')} 
                    className={`nav-btn ${activeTab === 'activities' ? 'nav-btn-active' : ''}`}
                  >
                    <Clock size={18} /> Activity Logs
                  </button>
                  <button 
                    onClick={() => setActiveTab('marketplace')} 
                    className={`nav-btn ${activeTab === 'marketplace' ? 'nav-btn-active' : ''}`}
                  >
                    <ShoppingBag size={18} /> OLX Marketplace
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`nav-btn ${activeTab === 'profile' ? 'nav-btn-active' : ''}`}
                  >
                    <User size={18} /> My Profile
                  </button>
                </>
              )}

              {user.role === 'Generator' && (
                <>
                  <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`nav-btn ${activeTab === 'overview' ? 'nav-btn-active' : ''}`}
                  >
                    <User size={18} /> Properties Info
                  </button>
                  <button 
                    onClick={() => setActiveTab('requests')} 
                    className={`nav-btn ${activeTab === 'requests' ? 'nav-btn-active' : ''}`}
                  >
                    <Layers size={18} /> Pickup Requests
                  </button>
                  <button 
                    onClick={() => setActiveTab('complaints')} 
                    className={`nav-btn ${activeTab === 'complaints' ? 'nav-btn-active' : ''}`}
                  >
                    <AlertCircle size={18} /> File Complaints
                  </button>
                  <button 
                    onClick={() => setActiveTab('marketplace')} 
                    className={`nav-btn ${activeTab === 'marketplace' ? 'nav-btn-active' : ''}`}
                  >
                    <ShoppingBag size={18} /> OLX Marketplace
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`nav-btn ${activeTab === 'profile' ? 'nav-btn-active' : ''}`}
                  >
                    <User size={18} /> My Profile
                  </button>
                </>
              )}

              {user.role === 'Driver' && (
                <>
                  <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`nav-btn ${activeTab === 'overview' ? 'nav-btn-active' : ''}`}
                  >
                    <Layers size={18} /> Assigned Pickups
                  </button>
                  <button 
                    onClick={() => setActiveTab('leaves')} 
                    className={`nav-btn ${activeTab === 'leaves' ? 'nav-btn-active' : ''}`}
                  >
                    <Calendar size={18} /> Apply Leave
                  </button>
                  <button 
                    onClick={() => setActiveTab('maps')} 
                    className={`nav-btn ${activeTab === 'maps' ? 'nav-btn-active' : ''}`}
                  >
                    <Navigation size={18} /> Route GPS Navigator
                  </button>
                  <button 
                    onClick={() => setActiveTab('marketplace')} 
                    className={`nav-btn ${activeTab === 'marketplace' ? 'nav-btn-active' : ''}`}
                  >
                    <ShoppingBag size={18} /> OLX Marketplace
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`nav-btn ${activeTab === 'profile' ? 'nav-btn-active' : ''}`}
                  >
                    <User size={18} /> My Profile
                  </button>
                </>
              )}

              {user.role === 'Operator' && (
                <>
                  <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`nav-btn ${activeTab === 'overview' ? 'nav-btn-active' : ''}`}
                  >
                    <Activity size={18} /> Waste Intake Log
                  </button>
                  <button 
                    onClick={() => setActiveTab('plants')} 
                    className={`nav-btn ${activeTab === 'plants' ? 'nav-btn-active' : ''}`}
                  >
                    <Settings size={18} /> Plant Capacities
                  </button>
                  <button 
                    onClick={() => setActiveTab('marketplace')} 
                    className={`nav-btn ${activeTab === 'marketplace' ? 'nav-btn-active' : ''}`}
                  >
                    <ShoppingBag size={18} /> OLX Marketplace
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`nav-btn ${activeTab === 'profile' ? 'nav-btn-active' : ''}`}
                  >
                    <User size={18} /> My Profile
                  </button>
                </>
              )}
            </aside>

            {/* DASHBOARD GRID CONTENT */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-73px)]">

              {/* ====================================================
                  MY PROFILE PANEL (all roles)
                  ==================================================== */}
              {activeTab === 'profile' && (
                <div className="animate-fade-in flex flex-col gap-6 max-w-2xl mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">My Profile</h2>
                  </div>

                  {/* Avatar + name card */}
                  <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 text-center" style={{background: 'linear-gradient(135deg, rgba(45,106,79,0.08) 0%, rgba(72,149,239,0.05) 100%)', border: '1px solid rgba(45,106,79,0.2)'}}>
                    {/* Avatar circle */}
                    <div style={{width:'88px',height:'88px',borderRadius:'50%',background:'linear-gradient(135deg,#1f5c3a,#52B788)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.2rem',fontWeight:800,color:'#fff',boxShadow:'0 8px 32px rgba(45,106,79,0.35)'}}>
                      {(user.name || user.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold" style={{letterSpacing:'-0.02em'}}>{user.name || user.username}</h3>
                      <span className="badge badge-info mt-1" style={{fontSize:'0.7rem',padding:'4px 12px'}}>{user.role === 'Generator' ? 'User Module' : user.role}</span>
                    </div>
                    <p className="text-xs text-gray-500 max-w-xs">
                      {user.role === 'Admin' && 'System Administrator — Full platform access and control.'}
                      {user.role === 'Generator' && 'Waste Generator (User Module) — Submit and track waste pickup requests.'}
                      {user.role === 'Driver' && 'Transporter / Driver — Handle assigned pickups and route navigation.'}
                      {user.role === 'Operator' && 'Plant Operator — Manage waste intake and processing capacities.'}
                    </p>
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="glass rounded-2xl p-6 flex flex-col gap-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-2">Edit Profile Details</h4>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400">Full Name</label>
                        <input 
                          type="text" 
                          required 
                          value={editProfileFields.name} 
                          onChange={e => setEditProfileFields({ ...editProfileFields, name: e.target.value })} 
                          className="py-2 px-3 text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400">Email Address</label>
                        <input 
                          type="email" 
                          required 
                          value={editProfileFields.email} 
                          onChange={e => setEditProfileFields({ ...editProfileFields, email: e.target.value })} 
                          className="py-2 px-3 text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400">Contact Number</label>
                        <input 
                          type="text" 
                          required 
                          value={editProfileFields.contact} 
                          onChange={e => setEditProfileFields({ ...editProfileFields, contact: e.target.value })} 
                          className="py-2 px-3 text-sm"
                        />
                      </div>

                      {user.role === 'Generator' && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-gray-400">Organization Name</label>
                          <input 
                            type="text" 
                            required 
                            value={editProfileFields.organizationName} 
                            onChange={e => setEditProfileFields({ ...editProfileFields, organizationName: e.target.value })} 
                            className="py-2 px-3 text-sm"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 justify-end mt-4">
                        <button 
                          type="button" 
                          onClick={() => setIsEditingProfile(false)} 
                          className="btn-secondary py-2 px-4 text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn-primary py-2 px-4 text-xs font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Info grid */}
                      <div className="glass rounded-2xl p-6 flex flex-col gap-0">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Account Information</h4>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditProfileFields({
                                name: user.name || '',
                                email: user.email || '',
                                contact: user.contact || '',
                                organizationName: user.organizationName || ''
                              });
                              setIsEditingProfile(true);
                            }}
                            className="btn-secondary py-1 px-3 text-xs font-bold hover:border-emerald-500 hover:text-emerald-400"
                          >
                            Edit Profile
                          </button>
                        </div>
                        {[
                          { icon: <User size={16}/>, label: 'Username', value: user.username },
                          { icon: <User size={16}/>, label: 'Full Name', value: user.name || '—' },
                          { icon: <ShieldCheck size={16}/>, label: 'Role', value: user.role === 'Generator' ? 'User Module' : user.role },
                          { icon: <Activity size={16}/>, label: 'Email', value: user.email || '—' },
                          { icon: <Bell size={16}/>, label: 'Contact', value: user.contact || '—' },
                          { icon: <Layers size={16}/>, label: 'Organization', value: user.organizationName || (user.role === 'Admin' ? 'BulkWaste Management Hub' : '—') },
                          { icon: <CheckCircle size={16}/>, label: 'Account Status', value: user.status === 'approved' || user.role === 'Admin' ? 'Active & Approved' : (user.status || 'Pending') },
                          { icon: <Clock size={16}/>, label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : 'N/A' },
                        ].map((row, i) => (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 0',borderBottom: i < 7 ? '1px solid var(--border-color)' : 'none'}}>
                            <div style={{width:'32px',height:'32px',borderRadius:'9px',background:'rgba(45,106,79,0.12)',border:'1px solid rgba(45,106,79,0.18)',display:'flex',alignItems:'center',justifyContent:'center',color:'#52B788',flexShrink:0}}>
                              {row.icon}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--text-muted)',marginBottom:'2px'}}>{row.label}</div>
                              <div style={{fontSize:'0.9rem',fontWeight:600,color: row.label === 'Account Status' && (row.value === 'Active & Approved') ? '#10B981' : 'var(--text-primary)'}}>{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Security note */}
                  <div className="glass rounded-2xl p-5 flex items-center gap-4">
                    <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(72,149,239,0.1)',border:'1px solid rgba(72,149,239,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#4895EF',flexShrink:0}}>
                      <ShieldCheck size={20}/>
                    </div>
                    <div>
                      <div className="text-xs font-bold mb-0.5">Secured Account</div>
                      <div className="text-xs text-gray-500">Your account is protected with JWT authentication. Contact an admin to update your details.</div>
                    </div>
                  </div>
                </div>
              )}


              {/* ====================================================
                  ADMINISTRATOR DASHBOARD SCREENS
                  ==================================================== */}
              {user.role === 'Admin' && (
                <div className="animate-fade-in flex flex-col gap-6">
                  
                  {/* OVERVIEW PANEL */}
                  {activeTab === 'overview' && analytics && (
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Central Analytical Command</h2>
                        <div className="flex gap-2">
                          <button onClick={() => handleExportCSV('waste')} className="btn-secondary py-1.5 px-3 text-xs">
                            <FileDown size={14} /> Waste (CSV)
                          </button>
                          <button onClick={() => handleExportCSV('revenue')} className="btn-secondary py-1.5 px-3 text-xs">
                            <FileDown size={14} /> Revenue (CSV)
                          </button>
                        </div>
                      </div>

                      {/* Stat Metrics Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass glass-interactive admin-glow-green p-5 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-950 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                            <Trash2 size={22} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Waste Scale Tonnage</span>
                            <p className="text-xl font-bold text-white">{analytics.metrics.totalWasteCollected} Tons</p>
                          </div>
                        </div>

                        <div className="glass glass-interactive admin-glow-indigo p-5 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                            <DollarSign size={22} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Total Billing Revenue</span>
                            <p className="text-xl font-bold text-white">₹{analytics.metrics.totalRevenue}</p>
                          </div>
                        </div>

                        <div className="glass glass-interactive admin-glow-cyan p-5 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-cyan-950 rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/10">
                            <Layers size={22} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Pending Pickups</span>
                            <p className="text-xl font-bold text-white">{analytics.metrics.pendingRequests}</p>
                          </div>
                        </div>

                        <div className="glass glass-interactive admin-glow-amber p-5 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-950 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/10">
                            <Truck size={22} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Operational Fleet</span>
                            <p className="text-xl font-bold text-white">{analytics.metrics.activeVehicles}</p>
                          </div>
                        </div>
                      </div>

                      {/* Charts Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass p-6 rounded-2xl border border-white/5">
                          <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">Monthly Waste Log (Tons)</h3>
                          <SimpleBarChart data={analytics.monthlyStats} />
                        </div>
                        <div className="glass p-6 rounded-2xl border border-white/5">
                          <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">Waste Segregation Composition</h3>
                          <SimplePieChart data={analytics.segregationStats} />
                        </div>
                      </div>

                      {/* Plant Capacity Bars */}
                      <div className="glass p-6 rounded-2xl border border-white/5">
                        <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">Real-time Processing Capacities</h3>
                        <div className="flex flex-col gap-4">
                          {analytics.plantCapacityRates.map((plant, idx) => (
                            <div key={idx} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-gray-300">{plant.name}</span>
                                <span className="text-white">{plant.currentLoad}t / {plant.capacity}t ({plant.percent}%)</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${plant.percent > 85 ? 'bg-red-500' : plant.percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(plant.percent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LIVE GIS MAP TRACKER TAB (ADMIN) */}
                  {activeTab === 'map' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                            <MapPin size={22} /> Live Spatial GIS Command Map
                          </h2>
                          <p className="text-xs text-gray-400">
                            Real-time tracking of registered properties (🏢), vehicle fleet (🚛), and processing plants (🏭).
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Properties ({properties.filter(p => p.lat && p.lng).length})
                          </span>
                          <span className="flex items-center gap-1.5 text-cyan-400">
                            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span> Vehicles ({vehicles.filter(v => v.lat && v.lng).length})
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Plants ({plants.filter(p => p.lat && p.lng).length})
                          </span>
                        </div>
                      </div>

                      {/* Map Container */}
                      <div className="glass p-2 rounded-2xl border border-white/5 shadow-xl">
                        <LeafletMap 
                          height="520px"
                          properties={properties}
                          vehicles={vehicles}
                          plants={plants}
                          zoom={12}
                          showSearch={true}
                          showLiveLocation={true}
                        />
                      </div>

                      {/* Summary list below map */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-4 rounded-xl border border-white/5">
                          <h3 className="font-bold text-sm text-emerald-400 mb-2">Registered Properties</h3>
                          <div className="max-h-40 overflow-y-auto flex flex-col gap-2">
                            {properties.map(p => (
                              <div key={p.id} className="text-xs p-2 rounded bg-white/2 border border-white/5 flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-white">{p.name}</div>
                                  <div className="text-[10px] text-gray-400">{p.address}</div>
                                </div>
                                <span className={`badge ${p.lat && p.lng ? 'badge-success' : 'badge-pending'}`}>
                                  {p.lat && p.lng ? 'Mapped' : 'No GPS'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="glass p-4 rounded-xl border border-white/5">
                          <h3 className="font-bold text-sm text-cyan-400 mb-2">Fleet Vehicles</h3>
                          <div className="max-h-40 overflow-y-auto flex flex-col gap-2">
                            {vehicles.map(v => (
                              <div key={v.id} className="text-xs p-2 rounded bg-white/2 border border-white/5 flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-white">{v.licensePlate} ({v.type})</div>
                                  <div className="text-[10px] text-gray-400">Status: {v.status}</div>
                                </div>
                                <span className={`badge ${v.lat && v.lng ? 'badge-info' : 'badge-pending'}`}>
                                  {v.lat && v.lng ? 'Live GPS' : 'No GPS'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="glass p-4 rounded-xl border border-white/5">
                          <h3 className="font-bold text-sm text-amber-400 mb-2">Processing Facilities</h3>
                          <div className="max-h-40 overflow-y-auto flex flex-col gap-2">
                            {plants.map(pl => (
                              <div key={pl.id} className="text-xs p-2 rounded bg-white/2 border border-white/5 flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-white">{pl.name}</div>
                                  <div className="text-[10px] text-gray-400">Cap: {pl.currentLoad}/{pl.capacity}t</div>
                                </div>
                                <span className={`badge ${pl.lat && pl.lng ? 'badge-success' : 'badge-pending'}`}>
                                  {pl.lat && pl.lng ? 'Mapped' : 'No GPS'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REGISTERED PROPERTIES SECTION (ADMIN) */}
                  {activeTab === 'properties' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                            <Layers size={22} /> System Registered Properties
                          </h2>
                          <p className="text-xs text-gray-400">
                            Complete directory of all registered generator properties across Udupi District.
                          </p>
                        </div>
                        <span className="badge badge-success px-3 py-1 text-xs">
                          Total: {properties.length} Properties
                        </span>
                      </div>

                      {properties.length === 0 ? (
                        <div className="glass p-12 text-center text-gray-500 rounded-2xl border border-white/5 italic">
                          No properties registered in the system yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {properties.map(p => (
                            <div key={p.id} className="glass p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-bold text-base text-white">{p.name}</h3>
                                  <span className="badge badge-info py-0.5 text-[11px]">{p.type}</span>
                                </div>
                                <p className="text-xs text-gray-300 flex items-center gap-1.5 mb-2">
                                  <MapPin size={14} className="text-emerald-400 shrink-0" /> {p.address}
                                </p>
                                {p.details && (
                                  <p className="text-xs text-gray-400 bg-white/2 p-2 rounded-lg border border-white/5 mb-2">
                                    {p.details}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[11px]">
                                <span className="text-gray-500 font-mono">ID: {p.id}</span>
                                <span className={`badge ${p.lat && p.lng ? 'badge-success' : 'badge-pending'} text-[10px]`}>
                                  {p.lat && p.lng ? `📍 ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : 'No GPS Pinned'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TARIFF & RATE CONTROL SECTION (ADMIN) */}
                  {activeTab === 'rates' && pricingSettings && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                            <DollarSign size={22} /> System Tariff & Rate Control
                          </h2>
                          <p className="text-xs text-gray-400">
                            Manage base hub location, transport distance free-tiers, per-km transport rates, and waste category rates.
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const updated = await api.updateSettings(pricingSettings);
                              setPricingSettings(updated);
                              showToast('System tariff & rates updated successfully!', 'success');
                            } catch (err) {
                              showToast(err.message, 'error');
                            }
                          }}
                          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2"
                        >
                          <CheckCircle size={16} /> Save Tariff Settings
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Transport & Distance Rules */}
                        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                          <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <Truck size={16} /> Transport & Distance Rules
                          </h3>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-300">Base Transport Hub Name</label>
                              <input 
                                type="text"
                                value={pricingSettings.baseHubLocation?.name || 'Malpe, Udupi'}
                                onChange={e => setPricingSettings({
                                  ...pricingSettings,
                                  baseHubLocation: { ...pricingSettings.baseHubLocation, name: e.target.value }
                                })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-300">Free Transport Distance (Km)</label>
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={pricingSettings.freeTransportKm}
                                  onChange={e => setPricingSettings({ ...pricingSettings, freeTransportKm: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="text-[10px] text-emerald-400">First 1 km is FREE</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-300">Rate per Extra Km (₹)</label>
                                <input 
                                  type="number"
                                  step="1"
                                  value={pricingSettings.perKmTransportRate}
                                  onChange={e => setPricingSettings({ ...pricingSettings, perKmTransportRate: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="text-[10px] text-gray-400">₹15 per next km</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Waste Pickup & Category Rates */}
                        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                          <h3 className="font-bold text-sm text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <Trash2 size={16} /> Waste Pickup Category Rates
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-300">Organic Base Fee (₹)</label>
                              <input 
                                type="number"
                                value={pricingSettings.organicWasteBaseRate}
                                onChange={e => setPricingSettings({ ...pricingSettings, organicWasteBaseRate: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-emerald-400 font-bold">Organic Weight Rate (₹/Ton)</label>
                              <input 
                                type="number"
                                value={pricingSettings.organicPickupWeightRate}
                                onChange={e => setPricingSettings({ ...pricingSettings, organicPickupWeightRate: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="text-[10px] text-emerald-400">₹10 per ton / weight unit</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-300">Recyclable Waste Rate (₹/Ton)</label>
                              <input 
                                type="number"
                                value={pricingSettings.recyclableRate}
                                onChange={e => setPricingSettings({ ...pricingSettings, recyclableRate: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-gray-300">Hazardous Waste Rate (₹/Ton)</label>
                              <input 
                                type="number"
                                value={pricingSettings.hazardousRate}
                                onChange={e => setPricingSettings({ ...pricingSettings, hazardousRate: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Category Decomposition Threshold Settings */}
                        <div className="glass p-6 rounded-2xl border border-amber-500/20 flex flex-col gap-4">
                          <h3 className="font-bold text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldAlert size={16} /> Waste Decomposition Weight Thresholds (Alert Limit)
                          </h3>
                          <p className="text-xs text-gray-400">
                            Set maximum weight threshold (Default: 10 Tons). System will popup alert notifications to Admin when category total reaches this limit.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {['Organic', 'Recyclable', 'Hazardous', 'E-waste', 'Construction', 'Other'].map(cat => (
                              <div key={cat} className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <label className="text-xs font-bold text-white flex justify-between">
                                  <span>{cat}</span>
                                  <span className="text-[10px] text-amber-400">Tons</span>
                                </label>
                                <input 
                                  type="number"
                                  step="0.5"
                                  value={pricingSettings.wasteThresholds?.[cat] !== undefined ? pricingSettings.wasteThresholds[cat] : 10}
                                  onChange={e => setPricingSettings({
                                    ...pricingSettings,
                                    wasteThresholds: {
                                      ...(pricingSettings.wasteThresholds || {}),
                                      [cat]: parseFloat(e.target.value) || 0
                                    }
                                  })}
                                  className="text-xs py-1 px-2"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* WASTE CATEGORY HUBS & THRESHOLDS SCREEN */}
                  {activeTab === 'categories' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Trash2 size={22} className="text-emerald-400" /> Waste Category Management Hubs
                          </h2>
                          <p className="text-xs text-gray-400">
                            View separate pages for each waste category, monitor current weight vs admin thresholds (default 10 tons), and trigger decomposition alerts.
                          </p>
                        </div>
                      </div>

                      {/* Category Selection Tabs */}
                      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
                        {['Organic', 'Recyclable', 'Hazardous', 'E-waste', 'Construction', 'Other'].map(cat => {
                          const catReqs = requests.filter(r => r.wasteType === cat && (r.status === 'Collected' || r.status === 'Completed'));
                          const catWeight = catReqs.reduce((sum, r) => sum + (r.weight || r.wasteQuantity || 0), 0);
                          const threshold = pricingSettings?.wasteThresholds?.[cat] !== undefined ? pricingSettings.wasteThresholds[cat] : 10;
                          const isExceeded = catWeight >= threshold;

                          return (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategoryTab(cat)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                                selectedCategoryTab === cat
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                  : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                              }`}
                            >
                              <span>{cat}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${isExceeded ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-white/10 text-gray-300'}`}>
                                {catWeight.toFixed(1)}t / {threshold}t
                              </span>
                              {isExceeded && <ShieldAlert size={14} className="text-amber-400" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Selected Category Sub-Page */}
                      {(() => {
                        const cat = selectedCategoryTab;
                        const catReqs = requests.filter(r => r.wasteType === cat);
                        const collectedReqs = catReqs.filter(r => r.status === 'Collected' || r.status === 'Completed');
                        const currentWeight = collectedReqs.reduce((sum, r) => sum + (r.weight || r.wasteQuantity || 0), 0);
                        const threshold = pricingSettings?.wasteThresholds?.[cat] !== undefined ? pricingSettings.wasteThresholds[cat] : 10;
                        const isExceeded = currentWeight >= threshold;
                        const percentage = Math.min(100, Math.round((currentWeight / threshold) * 100));

                        return (
                          <div className="flex flex-col gap-6">
                            
                            {/* Decompose Alert Banner */}
                            {isExceeded && (
                              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                                    <ShieldAlert size={24} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                                      ⚠️ Decomposition &amp; Processing Alert Triggered!
                                    </h4>
                                    <p className="text-xs text-amber-200/80 mt-0.5">
                                      Accumulated {cat} waste ({currentWeight.toFixed(1)} Tons) has crossed the set weight limit of {threshold} Tons. Initiate facility decomposition immediately!
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => showToast(`Decomposition order dispatched to processing plant for ${cat} waste!`, 'success')}
                                  className="btn-primary py-2 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-500 border-amber-500 text-white shrink-0 shadow-lg"
                                >
                                  Decompose Now
                                </button>
                              </div>
                            )}

                            {/* Category Overview Stats & Meter */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total {cat} Pickups</span>
                                <span className="text-2xl font-bold text-white">{catReqs.length} Orders</span>
                                <span className="text-xs text-emerald-400 font-semibold">{collectedReqs.length} Collected / Completed</span>
                              </div>

                              <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Accumulated Weight</span>
                                <span className="text-2xl font-bold text-emerald-400 font-mono">{currentWeight.toFixed(1)} Tons</span>
                                <span className="text-xs text-gray-400">Admin Threshold Limit: <span className="font-bold text-white">{threshold} Tons</span></span>
                              </div>

                              <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-3 justify-center">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-300">Threshold Capacity Utilization</span>
                                  <span className={`font-mono font-bold ${isExceeded ? 'text-amber-400' : 'text-emerald-400'}`}>{percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-white/10 p-0.5">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-gradient-to-r from-amber-500 to-red-500 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Category Orders Table */}
                            <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                  <Trash2 size={16} className="text-emerald-400" /> Dedicated {cat} Waste Orders Log
                                </h3>
                                <span className="text-xs text-gray-400">{catReqs.length} Requests Found</span>
                              </div>
                              <div className="table-container">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Reference ID</th>
                                      <th>Generator / Property</th>
                                      <th>Est. Tonnage</th>
                                      <th>Actual Weight</th>
                                      <th>Scheduled Date</th>
                                      <th>Status</th>
                                      <th className="text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {catReqs.length === 0 ? (
                                      <tr>
                                        <td colSpan="7" className="text-center text-xs text-gray-500 italic py-8">
                                          No pickup orders logged for {cat} waste yet.
                                        </td>
                                      </tr>
                                    ) : (
                                      catReqs.map(r => (
                                        <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                          <td className="font-mono text-xs text-emerald-400 font-bold">{r.id}</td>
                                          <td>
                                            <div className="font-bold text-sm text-white">{r.generatorName}</div>
                                            <div className="text-[10px] text-gray-400">{r.propertyName} - {r.propertyAddress}</div>
                                          </td>
                                          <td className="font-semibold text-white">{r.wasteQuantity}t</td>
                                          <td className="font-semibold text-emerald-400 font-mono">{r.weight > 0 ? `${r.weight}t` : 'Pending'}</td>
                                          <td className="text-xs">{r.scheduledDate}</td>
                                          <td>
                                            <span className={`badge ${r.status === 'Pending' ? 'badge-pending' : r.status === 'Assigned' ? 'badge-assigned' : r.status === 'Collected' ? 'badge-collected' : 'badge-completed'}`}>
                                              {r.status}
                                            </span>
                                          </td>
                                          <td className="text-right">
                                            <button
                                              onClick={() => setViewOrderModalReq(r)}
                                              className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1 border-white/10 hover:border-emerald-500/40 hover:text-emerald-400"
                                            >
                                              <FileText size={13} /> View Order
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* APPROVALS TAB */}
                  {activeTab === 'approvals' && (
                    <div className="flex flex-col gap-6">
                      <div>
                        <h2 className="text-xl font-bold">Registration Approvals</h2>
                        <p className="text-xs text-gray-400">Review pending user registrations and activate or suspend their accounts.</p>
                      </div>

                      {/* Pending Approvals */}
                      <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                          <Clock size={14} /> Pending Approvals ({usersList.filter(u => u.status === 'pending').length})
                        </h3>
                        <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                          <div className="table-container">
                            <table>
                              <thead>
                                <tr>
                                  <th>Applicant</th>
                                  <th>Role</th>
                                  <th>Organization</th>
                                  <th>Document</th>
                                  <th>Submitted</th>
                                  <th className="text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {usersList.filter(u => u.status === 'pending').length === 0 ? (
                                  <tr>
                                    <td colSpan="6" className="text-center text-xs text-gray-400 italic py-10">
                                      No pending approvals at this time.
                                    </td>
                                  </tr>
                                ) : (
                                  usersList.filter(u => u.status === 'pending').map(u => (
                                    <tr key={u.id}>
                                      <td>
                                        <div className="font-bold">{u.name}</div>
                                        <div className="text-[10px] text-gray-400">@{u.username} | {u.email}</div>
                                      </td>
                                      <td>
                                        <span className="badge badge-pending">{u.role}</span>
                                      </td>
                                      <td className="text-sm">{u.organizationName || 'N/A'}</td>
                                      <td>
                                        {u.docs && u.docs.length > 0 ? (
                                          <a
                                            href={`http://localhost:5000/uploads/${u.docs[0]}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-emerald-400 underline font-semibold flex items-center gap-1 hover:text-emerald-300"
                                          >
                                            <FileText size={12} /> View Doc
                                          </a>
                                        ) : (
                                          <span className="text-xs text-gray-500 italic">None</span>
                                        )}
                                      </td>
                                      <td className="text-xs text-gray-400">Pending</td>
                                      <td className="text-right">
                                        <div className="flex gap-2 justify-end">
                                          <button onClick={() => handleApproveUser(u.id)} className="btn-primary py-1 px-3 text-xs">
                                            Approve
                                          </button>
                                          <button onClick={() => handleSuspendUser(u.id)} className="btn-secondary py-1 px-3 text-xs hover:border-red-500 hover:text-red-400">
                                            Reject
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Active/Suspended accounts section */}
                      <div className="flex flex-col gap-6">
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                          <CheckCircle size={14} /> Active Accounts ({usersList.filter(u => u.status === 'active').length})
                        </h3>

                        {['Admin', 'Generator', 'Driver', 'Operator'].map(role => {
                          const roleUsers = usersList.filter(u => u.status === 'active' && u.role === role);
                          if (roleUsers.length === 0) return null;
                          const roleDisplay = role === 'Generator' ? 'User Module' : role;
                          return (
                            <div key={role} className="flex flex-col gap-2">
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{roleDisplay}s ({roleUsers.length})</h4>
                              <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                                <div className="table-container">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Contact</th>
                                        <th>Status</th>
                                        <th className="text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {roleUsers.map(u => (
                                        <tr key={u.id}>
                                          <td>
                                            <div className="font-bold text-sm">{u.name}</div>
                                            <div className="text-[10px] text-gray-400">{u.email}</div>
                                          </td>
                                          <td>
                                            <span className={`badge ${u.role === 'Admin' ? 'badge-info' : u.role === 'Generator' ? 'badge-active' : u.role === 'Driver' ? 'badge-assigned' : 'badge-collected'}`}>
                                              {u.role === 'Generator' ? 'User Module' : u.role}
                                            </span>
                                          </td>
                                          <td className="text-xs">{u.contact || 'N/A'}</td>
                                          <td><span className="badge badge-active">active</span></td>
                                          <td className="text-right">
                                            <div className="flex gap-2 justify-end">
                                              <button onClick={() => setViewUserDetail(u)} className="btn-secondary py-1 px-3 text-xs hover:border-emerald-500 hover:text-emerald-400">
                                                View
                                              </button>
                                              {u.id !== user.id && (
                                                <button onClick={() => handleSuspendUser(u.id)} className="btn-secondary py-1 px-3 text-xs hover:border-amber-500 hover:text-amber-400">
                                                  Suspend
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* USER MANAGEMENT TAB */}
                  {activeTab === 'users' && (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold">User Management</h2>
                          <p className="text-xs text-gray-400">Add, view, and remove all system users: Users, Drivers, and Plant Operators.</p>
                        </div>
                        {/* Filters */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {['All', 'Generator', 'Driver', 'Operator', 'Admin'].map(role => (
                            <button
                              key={role}
                              onClick={() => {
                                setUserRoleFilter(role);
                                setSelectedUser(null);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${userRoleFilter === role ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                            >
                              {role === 'Generator' ? 'User Modules' : `${role}s`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT COLUMN: Add user & list */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                          
                          {/* Add New User Form */}
                          <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                            <h3 className="font-bold text-sm text-gray-300">Create New System User</h3>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">System Role</label>
                                <select
                                  value={newUserFields.role}
                                  onChange={e => setNewUserFields({ ...newUserFields, role: e.target.value })}
                                  className="w-full text-xs"
                                >
                                  <option value="Driver">Transporter / Driver</option>
                                  <option value="Operator">Plant Operator</option>
                                  <option value="Generator">User (Waste Generator)</option>
                                  <option value="Admin">Administrator</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Full Name</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Robert Downey"
                                  value={newUserFields.name}
                                  onChange={e => setNewUserFields({ ...newUserFields, name: e.target.value })}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Username</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Unique login name"
                                  value={newUserFields.username}
                                  onChange={e => setNewUserFields({ ...newUserFields, username: e.target.value })}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Password</label>
                                <input
                                  type="password"
                                  required
                                  placeholder="••••••••"
                                  value={newUserFields.password}
                                  onChange={e => setNewUserFields({ ...newUserFields, password: e.target.value })}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Email Address</label>
                                <input
                                  type="email"
                                  required
                                  placeholder="e.g. name@domain.com"
                                  value={newUserFields.email}
                                  onChange={e => setNewUserFields({ ...newUserFields, email: e.target.value })}
                                  className="w-full text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Contact Number</label>
                                <input
                                  type="text"
                                  placeholder="e.g. +1 555-0100"
                                  value={newUserFields.contact}
                                  onChange={e => setNewUserFields({ ...newUserFields, contact: e.target.value })}
                                  className="w-full text-xs"
                                />
                              </div>
                              {newUserFields.role === 'Generator' && (
                                <div className="flex flex-col gap-1 md:col-span-2">
                                  <label className="text-[10px] uppercase font-bold text-gray-400">Organization Name</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Greenwood Apartments Association"
                                    value={newUserFields.organizationName}
                                    onChange={e => setNewUserFields({ ...newUserFields, organizationName: e.target.value })}
                                    className="w-full text-xs"
                                  />
                                </div>
                              )}
                              <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className="btn-primary py-2 px-4 text-xs">
                                  <Plus size={14} /> Add User
                                </button>
                              </div>
                            </form>
                          </div>

                          {/* Users List Table */}
                          <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                            <div className="table-container">
                              <table>
                                <thead>
                                  <tr>
                                    <th>User Details</th>
                                    <th>Role</th>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {usersList.filter(u => userRoleFilter === 'All' || u.role === userRoleFilter).map(u => (
                                    <tr 
                                      key={u.id} 
                                      onClick={() => setSelectedUser(u)}
                                      className={`cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                    >
                                      <td>
                                        <div className="font-bold text-sm">{u.name}</div>
                                        <div className="text-[10px] text-gray-400">@{u.username} | {u.email}</div>
                                      </td>
                                      <td>
                                        <span className={`badge ${u.role === 'Admin' ? 'badge-info' : u.role === 'Generator' ? 'badge-active' : u.role === 'Driver' ? 'badge-assigned' : 'badge-collected'}`}>
                                          {u.role === 'Generator' ? 'User Module' : u.role}
                                        </span>
                                      </td>
                                      <td className="text-xs">{u.contact || 'N/A'}</td>
                                      <td>
                                        <span className={`badge ${u.status === 'active' ? 'badge-active' : u.status === 'suspended' ? 'badge-failed' : 'badge-pending'}`}>
                                          {u.status}
                                        </span>
                                      </td>
                                      <td className="text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex gap-2 justify-end">
                                          {u.status === 'pending' && (
                                            <button onClick={() => handleApproveUser(u.id)} className="btn-primary py-0.5 px-2 text-[10px]">
                                              Approve
                                            </button>
                                          )}
                                          {u.status === 'active' && u.id !== user.id && (
                                            <button onClick={() => handleSuspendUser(u.id)} className="btn-secondary py-0.5 px-2 text-[10px] hover:border-amber-500 hover:text-amber-400">
                                              Suspend
                                            </button>
                                          )}
                                          {u.id !== user.id && (
                                            <button 
                                              onClick={() => handleDeleteUser(u.id)} 
                                              className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                              title="Remove User"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Details Card */}
                        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                          <h3 className="font-bold text-sm text-gray-300 uppercase tracking-wider">User Profile Details</h3>
                          {selectedUser ? (
                            <div className="flex flex-col gap-4">
                              <div className="border-b border-white/5 pb-4">
                                <h4 className="text-base font-bold">{selectedUser.name}</h4>
                                <span className="text-xs text-emerald-600">@{selectedUser.username}</span>
                              </div>

                              <div className="flex flex-col gap-3 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Role:</span>
                                  <span className="font-semibold">{selectedUser.role === 'Generator' ? 'User Module' : selectedUser.role}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Status:</span>
                                  <span className="font-semibold capitalize">{selectedUser.status}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Email:</span>
                                  <span className="font-semibold">{selectedUser.email}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Contact:</span>
                                  <span className="font-semibold">{selectedUser.contact || 'N/A'}</span>
                                </div>
                                {selectedUser.role === 'Generator' && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Organization:</span>
                                    <span className="font-semibold">{selectedUser.organizationName || 'N/A'}</span>
                                  </div>
                                )}
                              </div>

                              {selectedUser.docs && selectedUser.docs.length > 0 && (
                                <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                                  <span className="text-[10px] uppercase font-bold text-gray-400">Verification Document</span>
                                  <a 
                                    href={`http://localhost:5000/uploads/${selectedUser.docs[0]}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-emerald-400 underline font-semibold flex items-center gap-1.5 hover:text-emerald-300"
                                  >
                                    <FileText size={14} /> View Registered Document
                                  </a>
                                </div>
                              )}

                              <div className="flex gap-2 mt-4 pt-4 border-t border-white/5 justify-end">
                                {selectedUser.status === 'pending' && (
                                  <button onClick={() => handleApproveUser(selectedUser.id)} className="btn-primary py-1.5 px-3 text-xs">
                                    Approve Registration
                                  </button>
                                )}
                                {selectedUser.status === 'active' && selectedUser.id !== user.id && (
                                  <button onClick={() => handleSuspendUser(selectedUser.id)} className="btn-secondary py-1.5 px-3 text-xs hover:border-amber-500 hover:text-amber-400">
                                    Suspend
                                  </button>
                                )}
                                {selectedUser.id !== user.id && (
                                  <button onClick={() => handleDeleteUser(selectedUser.id)} className="btn-secondary py-1.5 px-3 text-xs hover:border-red-500 hover:text-red-400">
                                    Delete Account
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic py-10 text-center">
                              Select a user from the list to view their detailed properties and actions.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SYSTEM ACTIVITY LOGS */}
                  {activeTab === 'activities' && (
                    <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h2 className="text-xl font-bold">System Activity Logs</h2>
                        <p className="text-xs text-gray-400">Audit trail of all administrative and system events.</p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Actor</th>
                            <th>Action</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activities.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center text-xs text-gray-400 italic py-10">
                                No activities recorded in the system yet.
                              </td>
                            </tr>
                          ) : (
                            activities.map(act => (
                              <tr key={act.id} className="hover:bg-white/5">
                                <td className="text-xs text-gray-400 font-medium">
                                  {new Date(act.createdAt).toLocaleString()}
                                </td>
                                <td>
                                  <div className="font-bold text-xs text-white">{act.userName}</div>
                                  <div className="text-[10px] text-gray-400 font-semibold">{act.userRole}</div>
                                </td>
                                <td>
                                  <span className="badge badge-info py-0.5 px-2 text-[10px]">
                                    {act.action}
                                  </span>
                                </td>
                                <td className="text-xs text-gray-300">
                                  {act.details}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PICKUP DISPATCHES */}
                  {activeTab === 'requests' && (
                    <div className="glass border border-white/5 rounded-2xl overflow-hidden animate-fade-in">
                      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h2 className="text-xl font-bold">Bulk Waste Dispatch Center</h2>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Waste Category</th>
                            <th>Est. Tons</th>
                            <th>Target Date</th>
                            <th>Status</th>
                            <th className="text-right">Dispatch Control</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map(r => (
                            <tr key={r.id}>
                              <td>
                                <div className="font-bold">{r.generatorName}</div>
                                <div className="text-xs text-gray-400">{r.propertyName} - {r.propertyAddress}</div>
                              </td>
                              <td>
                                <div className="flex items-center gap-1.5 font-semibold">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                  {r.wasteType}
                                </div>
                              </td>
                              <td className="font-semibold text-white">{r.wasteQuantity}t</td>
                              <td className="text-sm font-semibold">{r.scheduledDate}</td>
                              <td>
                                <span className={`badge ${r.status === 'Pending' ? 'badge-pending' : r.status === 'Assigned' ? 'badge-assigned' : r.status === 'Collected' ? 'badge-collected' : 'badge-completed'}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setViewOrderModalReq(r)}
                                    className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 border-white/10 hover:border-emerald-500/40 hover:text-emerald-400"
                                    title="View Order Details"
                                  >
                                    <FileText size={13} /> Details
                                  </button>
                                  {r.status === 'Pending' ? (
                                    <button 
                                      onClick={() => {
                                        setAssignModalReq(r);
                                        setAssignState({ 
                                          driverId: usersList.find(u => u.role === 'Driver')?.id || '', 
                                          vehicleId: vehicles[0]?.id || '' 
                                        });
                                      }} 
                                      className="btn-primary py-1 px-3 text-xs"
                                    >
                                      Assign Vehicle
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-500 font-semibold italic">Dispatched</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PAYMENT SECTION (ADMIN) */}
                  {activeTab === 'payments' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                            <DollarSign size={22} /> Payment Section & Razorpay Gateway
                          </h2>
                          <p className="text-xs text-gray-400">
                            Manage payment transactions, Razorpay gateway configuration, and billing audit logs.
                          </p>
                        </div>
                        <span className="badge badge-success px-3 py-1 text-xs">
                          Razorpay Key Active
                        </span>
                      </div>

                      {/* Razorpay Integration Key Details Card */}
                      <div className="glass p-6 rounded-2xl border border-emerald-500/30 flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
                              R
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-white tracking-wide">Razorpay Integration Key</h3>
                              <span className="text-xs text-gray-400">Active Razorpay Gateway Account</span>
                            </div>
                          </div>
                          <span className="badge badge-info px-3 py-1 text-xs font-mono">
                            TEST MODE
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Razorpay Key ID</span>
                            <span className="font-mono text-sm font-bold text-emerald-400 select-all">
                              rzp_test_SC7GZQVzAK7jRK
                            </span>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Gateway Status</span>
                            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle size={14} className="text-emerald-400" /> Connected &amp; Accepting Payments
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Total Revenue & Payment Transactions Table */}
                      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 className="text-base font-bold text-white">Payment Transactions & Invoices</h3>
                            <p className="text-xs text-gray-400">List of all user pickup payments and revenue receipts.</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Revenue</span>
                            <span className="text-lg font-mono font-bold text-emerald-400">
                              ₹{requests.filter(r => r.paymentStatus === 'Paid').reduce((sum, r) => sum + (r.amount || 0), 0)}
                            </span>
                          </div>
                        </div>

                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Transaction Ref</th>
                                <th>Generator Property</th>
                                <th>Waste Category</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Razorpay Key</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requests.length === 0 ? (
                                <tr>
                                  <td colSpan="7" className="text-center text-xs text-gray-400 italic py-8">
                                    No payment transactions recorded yet.
                                  </td>
                                </tr>
                              ) : (
                                requests.map(r => (
                                  <tr key={r.id}>
                                    <td className="font-mono text-xs font-semibold text-white">
                                      {r.paymentDetails?.transactionId || `PAY-${r.id}`}
                                    </td>
                                    <td>
                                      <div className="font-bold text-xs text-white">{r.generatorName}</div>
                                      <div className="text-[10px] text-gray-400">{r.propertyName}</div>
                                    </td>
                                    <td>
                                      <span className="badge badge-info py-0.5 px-2 text-[10px]">{r.wasteType}</span>
                                    </td>
                                    <td className="font-mono font-bold text-emerald-400 text-sm">
                                      ₹{r.amount}
                                    </td>
                                    <td className="text-xs text-gray-300">
                                      {r.paymentDetails?.paymentMethod || 'Razorpay Online'}
                                    </td>
                                    <td className="font-mono text-[11px] text-cyan-400">
                                      rzp_test_SC7GZQVzAK7jRK
                                    </td>
                                    <td>
                                      <span className={`badge ${r.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                                        {r.paymentStatus || 'Unpaid'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DRIVER LEAVE APPROVALS CENTER */}
                  {activeTab === 'leaves' && (
                    <div className="glass border border-white/5 rounded-2xl overflow-hidden animate-fade-in">
                      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h2 className="text-xl font-bold text-white">Driver Leave Approvals Center</h2>
                          <p className="text-xs text-gray-400">Review driver leave applications, medical prescriptions, and approve/reject requests.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-pending text-xs font-mono font-bold">
                            Pending: {driverLeaves.filter(l => l.status === 'Pending').length}
                          </span>
                        </div>
                      </div>

                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Driver Name</th>
                              <th>Leave Type</th>
                              <th>Leave Period</th>
                              <th>Reason & Medical Attachment</th>
                              <th>Status</th>
                              <th className="text-right">Action / Review</th>
                            </tr>
                          </thead>
                          <tbody>
                            {driverLeaves.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="text-center text-xs text-gray-400 italic py-10">
                                  No leave requests submitted yet.
                                </td>
                              </tr>
                            ) : (
                              driverLeaves.map(l => (
                                <tr key={l.id} className="hover:bg-white/5">
                                  <td>
                                    <div className="font-bold text-white text-sm">{l.driverName}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">ID: {l.driverId}</div>
                                  </td>
                                  <td>
                                    <span className={`badge ${l.leaveType === 'Medical' ? 'badge-danger' : 'badge-info'} text-xs`}>
                                      {l.leaveType} Leave
                                    </span>
                                  </td>
                                  <td>
                                    <div className="font-bold text-white text-xs">{l.startDate} to {l.endDate}</div>
                                    <div className="text-[10px] text-gray-400">Submitted: {new Date(l.submittedAt).toLocaleDateString()}</div>
                                  </td>
                                  <td>
                                    <div className="text-xs text-gray-300 font-medium max-w-xs">{l.reason}</div>
                                    {l.prescriptionDoc ? (
                                      <a 
                                        href={`http://localhost:5000/uploads/${l.prescriptionDoc}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-bold hover:underline mt-1"
                                      >
                                        <FileText size={12} /> View Medical Prescription
                                      </a>
                                    ) : l.leaveType === 'Medical' ? (
                                      <span className="text-[10px] text-red-400 block mt-0.5">⚠️ No attachment</span>
                                    ) : null}
                                  </td>
                                  <td>
                                    <span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-pending'}`}>
                                      {l.status}
                                    </span>
                                  </td>
                                  <td className="text-right">
                                    {l.status === 'Pending' ? (
                                      <button 
                                        onClick={() => {
                                          setReviewLeaveModal(l);
                                          setAdminLeaveComment('');
                                        }}
                                        className="btn-primary py-1 px-3 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600"
                                      >
                                        Review Application
                                      </button>
                                    ) : (
                                      <div className="text-xs text-gray-400 italic">
                                        {l.adminComment ? `"${l.adminComment}"` : 'Reviewed'}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* FLEET MANAGEMENT */}
                  {activeTab === 'vehicles' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                        <h3 className="font-bold text-base">Add Fleet Vehicle</h3>
                        <form onSubmit={handleAddVehicle} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">License Plate</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. TRK-9900"
                              value={newVehicle.licensePlate} 
                              onChange={e => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Truck Type</label>
                            <select 
                              value={newVehicle.type} 
                              onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value })}
                            >
                              <option value="Compactor">Compactor (Organic/General)</option>
                              <option value="Dumper">Dumper (Construction/Solid)</option>
                              <option value="Roll-off">Roll-off (Industrial)</option>
                              <option value="Standard Truck">Standard Truck</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Tonnage Capacity (Tons)</label>
                            <input 
                              type="number" 
                              required 
                              placeholder="e.g. 15"
                              value={newVehicle.capacity} 
                              onChange={e => setNewVehicle({ ...newVehicle, capacity: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Assign Driver</label>
                            <select 
                              value={newVehicle.driverId} 
                              onChange={e => setNewVehicle({ ...newVehicle, driverId: e.target.value })}
                            >
                              <option value="">Leave Unassigned</option>
                              {usersList.filter(u => u.role === 'Driver').map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                          <button type="submit" className="btn-primary py-2.5 text-sm">
                            <Plus size={16} /> Add Vehicle
                          </button>
                        </form>
                      </div>

                      <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-base">Fleet Operations</h3>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Plate</th>
                                <th>Type</th>
                                <th>Capacity</th>
                                <th>Assigned Driver</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vehicles.map(v => (
                                <tr key={v.id}>
                                  <td className="font-bold text-white">{v.licensePlate}</td>
                                  <td>{v.type}</td>
                                  <td>{v.capacity} Tons</td>
                                  <td>{v.driverName}</td>
                                  <td>
                                    <span className="badge badge-active">{v.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PLANT OPERATIONS */}
                  {activeTab === 'plants' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                        <h3 className="font-bold text-base">Add Disposal Facility</h3>
                        <form onSubmit={handleAddPlant} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Facility Name</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. West Composting Hub"
                              value={newPlant.name} 
                              onChange={e => setNewPlant({ ...newPlant, name: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Geographic Location</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. Zone 4 Outer Bypass"
                              value={newPlant.location} 
                              onChange={e => setNewPlant({ ...newPlant, location: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Processing Capacity (Tons)</label>
                            <input 
                              type="number" 
                              required 
                              placeholder="e.g. 100"
                              value={newPlant.capacity} 
                              onChange={e => setNewPlant({ ...newPlant, capacity: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Facility Type</label>
                            <select 
                              value={newPlant.type} 
                              onChange={e => setNewPlant({ ...newPlant, type: e.target.value })}
                            >
                              <option value="Composting">Composting</option>
                              <option value="Recycling">Recycling</option>
                              <option value="Waste-to-Energy">Waste-to-Energy</option>
                              <option value="Landfill">Landfill</option>
                            </select>
                          </div>
                          <button type="submit" className="btn-primary py-2.5 text-sm">
                            <Plus size={16} /> Register Facility
                          </button>
                        </form>
                      </div>

                      <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-base">Registered Facilities</h3>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Capacity</th>
                                <th>Current Load</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plants.map(p => (
                                <tr key={p.id}>
                                  <td className="font-bold text-white">{p.name}</td>
                                  <td>{p.type}</td>
                                  <td>{p.capacity} Tons</td>
                                  <td>{p.currentLoad} Tons</td>
                                  <td>
                                    <span className="badge badge-active">{p.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMPLAINTS & TICKETS RESOLUTION */}
                  {activeTab === 'complaints' && (
                    <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <h2 className="text-xl font-bold">Support Escalation Center</h2>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Ticket Details</th>
                            <th>User</th>
                            <th>Request Reference</th>
                            <th>Status</th>
                            <th className="text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complaints.map(c => (
                            <tr key={c.id}>
                              <td>
                                <div className="font-bold text-white">{c.title}</div>
                                <div className="text-xs text-gray-400">{c.description}</div>
                              </td>
                              <td>{c.generatorName}</td>
                              <td>{c.requestId}</td>
                              <td>
                                <span className={`badge ${c.status === 'Resolved' ? 'badge-success' : 'badge-pending'}`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="text-right">
                                {c.status === 'Open' ? (
                                  <button 
                                    onClick={() => setResolutionModalComp(c)} 
                                    className="btn-primary py-1 px-3 text-xs"
                                  >
                                    Resolve Ticket
                                  </button>
                                ) : (
                                  <div className="text-xs text-emerald-400 font-semibold italic max-w-xs truncate" title={c.resolutionText}>
                                    Res: {c.resolutionText}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

              {/* ====================================================
                  WASTE GENERATOR DASHBOARD SCREENS
                  ==================================================== */}
              {user.role === 'Generator' && (
                <div className="animate-fade-in flex flex-col gap-6">

                  {/* OVERVIEW / REGISTER PROPERTY */}
                  {activeTab === 'overview' && (
                    <div className="max-w-2xl mx-auto w-full">
                      
                      {/* Register property form */}
                      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                        <h3 className="font-bold text-base">Register Property</h3>
                        <form onSubmit={handleCreateProperty} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Property Name</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. Block A Residential Complex"
                              value={newProp.name} 
                              onChange={e => setNewProp({ ...newProp, name: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Exact Street Address</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                required 
                                placeholder="Street, City, State (e.g. Manipal, Udupi)"
                                value={newProp.address} 
                                onChange={e => setNewProp({ ...newProp, address: e.target.value })} 
                                className="flex-1"
                              />
                              <button 
                                type="button"
                                onClick={async () => {
                                  if (!newProp.address.trim()) {
                                    showToast('Please type an address to search', 'info');
                                    return;
                                  }
                                  try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newProp.address + ' Udupi')}&limit=1`);
                                    const data = await res.json();
                                    if (data && data.length > 0) {
                                      const item = data[0];
                                      const lat = parseFloat(item.lat);
                                      const lng = parseFloat(item.lon);
                                      setNewProp(prev => ({
                                        ...prev,
                                        lat: lat.toFixed(6),
                                        lng: lng.toFixed(6),
                                        address: item.display_name
                                      }));
                                      showToast('Address located on map', 'success');
                                    } else {
                                      showToast('Could not find exact location for this address.', 'error');
                                    }
                                  } catch (err) {
                                    showToast('Geocoding search failed.', 'error');
                                  }
                                }}
                                className="btn-secondary py-2 px-3 text-xs font-semibold shrink-0 flex items-center gap-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Search size={14} /> Find on Map
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Property Category</label>
                            <select 
                              value={newProp.type} 
                              onChange={e => setNewProp({ ...newProp, type: e.target.value })}
                            >
                              <option value="Residential">Residential</option>
                              <option value="Commercial">Commercial</option>
                              <option value="Industrial">Industrial</option>
                              <option value="Institutional">Institutional</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                <Compass size={14} className="text-emerald-400" /> GPS Map Location
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!navigator.geolocation) {
                                    showToast('Geolocation is not supported by your browser', 'error');
                                    return;
                                  }
                                  showToast('Detecting device GPS location...', 'info');
                                  navigator.geolocation.getCurrentPosition(
                                    async (pos) => {
                                      const lat = pos.coords.latitude;
                                      const lng = pos.coords.longitude;
                                      let addr = '';
                                      try {
                                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
                                        const data = await res.json();
                                        if (data && data.display_name) addr = data.display_name;
                                      } catch (e) {}
                                      setNewProp(prev => ({
                                        ...prev,
                                        lat: lat.toFixed(6),
                                        lng: lng.toFixed(6),
                                        address: addr || prev.address
                                      }));
                                      showToast(`Live location detected (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 'success');
                                    },
                                    (err) => {
                                      console.warn("High accuracy geolocation failed, trying standard accuracy...", err);
                                      navigator.geolocation.getCurrentPosition(
                                        async (pos) => {
                                          const lat = pos.coords.latitude;
                                          const lng = pos.coords.longitude;
                                          let addr = '';
                                          try {
                                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
                                            const data = await res.json();
                                            if (data && data.display_name) addr = data.display_name;
                                          } catch (e) {}
                                          setNewProp(prev => ({
                                            ...prev,
                                            lat: lat.toFixed(6),
                                            lng: lng.toFixed(6),
                                            address: addr || prev.address
                                          }));
                                          showToast(`Location detected (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 'success');
                                        },
                                        (fallbackErr) => {
                                          showToast('Location access blocked. Please allow browser permissions.', 'error');
                                        },
                                        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                                      );
                                    },
                                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                                  );
                                }}
                                className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Crosshair size={13} /> Detect Live Location
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number" 
                                step="any"
                                placeholder="Latitude (e.g. 13.3409)"
                                value={newProp.lat} 
                                onChange={e => setNewProp({ ...newProp, lat: e.target.value })} 
                                className="py-1.5 px-3 text-xs"
                              />
                              <input 
                                type="number" 
                                step="any"
                                placeholder="Longitude (e.g. 74.7421)"
                                value={newProp.lng} 
                                onChange={e => setNewProp({ ...newProp, lng: e.target.value })} 
                                className="py-1.5 px-3 text-xs"
                              />
                            </div>
                            <div className="mt-1">
                              <LeafletMap 
                                height="220px"
                                zoom={13}
                                pickerMode={true}
                                selectedLocation={newProp.lat && newProp.lng ? { lat: parseFloat(newProp.lat), lng: parseFloat(newProp.lng) } : null}
                                onLocationSelect={(loc) => {
                                  setNewProp(prev => ({
                                    ...prev,
                                    lat: loc.lat.toFixed(6),
                                    lng: loc.lng.toFixed(6),
                                    address: loc.address || prev.address,
                                    name: prev.name ? prev.name : (loc.address ? loc.address.split(',')[0] : prev.name)
                                  }));
                                }}
                              />
                            </div>
                          </div>

                          <button type="submit" className="btn-primary py-2.5 text-sm">
                            <Plus size={16} /> Register Property
                          </button>
                        </form>
                      </div>

                    </div>
                  )}

                  {/* WASTE REQUEST MANAGEMENT */}
                  {activeTab === 'requests' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Raise request form */}
                      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                        <h3 className="font-bold text-base">Raise Pickup Request</h3>
                        <form onSubmit={handleCreateRequest} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Select Property</label>
                            <select 
                              required
                              value={newRequest.propertyId} 
                              onChange={e => setNewRequest({ ...newRequest, propertyId: e.target.value })}
                            >
                              <option value="">-- Choose Property --</option>
                              {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Waste Category</label>
                            <select 
                              value={newRequest.wasteType} 
                              onChange={e => setNewRequest({ ...newRequest, wasteType: e.target.value })}
                            >
                              <option value="Organic">Organic / Food Waste</option>
                              <option value="Recyclable">Recyclable (Paper/Plastic/Metal)</option>
                              <option value="Hazardous">Hazardous / Chemical</option>
                              <option value="E-waste">E-waste</option>
                              <option value="Construction">Construction Demolition</option>
                              <option value="Other">Other / Solid Mixed</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Estimated Weight (Tons)</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              required 
                              placeholder="e.g. 4.5"
                              value={newRequest.wasteQuantity} 
                              onChange={e => setNewRequest({ ...newRequest, wasteQuantity: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Scheduled Date</label>
                            <input 
                              type="date" 
                              required 
                              value={newRequest.scheduledDate} 
                              onChange={e => setNewRequest({ ...newRequest, scheduledDate: e.target.value })} 
                            />
                          </div>
                          {/* Dynamic Cost Estimate Preview */}
                          {pricingSettings && (
                            <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col gap-1.5 text-xs">
                              <span className="font-bold text-emerald-400 flex items-center justify-between">
                                <span>Estimated Fee Breakdown</span>
                                <span className="text-[10px] text-gray-400">Base Hub: {pricingSettings.baseHubLocation?.name || 'Malpe, Udupi'}</span>
                              </span>
                              <div className="flex justify-between text-gray-400">
                                <span>Transport ({pricingSettings.freeTransportKm}km free, ₹{pricingSettings.perKmTransportRate}/km next):</span>
                                <span className="text-white font-mono">Calculated at pickup</span>
                              </div>
                              <div className="flex justify-between text-gray-400">
                                <span>Organic Weight/Base Rate:</span>
                                <span className="text-emerald-400 font-mono">₹{pricingSettings.organicWasteBaseRate} base + ₹{pricingSettings.organicPickupWeightRate}/ton</span>
                              </div>
                            </div>
                          )}

                          <button type="submit" className="btn-primary py-2.5 text-sm">
                            <Plus size={16} /> Create Request
                          </button>
                        </form>
                      </div>

                      {/* Request history and trackers */}
                      <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-base">Your Active & Historical Pickups</h3>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Category</th>
                                <th>Est. Tons</th>
                                <th>Scheduled</th>
                                <th>Amount</th>
                                <th>Tracking</th>
                                <th className="text-right">Billing</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requests.map(r => (
                                <tr key={r.id}>
                                  <td>
                                    <div className="font-bold text-white">{r.wasteType}</div>
                                    <div className="text-[10px] text-gray-400">{r.propertyName}</div>
                                  </td>
                                  <td className="font-semibold text-white">{r.wasteQuantity}t</td>
                                  <td>{r.scheduledDate}</td>
                                  <td className="font-semibold text-emerald-400">
                                    ₹{r.amount}
                                    {r.distanceKm > 0 && (
                                      <div className="text-[10px] text-gray-400 font-normal">
                                        Dist: {r.distanceKm}km (Trans: ₹{r.transportFee})
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span className={`badge ${r.status === 'Pending' ? 'badge-pending' : r.status === 'Assigned' ? 'badge-assigned' : r.status === 'Collected' ? 'badge-collected' : 'badge-completed'}`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setViewOrderModalReq(r)}
                                        className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 border-white/10 hover:border-emerald-500/40 hover:text-emerald-400"
                                        title="View Order Details"
                                      >
                                        <FileText size={13} /> Details
                                      </button>
                                      {r.paymentStatus && r.paymentStatus.includes('Paid') ? (
                                        <span className="badge badge-paid">{r.paymentStatus}</span>
                                      ) : r.wasteType === 'Organic' ? (
                                        <button 
                                          onClick={() => handleRazorpayCheckout(r)} 
                                          className="btn-primary py-1 px-3.5 text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md"
                                        >
                                          <DollarSign size={13} /> Pay Online / Cash to Driver
                                        </button>
                                      ) : (
                                        <span className="badge badge-info py-1 px-2.5 text-[11px]" title="Driver will weigh at destination & pay you directly">
                                          💰 Driver Pays User at Scale
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* COMPLAINTS & TICKETS LOGGING */}
                  {activeTab === 'complaints' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Log Complaint form */}
                      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                        <h3 className="font-bold text-base">Raise Support Ticket</h3>
                        <form onSubmit={handleCreateComplaint} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Reference Request ID</label>
                            <select 
                              required
                              value={newComplaint.requestId} 
                              onChange={e => setNewComplaint({ ...newComplaint, requestId: e.target.value })}
                            >
                              <option value="">-- Choose Pickup ID --</option>
                              {requests.map(r => (
                                <option key={r.id} value={r.id}>{r.id} ({r.wasteType} - {r.scheduledDate})</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Title / Topic</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. Driver Delayed"
                              value={newComplaint.title} 
                              onChange={e => setNewComplaint({ ...newComplaint, title: e.target.value })} 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-300">Detailed Issue Description</label>
                            <textarea 
                              required 
                              rows="4"
                              placeholder="Describe the complaint details..."
                              value={newComplaint.description} 
                              onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })} 
                            />
                          </div>
                          <button type="submit" className="btn-primary py-2.5 text-sm">
                            Submit Complaint
                          </button>
                        </form>
                      </div>

                      {/* Complaints history */}
                      <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-base">Your Support Tickets</h3>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Ticket</th>
                                <th>Request ID</th>
                                <th>Status</th>
                                <th className="text-right">Admin Resolution</th>
                              </tr>
                            </thead>
                            <tbody>
                              {complaints.map(c => (
                                <tr key={c.id}>
                                  <td>
                                    <div className="font-bold text-white">{c.title}</div>
                                    <div className="text-xs text-gray-400">{c.description}</div>
                                  </td>
                                  <td>{c.requestId}</td>
                                  <td>
                                    <span className={`badge ${c.status === 'Resolved' ? 'badge-success' : 'badge-pending'}`}>
                                      {c.status}
                                    </span>
                                  </td>
                                  <td className="text-right">
                                    {c.status === 'Resolved' ? (
                                      <span className="text-xs text-gray-300 font-semibold">{c.resolutionText}</span>
                                    ) : (
                                      <span className="text-xs text-gray-500 italic">Pending Admin Review</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* ====================================================
                  TRANSPORTER / DRIVER DASHBOARD SCREENS
                  ==================================================== */}
              {user.role === 'Driver' && (
                <div className="animate-fade-in flex flex-col gap-6">

                  {/* ASSIGNED PICKUPS & LOG WEIGHT */}
                  {activeTab === 'overview' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <h2 className="text-xl font-bold">Your Fleet Action Sheet</h2>
                      
                      <div className="grid grid-cols-1 gap-6">
                        {requests.filter(r => r.status === 'Assigned' || r.status === 'Collected').map(r => (
                          <div key={r.id} className="glass p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-4">
                            {/* Top row: badges + status + details button */}
                            <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                <span className="badge badge-info font-mono text-xs" title={r.id}>{r.id}</span>
                                <span className={`badge ${r.status === 'Assigned' ? 'badge-assigned' : 'badge-collected'}`}>{r.status}</span>
                              </div>
                              <button
                                onClick={() => setViewOrderModalReq(r)}
                                className="btn-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                              >
                                <FileText size={14} /> View Order Details
                              </button>
                            </div>

                            {/* Middle row: info + weight form */}
                            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                              {/* Left: property info */}
                              <div className="flex-1 min-w-0 flex flex-col gap-3">
                                <div>
                                  <h3 className="text-xl font-bold text-white tracking-wide">{r.generatorName}</h3>
                                  <p className="text-xs text-emerald-300/90 flex items-center gap-1.5 mt-1 font-medium">
                                    <MapPin size={15} className="text-emerald-400 shrink-0" />
                                    <span className="break-words">{r.propertyAddress}</span>
                                  </p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-3 text-xs">
                                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-gray-400 block font-bold text-[10px] uppercase">WASTE CATEGORY</span>
                                    <span className="text-white font-bold text-sm">{r.wasteType}</span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-gray-400 block font-bold text-[10px] uppercase">SCHEDULED</span>
                                    <span className="text-white font-bold text-sm">{r.scheduledDate}</span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-gray-400 block font-bold text-[10px] uppercase">EST. VOLUME</span>
                                    <span className="text-emerald-400 font-bold text-sm">{r.wasteQuantity} Tons</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: weight form or collected status */}
                              <div className="w-full lg:w-96 shrink-0">
                                {r.status === 'Assigned' ? (
                                  <form 
                                    onSubmit={(e) => {
                                      const cat = collectCategory || r.wasteType;
                                      const isFood = cat === 'Organic';
                                      handleCollectionSubmit(e, r.id, r.wasteType, {
                                        driverCollectedFromUser: isFood,
                                        driverPaidToUserAmount: !isFood ? Math.round((parseFloat(collectWeight) || r.wasteQuantity) * (pricingSettings?.recyclableRate || 500)) : 0
                                      });
                                    }} 
                                    className="flex flex-col gap-3 p-5 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-xl"
                                  >
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[11px] uppercase font-extrabold text-emerald-400 tracking-wider">Waste Category Type</label>
                                      <select 
                                        value={collectCategory || r.wasteType}
                                        onChange={e => setCollectCategory(e.target.value)}
                                        className="py-2 px-3 text-xs bg-slate-950 border border-white/20 text-white rounded-xl font-bold"
                                      >
                                        <option value="Organic">Organic / Food Waste (User Pays Driver)</option>
                                        <option value="Recyclable">Recyclable (Driver Pays User from Admin Funds)</option>
                                        <option value="Hazardous">Hazardous (Driver Pays User from Admin Funds)</option>
                                        <option value="E-waste">E-waste (Driver Pays User from Admin Funds)</option>
                                        <option value="Construction">Construction (Driver Pays User from Admin Funds)</option>
                                        <option value="Other">Other Solid (Driver Pays User from Admin Funds)</option>
                                      </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[11px] uppercase font-extrabold text-emerald-400 tracking-wider">Destination Scale Weight (Tons)</label>
                                      <input 
                                        type="number" 
                                        step="0.1" 
                                        required 
                                        placeholder="Exact measured weight (e.g. 5.1)"
                                        value={collectWeight} 
                                        onChange={e => setCollectWeight(e.target.value)} 
                                        className="py-2 px-3 text-sm font-mono font-bold bg-slate-950 text-white border border-white/20 rounded-xl"
                                      />
                                    </div>

                                    {/* Payment Flow Helper Banner */}
                                    {(collectCategory || r.wasteType) === 'Organic' ? (
                                      <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex flex-col gap-1">
                                        <span className="font-bold flex items-center gap-1 text-amber-400"><DollarSign size={13}/> Food Waste Rule:</span>
                                        <span>User pays Driver ₹{(r.amount || 100)} (Base + Weight) upon pickup.</span>
                                      </div>
                                    ) : (
                                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex flex-col gap-1">
                                        <span className="font-bold flex items-center gap-1 text-emerald-400"><DollarSign size={13}/> Non-Food Waste Rule:</span>
                                        <span>Admin dispatched ₹{r.adminDispatchedFunds || r.amount || 500} funds. Weigh at destination &amp; pay User ₹{Math.round((parseFloat(collectWeight) || r.wasteQuantity) * (pricingSettings?.recyclableRate || 500))} payout!</span>
                                      </div>
                                    )}

                                    <button type="submit" className="btn-primary py-3 px-4 text-xs font-bold w-full mt-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg">
                                      {(collectCategory || r.wasteType) === 'Organic' ? 'Collect Food Waste & Cash' : 'Set Weight & Pay User'}
                                    </button>
                                  </form>
                                ) : (
                                  <div className="p-5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-2xl text-center text-xs font-semibold flex flex-col gap-3">
                                    <div>
                                      <CheckCircle className="mx-auto mb-1 text-emerald-400" size={24} />
                                      <span className="text-sm font-bold text-white block">Waste Collected &amp; Verified</span>
                                      <span>Scaled Weight: {r.weight} Tons</span>
                                    </div>
                                    <span className="text-xs text-emerald-400 font-mono font-bold bg-white/5 py-1 px-3 rounded-lg border border-emerald-500/20">
                                      {r.paymentStatus || 'Completed'}
                                    </span>
                                    <button 
                                      type="button"
                                      onClick={() => setCollectionReceiptModal(r)}
                                      className="btn-secondary py-2 px-4 text-xs flex items-center justify-center gap-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 font-bold mt-1"
                                    >
                                      <FileText size={14} /> View Receipt &amp; QR
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {requests.filter(r => r.status === 'Assigned' || r.status === 'Collected').length === 0 && (
                          <div className="text-center py-12 glass border border-white/5 rounded-2xl italic text-gray-500 text-sm">
                            You have no active trip assignments at this time.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DRIVER LEAVE APPLICATION DASHBOARD */}
                  {activeTab === 'leaves' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                      {/* Left: Apply for Leave Form */}
                      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                        <div>
                          <h2 className="text-lg font-bold text-white">Apply for Leave</h2>
                          <p className="text-xs text-gray-400">Submit a formal leave request for Admin review &amp; approval.</p>
                        </div>

                        <form onSubmit={handleDriverLeaveSubmit} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-300">Leave Category</label>
                            <select 
                              value={newLeaveFields.leaveType}
                              onChange={e => setNewLeaveFields({ ...newLeaveFields, leaveType: e.target.value })}
                              className="py-2 px-3 text-sm bg-slate-900 border border-white/10 text-white rounded-xl"
                            >
                              <option value="Casual">Casual / Personal Leave</option>
                              <option value="Medical">Medical / Sick Leave (Prescription Required)</option>
                              <option value="Emergency">Emergency Leave</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">Start Date</label>
                              <input 
                                type="date" 
                                required
                                value={newLeaveFields.startDate}
                                onChange={e => setNewLeaveFields({ ...newLeaveFields, startDate: e.target.value })}
                                className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">End Date</label>
                              <input 
                                type="date" 
                                required
                                value={newLeaveFields.endDate}
                                onChange={e => setNewLeaveFields({ ...newLeaveFields, endDate: e.target.value })}
                                className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-300">Reason for Leave</label>
                            <textarea 
                              required
                              rows="3"
                              placeholder="Describe the reason for taking leave..."
                              value={newLeaveFields.reason}
                              onChange={e => setNewLeaveFields({ ...newLeaveFields, reason: e.target.value })}
                              className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                            />
                          </div>

                          {/* Prescription Attachment for Medical Leave */}
                          {newLeaveFields.leaveType === 'Medical' && (
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-red-950/20 border border-red-500/30">
                              <label className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                                <FileText size={13} /> Medical Prescription / Doctor Note *
                              </label>
                              <input 
                                type="file" 
                                required
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={e => setLeavePrescriptionFile(e.target.files[0])}
                                className="py-1.5 px-2 text-xs bg-slate-950 border border-white/10 text-white rounded-lg cursor-pointer"
                              />
                              <span className="text-[10px] text-gray-400">Upload scanned prescription image or PDF for Admin verification.</span>
                            </div>
                          )}

                          <button type="submit" className="btn-primary py-2.5 px-4 text-xs font-bold w-full mt-2">
                            Submit Leave Application
                          </button>
                        </form>
                      </div>

                      {/* Right: Leave History & Status Table */}
                      <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <h3 className="font-bold text-base text-white">Your Submitted Leave Applications</h3>
                          <span className="text-xs text-gray-400">Total: {driverLeaves.length} entries</span>
                        </div>

                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Period</th>
                                <th>Reason &amp; Document</th>
                                <th>Status</th>
                                <th className="text-right">Admin Remark</th>
                              </tr>
                            </thead>
                            <tbody>
                              {driverLeaves.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="text-center text-xs text-gray-400 italic py-8">
                                    You have not submitted any leave applications.
                                  </td>
                                </tr>
                              ) : (
                                driverLeaves.map(l => (
                                  <tr key={l.id} className="hover:bg-white/5">
                                    <td>
                                      <span className={`badge ${l.leaveType === 'Medical' ? 'badge-danger' : 'badge-info'} text-xs`}>
                                        {l.leaveType}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="font-bold text-white text-xs">{l.startDate} to {l.endDate}</div>
                                      <div className="text-[10px] text-gray-400">{new Date(l.submittedAt).toLocaleDateString()}</div>
                                    </td>
                                    <td>
                                      <div className="text-xs text-gray-300 max-w-xs">{l.reason}</div>
                                      {l.prescriptionDoc && (
                                        <a 
                                          href={`http://localhost:5000/uploads/${l.prescriptionDoc}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-bold hover:underline mt-1"
                                        >
                                          <FileText size={11} /> Attachment
                                        </a>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-pending'}`}>
                                        {l.status}
                                      </span>
                                    </td>
                                    <td className="text-right text-xs text-gray-300">
                                      {l.adminComment ? `"${l.adminComment}"` : l.status === 'Pending' ? <span className="text-gray-500 italic">Awaiting Admin</span> : '-'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GPS SIMULATOR & LEAFLET NAVIGATOR MAP */}
                  {activeTab === 'maps' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                      <div className="glass p-6 rounded-2xl border border-white/5 h-fit flex flex-col gap-4">
                        <h3 className="font-bold text-base flex items-center gap-2 text-cyan-400">
                          <Navigation size={18} /> GPS Route Navigation
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          View user property pickup points (🏢), active driver vehicles (🚛), and plant dump sites (🏭) on Leaflet GPS map.
                        </p>
                        
                        <div className="flex flex-col gap-3 text-xs border-t border-white/5 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-semibold">Active Trip Pickup:</span>
                            <span className="text-emerald-400 font-bold">
                              {requests.find(r => r.status === 'Assigned')?.generatorName || 'No Active Assignment'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-semibold">Assigned Vehicle:</span>
                            <span className="text-white font-bold">
                              {vehicles[0]?.licensePlate || 'TRK-9844'}
                            </span>
                          </div>
                        </div>

                        {/* Broadcast Live GPS Button */}
                        <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                          <label className="text-xs font-semibold text-gray-300">Broadcast Vehicle Live Location</label>
                          <button 
                            type="button" 
                            onClick={async () => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  async (position) => {
                                    const { latitude, longitude } = position.coords;
                                    try {
                                      const veh = vehicles[0];
                                      if (veh) {
                                        await api.updateVehicleLocation(veh.id, latitude, longitude);
                                        showToast(`Vehicle live GPS updated to (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, 'success');
                                        api.getVehicles().then(setVehicles);
                                      }
                                    } catch (e) {
                                      showToast(e.message, 'error');
                                    }
                                  },
                                  (err) => {
                                    // Fallback mock GPS update if browser location permission denied
                                    const mockLat = 12.9716 + (Math.random() - 0.5) * 0.02;
                                    const mockLng = 77.5946 + (Math.random() - 0.5) * 0.02;
                                    const veh = vehicles[0];
                                    if (veh) {
                                      api.updateVehicleLocation(veh.id, mockLat, mockLng).then(() => {
                                        showToast(`GPS Broadcasted to (${mockLat.toFixed(4)}, ${mockLng.toFixed(4)})`, 'info');
                                        api.getVehicles().then(setVehicles);
                                      });
                                    }
                                  }
                                );
                              }
                            }}
                            className="btn-primary py-2 px-3 text-xs font-bold w-full flex items-center justify-center gap-2"
                          >
                            <MapPin size={14} /> Update Live GPS Location
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-2 glass border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                        <h3 className="font-bold text-base flex items-center gap-2 text-cyan-400">
                          <MapPin size={18} /> Interactive Spatial Route Map
                        </h3>
                        <LeafletMap 
                          height="440px"
                          properties={properties}
                          vehicles={vehicles}
                          plants={plants}
                          zoom={13}
                        />
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ====================================================
                  PLANT OPERATOR DASHBOARD SCREENS
                  ==================================================== */}
              {user.role === 'Operator' && (
                <div className="animate-fade-in flex flex-col gap-6">

                  {/* INCOMING INTALL LOG & SEGREGATE */}
                  {activeTab === 'overview' && (
                    <div className="flex flex-col gap-4 animate-fade-in">
                      <h2 className="text-xl font-bold">Facility Intake Control</h2>
                      <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>User</th>
                                <th>Waste Type</th>
                                <th>Arrived Tons</th>
                                <th>Trip Driver</th>
                                <th className="text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requests.filter(r => r.status === 'Collected').map(r => (
                                <tr key={r.id}>
                                  <td>
                                    <div className="font-bold">{r.generatorName}</div>
                                    <div className="text-xs text-gray-400">{r.propertyName}</div>
                                  </td>
                                  <td>{r.wasteType}</td>
                                  <td className="font-bold text-white">{r.weight} Tons</td>
                                  <td>Driver ID: {r.assignedDriverId}</td>
                                  <td className="text-right">
                                    <button 
                                      onClick={() => {
                                        setOperatorRecordReq(r);
                                        // Default segregation suggestion based on weight (e.g. 80% organic, 10% recyclable, 10% residual)
                                        const w = r.weight;
                                        setSegregationInput({
                                          organicWeight: (w * 0.8).toFixed(1),
                                          recyclableWeight: (w * 0.1).toFixed(1),
                                          residualWeight: (w * 0.1).toFixed(1)
                                        });
                                      }} 
                                      className="btn-primary py-1.5 px-3 text-xs"
                                    >
                                      Record Segregation
                                    </button>
                                  </td>
                                </tr>
                              ))}

                              {requests.filter(r => r.status === 'Collected').length === 0 && (
                                <tr>
                                  <td colSpan="5" className="text-center py-10 text-sm text-gray-500 italic">
                                    No incoming transporters currently waiting at the gate.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PLANT CAPACITIES & STATUS */}
                  {activeTab === 'plants' && (
                    <div className="glass p-6 border border-white/5 rounded-2xl flex flex-col gap-6">
                      <h2 className="text-xl font-bold">Plant Processing Dashboard</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plants.map(p => {
                          const percent = Math.round((p.currentLoad / p.capacity) * 100);
                          return (
                            <div key={p.id} className="p-5 border border-white/5 rounded-xl bg-slate-900/50 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-white">{p.name}</h4>
                                  <span className="text-xs text-gray-400">{p.location}</span>
                                </div>
                                <span className="badge badge-info">{p.type}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-400 font-semibold mt-2">
                                <span>Utilization: {percent}%</span>
                                <span>{p.currentLoad}t / {p.capacity}t Capacity</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${percent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ====================================================
                  OLX MARKETPLACE INTERFACE (SHARED BY ALL ROLES)
                  ==================================================== */}
              {activeTab === 'marketplace' && (
                <div className="flex flex-col gap-6 animate-fade-in w-full">
                  
                  {/* Top Header Banner */}
                  <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gradient-to-r from-teal-950/40 via-emerald-950/30 to-slate-900/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-success text-xs font-mono font-bold uppercase tracking-wider">OLX Classi-Marketplace</span>
                        <span className="text-xs text-gray-400">· Direct Buyer &amp; Seller Portal</span>
                      </div>
                      <h1 className="text-2xl font-black text-white tracking-wide">Buy &amp; Sell Items Marketplace</h1>
                      <p className="text-xs text-gray-300 mt-1">Browse active listings, contact sellers, or list new products directly onto the platform.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search items by title or location..."
                          value={marketplaceSearchQuery}
                          onChange={e => setMarketplaceSearchQuery(e.target.value)}
                          className="py-2 pl-9 pr-4 text-xs bg-slate-950 border border-white/10 text-white rounded-xl w-64 outline-none focus:border-emerald-500"
                        />
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Filter Bar across Full Width */}
                  <div className="flex flex-wrap items-center justify-between gap-3 glass p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {['All', 'Electronics', 'Furniture', 'Vehicles', 'Equipment', 'Recyclables', 'Other'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setMarketplaceCategoryFilter(cat)}
                          className={`py-1.5 px-4 text-xs rounded-xl font-bold transition-all ${marketplaceCategoryFilter === cat ? 'bg-emerald-500 text-slate-950 shadow-md scale-105' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-mono font-semibold bg-white/5 py-1.5 px-3 rounded-lg border border-white/5">
                      Active Listings: {marketplaceItems.filter(i => {
                        const matchCat = marketplaceCategoryFilter === 'All' || i.category === marketplaceCategoryFilter;
                        const matchSearch = !marketplaceSearchQuery || i.title.toLowerCase().includes(marketplaceSearchQuery.toLowerCase()) || i.location.toLowerCase().includes(marketplaceSearchQuery.toLowerCase());
                        return matchCat && matchSearch;
                      }).length}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 w-full">
                    
                    {/* Left Column: Admin Add Item Form (Admin Only) */}
                    {user.role === 'Admin' && (
                      <div className="w-full lg:w-96 shrink-0 glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4 h-fit">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div>
                            <h3 className="font-bold text-base text-white flex items-center gap-2">
                              <Plus size={18} className="text-emerald-400" /> Post New OLX Listing
                            </h3>
                            <p className="text-[11px] text-gray-400">Add an item to the public marketplace</p>
                          </div>
                          <span className="badge badge-info text-[10px]">Admin Only</span>
                        </div>

                        <form onSubmit={handleCreateMarketplaceItem} className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold uppercase text-gray-300">Item Title *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. iPhone 13 128GB / Industrial Heavy Weighing Scale"
                              value={newMarketplaceItem.title}
                              onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, title: e.target.value })}
                              className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold uppercase text-gray-300">Category</label>
                              <select 
                                value={newMarketplaceItem.category}
                                onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, category: e.target.value })}
                                className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                              >
                                <option value="Electronics">Electronics &amp; Gadgets</option>
                                <option value="Furniture">Furniture &amp; Home decor</option>
                                <option value="Vehicles">Vehicles &amp; Parts</option>
                                <option value="Equipment">Machinery &amp; Tools</option>
                                <option value="Recyclables">Bulk Scrap &amp; Material</option>
                                <option value="Other">Other Items</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold uppercase text-gray-300">Price (₹) *</label>
                              <input 
                                type="number" 
                                required
                                min="0"
                                placeholder="e.g. 15000"
                                value={newMarketplaceItem.price}
                                onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, price: e.target.value })}
                                className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold uppercase text-gray-300">Item Condition</label>
                              <select 
                                value={newMarketplaceItem.condition}
                                onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, condition: e.target.value })}
                                className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                              >
                                <option value="Brand New">Brand New (Unopened)</option>
                                <option value="Used - Like New">Used - Like New</option>
                                <option value="Used - Good">Used - Good</option>
                                <option value="Refurbished">Refurbished</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-bold uppercase text-gray-300">Location *</label>
                              <input 
                                type="text" 
                                required
                                placeholder="e.g. Udupi / Malpe"
                                value={newMarketplaceItem.location}
                                onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, location: e.target.value })}
                                className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold uppercase text-gray-300">Seller Phone Contact</label>
                            <input 
                              type="text" 
                              required
                              placeholder="+91 9876543210"
                              value={newMarketplaceItem.contactPhone}
                              onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, contactPhone: e.target.value })}
                              className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold uppercase text-gray-300">Description &amp; Specifications</label>
                            <textarea 
                              rows="2"
                              placeholder="Provide item specifications, working condition details..."
                              value={newMarketplaceItem.description}
                              onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, description: e.target.value })}
                              className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                            />
                          </div>

                          <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                            <label className="text-[11px] font-bold uppercase text-gray-300">Item Image Upload or URL</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={e => setMarketplaceImageFile(e.target.files[0])}
                              className="py-1 px-2 text-xs bg-slate-950 border border-white/10 text-white rounded-lg cursor-pointer mb-1"
                            />
                            <input 
                              type="url" 
                              placeholder="Or paste image URL (https://...)"
                              value={newMarketplaceItem.imageUrl}
                              onChange={e => setNewMarketplaceItem({ ...newMarketplaceItem, imageUrl: e.target.value })}
                              className="py-1.5 px-3 text-[11px] bg-slate-950 border border-white/10 text-gray-300 rounded-lg"
                            />
                          </div>

                          <button type="submit" className="btn-primary py-2.5 px-4 text-xs font-bold w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600">
                            Post Item on OLX Marketplace
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Right Column: Marketplace Item Cards Feed */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                      
                      {/* Items Grid (Flipkart E-Commerce Style) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {marketplaceItems
                          .filter(i => {
                            const matchCat = marketplaceCategoryFilter === 'All' || i.category === marketplaceCategoryFilter;
                            const matchSearch = !marketplaceSearchQuery || i.title.toLowerCase().includes(marketplaceSearchQuery.toLowerCase()) || i.location.toLowerCase().includes(marketplaceSearchQuery.toLowerCase());
                            return matchCat && matchSearch;
                          })
                          .map(item => {
                            const originalPrice = Math.round((item.price || 500) * 1.25);
                            return (
                              <div 
                                key={item.id} 
                                className="bg-slate-900/90 border border-white/10 hover:border-emerald-500/60 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between group hover:shadow-2xl hover:-translate-y-1"
                              >
                                <div>
                                  {/* Product Image Container with Clean Badges */}
                                  <div className="relative h-52 w-full bg-slate-950 flex items-center justify-center p-3 overflow-hidden border-b border-white/5">
                                    <img 
                                      src={item.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'} 
                                      alt={item.title} 
                                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'; }}
                                    />
                                    <span className="absolute top-2.5 left-2.5 bg-yellow-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded shadow z-10 font-mono">
                                      {item.category}
                                    </span>
                                    <span className="absolute top-2.5 right-2.5 bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow z-10">
                                      Assured
                                    </span>
                                  </div>

                                  {/* Product Details Section */}
                                  <div className="p-4 flex flex-col gap-2">
                                    <h4 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors">
                                      {item.title}
                                    </h4>

                                    {/* Flipkart-Style Rating & Delivery Tag */}
                                    <div className="flex items-center gap-2">
                                      <span className="bg-emerald-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        4.5 ★
                                      </span>
                                      <span className="text-[11px] text-gray-400 font-medium">({Math.floor(Math.random() * 400 + 50)} ratings)</span>
                                      <span className="text-[10px] text-emerald-400 font-semibold ml-auto">Free Delivery</span>
                                    </div>

                                    {/* Price & Offer Breakdown */}
                                    <div className="flex items-baseline gap-2 mt-1">
                                      <span className="font-mono font-black text-xl text-white">
                                        ₹{item.price?.toLocaleString('en-IN')}
                                      </span>
                                      <span className="font-mono text-xs text-gray-400 line-through">
                                        ₹{originalPrice.toLocaleString('en-IN')}
                                      </span>
                                      <span className="text-xs font-bold text-emerald-400">
                                        20% off
                                      </span>
                                    </div>

                                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed mt-0.5">
                                      {item.description}
                                    </p>

                                    {/* Specs & Location Footer */}
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5 mt-1">
                                      <span className="flex items-center gap-1 font-medium text-cyan-400 truncate max-w-[130px]">
                                        <MapPin size={12} className="shrink-0" /> {item.location}
                                      </span>
                                      <span className="font-mono text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/5 shrink-0">
                                        {item.condition}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Flipkart-Style Action Buttons */}
                                <div className="p-3 px-4 bg-slate-950/80 border-t border-white/5 flex items-center justify-between gap-2">
                                  <div className="text-[10px] text-gray-400 truncate">
                                    <span>Seller: <strong className="text-gray-200">{item.sellerName || 'Admin'}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {(user.role === 'Admin' || item.sellerId === user.id) && (
                                      <button 
                                        onClick={() => handleDeleteMarketplaceItem(item.id)}
                                        className="btn-danger p-1.5 text-xs rounded-lg"
                                        title="Delete Listing"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setSelectedMarketplaceItem(item)}
                                      className="btn-primary py-2 px-3.5 text-xs font-extrabold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-lg rounded-xl shrink-0"
                                    >
                                      Buy &amp; Contact
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        }

                        {marketplaceItems.filter(i => {
                          const matchCat = marketplaceCategoryFilter === 'All' || i.category === marketplaceCategoryFilter;
                          const matchSearch = !marketplaceSearchQuery || i.title.toLowerCase().includes(marketplaceSearchQuery.toLowerCase()) || i.location.toLowerCase().includes(marketplaceSearchQuery.toLowerCase());
                          return matchCat && matchSearch;
                        }).length === 0 && (
                          <div className="col-span-full glass border border-white/5 rounded-2xl p-16 text-center italic text-gray-400 text-sm">
                            No products found under category "{marketplaceCategoryFilter}".
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* ====================================================
          POPUP DIALOG MODALS
          ==================================================== */}

      {/* DIALOG 1: ASSIGN VEHICLE MODAL (Admin) */}
      {assignModalReq && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.55)',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAssignModalReq(null); }}
        >
          <div 
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--bg-surface-solid)',
              borderRadius: '24px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(45,106,79,0.12)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, #52B788 100%)',
              padding: '24px 28px 20px',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Truck size={18} color="white" />
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'white', margin: 0 }}>
                    Dispatch Vehicle
                  </h3>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginLeft: '46px', marginTop: '2px' }}>
                  Assign driver &amp; fleet vehicle for this request
                </p>
              </div>
              <button 
                onClick={() => setAssignModalReq(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <X size={15} />
              </button>
            </div>

            {/* Request Info Banner */}
            <div style={{
              background: 'rgba(45,106,79,0.06)',
              borderBottom: '1px solid rgba(45,106,79,0.1)',
              padding: '14px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                background: 'rgba(45,106,79,0.12)',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  REQ
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {assignModalReq.id?.slice(-10)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(82,183,136,0.15)',
                  color: 'var(--cyan)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '99px',
                  border: '1px solid rgba(82,183,136,0.25)',
                }}>
                  {assignModalReq.wasteType}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {assignModalReq.wasteQuantity}t
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  · {assignModalReq.generatorName}
                </span>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAssignSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Assign Driver */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '0.75rem', fontWeight: 700, 
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <User size={12} />
                  Assign Driver
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    required
                    value={assignState.driverId} 
                    onChange={e => setAssignState({ ...assignState, driverId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      paddingLeft: '42px',
                      background: 'rgba(0,0,0,0.03)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    {usersList.filter(u => u.role === 'Driver').map(u => {
                      const reqDate = assignModalReq.scheduledDate;
                      const isOnLeave = driverLeaves.some(l => {
                        if (l.driverId !== u.id || l.status !== 'Approved') return false;
                        if (!reqDate) return true;
                        return (reqDate >= l.startDate && reqDate <= l.endDate);
                      });
                      return (
                        <option key={u.id} value={u.id} disabled={isOnLeave}>
                          {u.name} {isOnLeave ? '⚠️ (Not Available — On Leave)' : '(Transporter)'}
                        </option>
                      );
                    })}
                  </select>
                  <User size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Assign Vehicle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '0.75rem', fontWeight: 700, 
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <Truck size={12} />
                  Assign Fleet Vehicle
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    required
                    value={assignState.vehicleId} 
                    onChange={e => setAssignState({ ...assignState, vehicleId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      paddingLeft: '42px',
                      background: 'rgba(0,0,0,0.03)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.licensePlate} — {v.type} · Max {v.capacity}t</option>
                    ))}
                  </select>
                  <Truck size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Admin Financial Rule Helper Banner */}
              {assignModalReq.wasteType === 'Organic' ? (
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.25)', color: '#d97706', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🍔 Food Waste Payment Rule</span>
                  <span>User will pay ₹{assignModalReq.amount || 100} fee directly to Driver upon pickup.</span>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Non-Food Waste Purchase Rule</span>
                  <span>Admin dispatches ₹{assignModalReq.amount || 500} funds to Driver. Driver weighs waste at destination scale &amp; pays User payout directly!</span>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border-color)' }} />

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setAssignModalReq(null)}
                  style={{
                    flex: 1, padding: '13px',
                    background: 'rgba(0,0,0,0.04)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-primary)',
                    fontWeight: 600, fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    flex: 2, padding: '13px',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #52B788 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontFamily: 'var(--font-primary)',
                    fontWeight: 700, fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(45,106,79,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(45,106,79,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,106,79,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Send size={15} />
                  Confirm &amp; Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: COMPLAINT RESOLUTION MODAL (Admin) */}
      {resolutionModalComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass border border-white/10 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="font-bold text-lg text-white">Resolve Support Ticket</h3>
              <button onClick={() => setResolutionModalComp(null)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveComplaintSubmit} className="flex flex-col gap-4">
              <div>
                <span className="badge badge-pending mb-1">{resolutionModalComp.id}</span>
                <h4 className="font-bold text-white text-sm">{resolutionModalComp.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{resolutionModalComp.description}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300">Resolution Message</label>
                <textarea 
                  required 
                  rows="4" 
                  placeholder="Explain actions taken to resolve..."
                  value={resolutionText} 
                  onChange={e => setResolutionText(e.target.value)} 
                />
              </div>

              <button type="submit" className="btn-primary py-3 w-full text-sm font-bold">
                Close Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 3: PAYMENTS MODAL (Generator / Razorpay) */}
      {paymentModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass border border-emerald-500/30 rounded-3xl p-8 shadow-2xl animate-fade-in flex flex-col gap-6 relative overflow-hidden">
            {/* Razorpay header color strip */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                  R
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-wide uppercase">Razorpay Secure</h3>
                  <span className="text-[9px] text-gray-400 block -mt-0.5">Test Mode Sandbox</span>
                </div>
              </div>
              <button onClick={() => setPaymentModalReq(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-900/60 border border-white/5 p-4 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">PAYMENT FOR REF</span>
                <span className="text-xs text-white font-semibold">{paymentModalReq.id} ({paymentModalReq.wasteType})</span>
                <span className="text-[10px] text-cyan-400 block font-mono mt-0.5">Key: rzp_test_SC7GZQVzAK7jRK</span>
              </div>
              <span className="text-xl font-mono font-bold text-emerald-400">₹{paymentModalReq.amount}</span>
            </div>

            <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300">Cardholder Name</label>
                <input type="text" required placeholder="John Doe" className="py-2.5 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300">Razorpay Card Details</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" required placeholder="4111 2222 3333 4444" className="col-span-2 py-2.5 text-sm" />
                  <input type="text" required placeholder="12/28" className="py-2.5 text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300">UPI ID Option</label>
                <input type="text" placeholder="username@upi" className="py-2.5 text-sm" />
              </div>

              <button type="submit" className="btn-primary py-3 w-full text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-500 hover:to-indigo-500">
                Authorize Razorpay Payment (₹{paymentModalReq.amount})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 4: OPERATOR SEGREGATION MODAL (Operator) */}
      {operatorRecordReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass border border-white/10 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="font-bold text-lg text-white">Record Waste Segregation</h3>
              <button onClick={() => setOperatorRecordReq(null)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleOperatorDeliverySubmit} className="flex flex-col gap-4">
              <p className="text-xs text-gray-400">
                Log the exact segregated weights (in Tons) for delivery load from driver. Total must match original collection weight of <strong>{operatorRecordReq.weight} Tons</strong>.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-300">Organic (t)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    value={segregationInput.organicWeight} 
                    onChange={e => setSegregationInput({ ...segregationInput, organicWeight: e.target.value })} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-300">Recyclable (t)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    value={segregationInput.recyclableWeight} 
                    onChange={e => setSegregationInput({ ...segregationInput, recyclableWeight: e.target.value })} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-300">Residual (t)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    value={segregationInput.residualWeight} 
                    onChange={e => setSegregationInput({ ...segregationInput, residualWeight: e.target.value })} 
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary py-3 w-full text-sm font-bold">
                Approve Segregation & Store
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 5: VIEW USER DETAILS MODAL (Admin) */}
      {viewUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass border border-white/10 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="font-bold text-lg">User Profile Details</h3>
              <button onClick={() => setViewUserDetail(null)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={16} />
              </button>
            </div>

            {/* Avatar & Name */}
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,#1f5c3a,#52B788)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.8rem',fontWeight:800,color:'#fff',boxShadow:'0 4px 16px rgba(45,106,79,0.2)'}}>
                {(viewUserDetail.name || viewUserDetail.username || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-lg font-bold">{viewUserDetail.name}</h4>
                <span className="text-xs text-emerald-600">@{viewUserDetail.username}</span>
              </div>
            </div>

            {/* Info rows — grid layout for clean column alignment */}
            <div className="border-t border-white/5 pt-4" style={{display:'grid',gridTemplateColumns:'120px 1fr',rowGap:'12px',alignItems:'center'}}>
              <span className="text-xs text-gray-400">Role</span>
              <span className="text-xs font-semibold text-right">{viewUserDetail.role === 'Generator' ? 'User Module' : viewUserDetail.role}</span>

              <span className="text-xs text-gray-400">Status</span>
              <span className="text-right"><span className="badge badge-active">{viewUserDetail.status}</span></span>

              <span className="text-xs text-gray-400">Email</span>
              <span className="text-xs font-semibold text-right break-all">{viewUserDetail.email}</span>

              <span className="text-xs text-gray-400">Contact</span>
              <span className="text-xs font-semibold text-right">{viewUserDetail.contact || 'N/A'}</span>

              {viewUserDetail.role === 'Generator' && (
                <>
                  <span className="text-xs text-gray-400">Organization</span>
                  <span className="text-xs font-semibold text-right">{viewUserDetail.organizationName || 'N/A'}</span>
                </>
              )}
            </div>

            {viewUserDetail.docs && viewUserDetail.docs.length > 0 && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">Verification Document</span>
                <a 
                  href={`http://localhost:5000/uploads/${viewUserDetail.docs[0]}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-emerald-400 underline font-semibold hover:text-emerald-300"
                >
                  View Verification PDF
                </a>
              </div>
            )}

            <button onClick={() => setViewUserDetail(null)} className="btn-secondary py-2.5 w-full text-sm font-semibold mt-2">
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* DIALOG 6: INTERACTIVE ORDER DETAILS POPUP DIALOG */}
      {viewOrderModalReq && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewOrderModalReq(null); }}
        >
          <div 
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0a1610',
              borderRadius: '24px',
              border: '1px solid rgba(82, 183, 136, 0.25)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 40px rgba(0,230,118,0.08)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  width: '38px', height: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={20} color="#52b788" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', margin: 0 }}>
                    Order Details Specification
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: 0, fontFamily: 'monospace' }}>
                    {viewOrderModalReq.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewOrderModalReq(null)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#ffffff', flexShrink: 0,
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              
              {/* Generator & Property Section */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={12} className="text-emerald-400" /> Property & Generator Info
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">{viewOrderModalReq.generatorName || 'Registered Generator'}</h4>
                  <p className="text-xs text-gray-300 flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-emerald-400 shrink-0" /> {viewOrderModalReq.propertyName || 'Property'} — {viewOrderModalReq.propertyAddress}
                  </p>
                </div>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Waste Category</span>
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Trash2 size={14} className="text-emerald-400" /> {viewOrderModalReq.wasteType}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Estimated Tonnage</span>
                  <span className="font-bold text-white text-sm">{viewOrderModalReq.wasteQuantity} Tons</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Scheduled Pickup</span>
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Clock size={14} className="text-cyan-400" /> {viewOrderModalReq.scheduledDate}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Actual Scale Weight</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {viewOrderModalReq.weight > 0 ? `${viewOrderModalReq.weight} Tons` : 'Pending Scale'}
                  </span>
                </div>
              </div>

              {/* Fee & Billing Breakdown */}
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><DollarSign size={12} /> Fee Breakdown</span>
                  <span className={`badge ${viewOrderModalReq.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                    {viewOrderModalReq.paymentStatus || 'Unpaid'}
                  </span>
                </span>
                
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Base / Category Fee:</span>
                  <span className="font-mono">₹{viewOrderModalReq.weightFee || viewOrderModalReq.amount}</span>
                </div>
                
                {viewOrderModalReq.distanceKm > 0 && (
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Transport Fee ({viewOrderModalReq.distanceKm} km from Malpe):</span>
                    <span className="font-mono">₹{viewOrderModalReq.transportFee || 0}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-emerald-500/30">
                  <span>Total Calculated Charge:</span>
                  <span className="text-emerald-400 font-mono">₹{viewOrderModalReq.amount}</span>
                </div>
              </div>

              {/* Assigned Transporter / Fleet Info */}
              {(viewOrderModalReq.assignedDriverId || viewOrderModalReq.assignedVehicleId) && (
                <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex flex-col gap-1.5 text-xs">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Truck size={12} /> Fleet Allocation
                  </span>
                  <div className="flex justify-between text-gray-300">
                    <span>Transporter / Driver:</span>
                    <span className="font-semibold text-white">{viewOrderModalReq.assignedDriverId}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Vehicle ID / Plate:</span>
                    <span className="font-semibold text-white">{viewOrderModalReq.assignedVehicleId}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justify: 'flex-end',
              background: 'rgba(0,0,0,0.2)',
              flexShrink: 0
            }}>
              <button 
                onClick={() => setViewOrderModalReq(null)}
                className="btn-primary py-2 px-6 text-xs font-bold"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DIALOG 7: COLLECTION BILL RECEIPT WITH QR CODE MODAL */}
      {collectionReceiptModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setCollectionReceiptModal(null); }}
        >
          <div 
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#09150e',
              borderRadius: '24px',
              border: '1.5px solid rgba(82, 183, 136, 0.35)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 50px rgba(0,230,118,0.12)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  width: '38px', height: '38px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle size={22} color="#52b788" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff', margin: 0 }}>
                    Pickup Bill &amp; QR Receipt
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', margin: 0 }}>
                    Collection Logged &amp; Verified
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setCollectionReceiptModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#ffffff', flexShrink: 0,
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Content Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Dummy QR Code Card */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                border: '3px solid #52b788'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=BULKWASTE-RECEIPT:${collectionReceiptModal.id}-WEIGHT:${collectionReceiptModal.weight || collectionReceiptModal.wasteQuantity}T-AMOUNT:${collectionReceiptModal.amount}`}
                  alt="Pickup QR Receipt Code"
                  style={{ width: '160px', height: '160px', borderRadius: '8px' }}
                />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#09150e', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                    Scan QR for Verification
                  </span>
                  <span style={{ color: '#52b788', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}>
                    REF: {collectionReceiptModal.id}
                  </span>
                </div>
              </div>

              {/* Bill Details Breakdown */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <span>Customer / Generator:</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>{collectionReceiptModal.generatorName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <span>Property Address:</span>
                  <span style={{ color: '#ffffff', fontWeight: 600, maxWidth: '220px', textAlign: 'right', wordBreak: 'break-word' }}>{collectionReceiptModal.propertyName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <span>Waste Category:</span>
                  <span style={{ color: '#52b788', fontWeight: 700 }}>{collectionReceiptModal.wasteType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <span>Measured Weight:</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>{collectionReceiptModal.weight || collectionReceiptModal.wasteQuantity} Tons</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <span>Payment Flow Mode:</span>
                  <span style={{ color: collectionReceiptModal.wasteType === 'Organic' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                    {collectionReceiptModal.wasteType === 'Organic' ? 'Food Waste: User paid Driver' : 'Non-Food Waste: Driver paid User'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <span>Payment Status:</span>
                  <span style={{ color: '#52b788', fontWeight: 700 }}>
                    {collectionReceiptModal.paymentStatus || 'Paid'}
                  </span>
                </div>

                {collectionReceiptModal.distanceKm > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                    <span>Malpe Hub Distance:</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{collectionReceiptModal.distanceKm} km (Trans: ₹{collectionReceiptModal.transportFee})</span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  paddingTop: '10px',
                  marginTop: '4px',
                  borderTop: '1px dashed rgba(255,255,255,0.15)',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  <span>{collectionReceiptModal.wasteType === 'Organic' ? 'Total Collected Fee:' : 'Total User Payout:'}</span>
                  <span style={{ color: '#52b788', fontSize: '1.25rem', fontFamily: 'monospace' }}>
                    ₹{collectionReceiptModal.amount}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <button 
                type="button"
                onClick={() => window.print()}
                className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
              >
                <FileDown size={14} /> Print Bill
              </button>
              <button 
                onClick={() => setCollectionReceiptModal(null)}
                className="btn-primary py-2 px-6 text-xs font-bold"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DIALOG 8: ADMIN REVIEW DRIVER LEAVE MODAL */}
      {reviewLeaveModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setReviewLeaveModal(null); }}
        >
          <div 
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#0d1a12',
              borderRadius: '24px',
              border: '1.5px solid rgba(0, 230, 118, 0.3)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Calendar size={20} color="#52b788" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff', margin: 0 }}>
                    Review Driver Leave
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', margin: 0 }}>
                    Applicant: {reviewLeaveModal.driverName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReviewLeaveModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#ffffff'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Leave Category:</span>
                  <span className="text-emerald-400 font-bold">{reviewLeaveModal.leaveType} Leave</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Leave Dates:</span>
                  <span className="text-white font-bold">{reviewLeaveModal.startDate} to {reviewLeaveModal.endDate}</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-white/5 pt-2 text-xs">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Reason Statement:</span>
                  <span className="text-gray-200 font-medium">{reviewLeaveModal.reason}</span>
                </div>
                {reviewLeaveModal.prescriptionDoc && (
                  <div className="border-t border-white/5 pt-2">
                    <a 
                      href={`http://localhost:5000/uploads/${reviewLeaveModal.prescriptionDoc}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 font-bold hover:underline"
                    >
                      <FileText size={13} /> Open Medical Prescription / Doctor Note
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-gray-300">Admin Remarks / Notes (Optional)</label>
                <textarea 
                  rows="3"
                  placeholder="Enter remarks for the driver..."
                  value={adminLeaveComment}
                  onChange={e => setAdminLeaveComment(e.target.value)}
                  className="py-2 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => handleReviewLeaveSubmit('Rejected')}
                  className="btn-danger py-2.5 px-4 text-xs font-bold flex-1"
                >
                  Reject Leave
                </button>
                <button 
                  type="button"
                  onClick={() => handleReviewLeaveSubmit('Approved')}
                  className="btn-primary py-2.5 px-4 text-xs font-bold flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  Approve Leave
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DIALOG 9: VIEW MARKETPLACE ITEM DETAIL & CONTACT SELLER MODAL */}
      {selectedMarketplaceItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMarketplaceItem(null); }}
        >
          <div 
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#09150e',
              borderRadius: '24px',
              border: '1.5px solid rgba(82,183,136,0.3)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header Image Banner */}
            <div style={{ position: 'relative', height: '220px', background: '#020617' }}>
              <img 
                src={selectedMarketplaceItem.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'} 
                alt={selectedMarketplaceItem.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'; }}
              />
              <button 
                onClick={() => setSelectedMarketplaceItem(null)}
                style={{
                  position: 'absolute', top: '14px', right: '14px',
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#ffffff'
                }}
              >
                <X size={16} />
              </button>
              <span className="absolute bottom-3 left-4 font-mono font-black text-emerald-300 text-xl bg-slate-950/90 px-3 py-1 rounded-xl border border-emerald-500/30">
                ₹{selectedMarketplaceItem.price?.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span className="badge badge-info text-xs font-bold mb-1">{selectedMarketplaceItem.category}</span>
                <h3 className="text-lg font-extrabold text-white">{selectedMarketplaceItem.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 font-medium">
                  <MapPin size={13} className="text-emerald-400" /> Location: {selectedMarketplaceItem.location} · Condition: <span className="text-white font-bold">{selectedMarketplaceItem.condition}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Description</span>
                <p className="text-xs text-gray-200 leading-relaxed">{selectedMarketplaceItem.description}</p>
              </div>

              {/* Seller Contact Info Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <User size={13} /> Seller Contact Details
                </span>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-300 font-semibold">Seller Name:</span>
                  <span className="text-white font-bold">{selectedMarketplaceItem.sellerName} ({selectedMarketplaceItem.sellerRole || 'Seller'})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-semibold">Phone / WhatsApp:</span>
                  <a 
                    href={`tel:${selectedMarketplaceItem.contactPhone}`} 
                    className="text-cyan-400 font-mono font-extrabold hover:underline"
                  >
                    {selectedMarketplaceItem.contactPhone || '+91 9876543210'}
                  </a>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a 
                  href={`https://wa.me/${selectedMarketplaceItem.contactPhone?.replace(/[^0-9]/g, '') || '919876543210'}?text=Hi%20${encodeURIComponent(selectedMarketplaceItem.sellerName)},%20I%20am%20interested%20in%20buying%20your%20OLX%20listing:%20${encodeURIComponent(selectedMarketplaceItem.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary py-3 px-4 text-xs font-extrabold w-full text-center bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Contact Seller via WhatsApp / Call
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
