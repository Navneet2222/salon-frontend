import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const API_URL = 'https://salon-backend-hlzb.onrender.com/api';
const socket = io('https://salon-backend-hlzb.onrender.com');

export default function OwnerDashboard() {
  const [token, setToken] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Auth Fields
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Shop Data
  const [myShop, setMyShop] = useState(null);
  const [queue, setQueue] = useState([]);
  
  // Shop Setup & Edit State
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [bannerImage, setBannerImage] = useState(''); 
  
  // Service Data
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');

  useEffect(() => {
    socket.on('newBooking', (booking) => {
      alert('🔔 New Booking Alert!');
      setQueue((prevQueue) => [...prevQueue, booking]);
    });
    return () => socket.off('newBooking');
  }, []);

  const handleLogout = () => {
    setToken(null);
    setMyShop(null);
    setQueue([]);
    setIsEditingShop(false);
    alert("Logged out successfully!");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    
    // Determine if input is email or phone
    const isEmail = phoneOrEmail.includes('@');
    
    // THE FIX: Automatically create a placeholder email if they use a phone number
    const payload = isLoginMode 
      ? { [isEmail ? 'email' : 'phone']: phoneOrEmail, password } 
      : { 
          name, 
          [isEmail ? 'email' : 'phone']: phoneOrEmail, 
          password, 
          role: "shop_owner",
          email: isEmail ? phoneOrEmail : `${phoneOrEmail}@shop.com` 
        };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        setToken(data.token);
        fetchMyShop(data.token);
      } else {
        alert(data.message || "Authentication failed. Please check your details.");
      }
    } catch (error) { 
      console.error("Auth error:", error); 
      alert("Network error. Please try again.");
    }
  };

  const fetchMyShop = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/shops/owner/my-shop`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const shopData = await res.json();
        setMyShop(shopData);
        setShopName(shopData.name);
        setShopAddress(shopData.address);
        setBannerImage(shopData.bannerImage || '');
        
        fetchQueue(shopData._id, authToken);
        socket.emit('joinShopRoom', shopData._id); 
      }
    } catch (error) { 
      console.error("Error fetching shop:", error); 
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return alert("Please choose an image smaller than 2MB!");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateShop = async () => {
    if(!shopName || !shopAddress) return alert("Please fill in both the Shop Name and Address.");
    try {
      const res = await fetch(`${API_URL}/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: shopName, address: shopAddress, bannerImage }) 
      });
      if (res.ok) {
        fetchMyShop(token);
        alert("Storefront launched successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create shop.");
      }
    } catch (error) { 
      console.error("Error creating shop:", error); 
    }
  };

  const handleUpdateShop = async () => {
    if(!shopName || !shopAddress) return alert("Please fill in both fields");
    try {
      const res = await fetch(`${API_URL}/shops/${myShop._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: shopName, address: shopAddress, bannerImage }) 
      });
      if (res.ok) {
        alert("Shop profile updated!");
        setIsEditingShop(false);
        fetchMyShop(token);
      } else {
        alert("Failed to update shop.");
      }
    } catch (error) { console.error("Error updating shop:", error); }
  };

  const handleAddService = async () => {
    if(!serviceName || !servicePrice || !serviceDuration) return alert("Please fill out all service details.");
    try {
      const res = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: serviceName, price: Number(servicePrice), durationMinutes: Number(serviceDuration) })
      });
      if (res.ok) {
        alert(`${serviceName} added to your menu!`);
        setServiceName(''); setServicePrice(''); setServiceDuration('');
      }
    } catch (error) { console.error("Error adding service:", error); }
  };

  const fetchQueue = async (shopId, authToken) => {
    const res = await fetch(`${API_URL}/bookings/queue?shopId=${shopId}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (res.ok) setQueue(await res.json());
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    const res = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) setQueue(queue.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen p-6 font-sans">
      <div className="flex justify-between items-center mb-4">
        <Link to="/" className="text-blue-600 text-sm font-semibold">&larr; Back to Home</Link>
        {token && (
          <button onClick={handleLogout} className="text-red-500 text-sm font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors">
            Logout
          </button>
        )}
      </div>
      
      <header className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Partner Portal</h1>
          <p className="text-gray-500">Manage your barbershop, menu, and live queue.</p>
        </div>
        {token && myShop && !isEditingShop && (
          <button 
            onClick={() => setIsEditingShop(true)} 
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </header>

      {!token && (
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md mx-auto border border-gray-200">
          <div className="text-center mb-6">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {isLoginMode ? 'Welcome Back' : 'Step 1 of 2'}
            </span>
            <h2 className="text-2xl font-bold mt-4 text-gray-800">{isLoginMode ? 'Owner Login' : 'Create Partner Account'}</h2>
          </div>
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your Full Name</label>
                <input type="text" placeholder="e.g. John Doe" required className="w-full border p-3 rounded-lg bg-gray-50" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Contact Details</label>
              <input type="text" placeholder="Phone Number or Email" required className="w-full border p-3 rounded-lg bg-gray-50" value={phoneOrEmail} onChange={e => setPhoneOrEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="Create a secure password" required className="w-full border p-3 rounded-lg bg-gray-50" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-2 shadow-md">
              {isLoginMode ? 'Login to Dashboard' : 'Continue to Shop Setup &rarr;'}
            </button>
          </form>
          
          <p className="mt-6 text-sm text-center text-gray-600 border-t pt-4">
            {isLoginMode ? "Want to register your salon? " : "Already registered your salon? "}
            <span className="text-blue-600 cursor-pointer font-bold hover:underline" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? 'Apply Here' : 'Login Here'}
            </span>
          </p>
        </div>
      )}

      {token && !myShop && (
        <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-blue-600 mb-8 max-w-lg mx-auto mt-10">
          <div className="text-center mb-6">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Step 2 of 2
            </span>
            <h2 className="text-2xl font-bold mt-4">Launch Your Storefront</h2>
            <p className="text-sm text-gray-500 mt-2">Customers need to know where to find you. Upload a premium photo and add your address.</p>
          </div>
          
          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Upload Shop Photo (Gallery)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 mb-3 rounded bg-white text-sm" />
            {bannerImage ? (
              <img src={bannerImage} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-sm border" />
            ) : (
              <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                No image selected
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Official Shop Name</label>
            <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. Urban Fade Studio" />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-1">Full Location Address</label>
            <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="e.g. 123 Main St, Indiranagar, Bangalore" />
          </div>

          <button onClick={handleCreateShop} className="w-full bg-green-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg flex justify-center items-center gap-2 transition-all hover:scale-[1.02]">
            <span>Go Live on the Marketplace</span>
            <span>🚀</span>
          </button>
        </div>
      )}

      {token && myShop && isEditingShop && (
        <div className="bg-white p-8 rounded-xl shadow-md mb-8 border border-gray-200">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Edit Shop Profile</h2>
            <button onClick={() => setIsEditingShop(false)} className="text-gray-500 font-bold hover:text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">&times; Cancel</button>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Update Shop Photo</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 mb-2 rounded bg-gray-50 text-sm" />
            {bannerImage && <img src={bannerImage} alt="Preview" className="w-full h-48 object-cover rounded-lg shadow-sm border mt-2" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Shop Name</label>
              <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Official Shop Name" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb