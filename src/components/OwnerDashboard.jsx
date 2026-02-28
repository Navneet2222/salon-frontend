import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const API_URL = 'https://salon-backend-hlzb.onrender.com/api';
const socket = io('https://salon-backend-hlzb.onrender.com');

export default function OwnerDashboard() {
  const [token, setToken] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');

  const [myShop, setMyShop] = useState(null);
  const [queue, setQueue] = useState([]);
  
  // Shop Setup & Edit State
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [bannerImage, setBannerImage] = useState(''); 
  
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
    const isEmail = phoneOrEmail.includes('@');
    const payload = isLoginMode 
      ? { [isEmail ? 'email' : 'phone']: phoneOrEmail, password } 
      : { name, [isEmail ? 'email' : 'phone']: phoneOrEmail, password, role: "shop_owner" };

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
        alert(data.message || "Authentication failed");
      }
    } catch (error) { console.error("Auth error:", error); }
  };

  const fetchMyShop = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/shops/owner/my-shop`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const shopData = await res.json();
        setMyShop(shopData);
        // Pre-fill states for editing later
        setShopName(shopData.name);
        setShopAddress(shopData.address);
        setBannerImage(shopData.bannerImage || '');
        
        fetchQueue(shopData._id, authToken);
        socket.emit('joinShopRoom', shopData._id); 
      }
    } catch (error) { console.error("Error fetching shop:", error); }
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
    if(!shopName || !shopAddress) return alert("Please fill in both fields");
    try {
      const res = await fetch(`${API_URL}/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: shopName, address: shopAddress, bannerImage }) 
      });
      if (res.ok) fetchMyShop(token);
    } catch (error) { console.error("Error creating shop:", error); }
  };

  // NEW: Update existing shop function
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
        fetchMyShop(token); // Refresh UI with new data
      } else {
        alert("Failed to update shop.");
      }
    } catch (error) { console.error("Error updating shop:", error); }
  };

  const handleAddService = async () => {
    try {
      const res = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: serviceName, price: Number(servicePrice), durationMinutes: Number(serviceDuration) })
      });
      if (res.ok) {
        alert(`${serviceName} added!`);
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
          <button onClick={handleLogout} className="text-red-500 text-sm font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50">
            Logout
          </button>
        )}
      </div>
      
      <header className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Partner Portal</h1>
          <p className="text-gray-500">Manage your barbershop, menu, and live queue.</p>
        </div>
        {/* NEW: Edit Profile Button */}
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
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{isLoginMode ? 'Owner Login' : 'Become a Partner'}</h2>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLoginMode && (
              <input type="text" placeholder="Your Full Name" required className="border p-3 rounded" value={name} onChange={e => setName(e.target.value)} />
            )}
            <input type="text" placeholder="Phone or Email" required className="border p-3 rounded" value={phoneOrEmail} onChange={e => setPhoneOrEmail(e.target.value)} />
            <input type="password" placeholder="Password" required className="border p-3 rounded" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-2">
              {isLoginMode ? 'Login to Dashboard' : 'Register Account'}
            </button>
          </form>
          <p className="mt-6 text-sm text-center text-gray-600">
            {isLoginMode ? "New to the platform? " : "Already a partner? "}
            <span className="text-blue-600 cursor-pointer font-bold hover:underline" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? 'Apply Here' : 'Login'}
            </span>
          </p>
        </div>
      )}

      {/* CREATE NEW SHOP VIEW */}
      {token && !myShop && (
        <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-blue-600 mb-8 max-w-lg mx-auto mt-10">
          <h2 className="text-2xl font-bold mb-2">Setup Your Shop</h2>
          <p className="text-sm text-gray-500 mb-4">Make it look premium for your customers.</p>
          
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Upload Shop Photo (Gallery)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 mb-2 rounded bg-white text-sm" />
            {bannerImage && <img src={bannerImage} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-sm border" />}
          </div>

          <input className="w-full border p-3 mb-4 rounded bg-gray-50" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Official Shop Name" />
          <input className="w-full border p-3 mb-6 rounded bg-gray-50" value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="Full Address" />
          <button onClick={handleCreateShop} className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-green-700">Launch My Shop</button>
        </div>
      )}

      {/* EDIT EXISTING SHOP VIEW */}
      {token && myShop && isEditingShop && (
        <div className="bg-white p-8 rounded-lg shadow-md mb-8 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Edit Shop Profile</h2>
            <button onClick={() => setIsEditingShop(false)} className="text-gray-500 font-bold hover:text-gray-800">&times; Cancel</button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Update Shop Photo</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 mb-2 rounded bg-white text-sm" />
            {bannerImage && <img src={bannerImage} alt="Preview" className="w-full h-48 object-cover rounded-lg shadow-sm border mt-2" />}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <input className="w-full border p-3 rounded bg-gray-50" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Official Shop Name" />
            <input className="w-full border p-3 rounded bg-gray-50" value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="Full Address" />
          </div>
          
          <button onClick={handleUpdateShop} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-blue-700">Save Changes</button>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {token && myShop && !isEditingShop && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-6 rounded shadow-md h-fit">
            <h2 className="text-xl font-bold mb-4">Add Service</h2>
            <input className="w-full border p-2 mb-2 rounded text-sm bg-gray-50" value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="Service Name" />
            <div className="flex gap-2 mb-4">
              <input className="w-1/2 border p-2 rounded text-sm bg-gray-50" type="number" value={servicePrice} onChange={e => setServicePrice(e.target.value)} placeholder="Price (₹)" />
              <input className="w-1/2 border p-2 rounded text-sm bg-gray-50" type="number" value={serviceDuration} onChange={e => setServiceDuration(e.target.value)} placeholder="Mins" />
            </div>
            <button onClick={handleAddService} className="w-full bg-black text-white py-2 rounded font-bold text-sm">Add to Menu</button>
          </div>
          <div className="col-span-2 bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">Live Queue <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full animate-pulse">Live</span></h2>
            {queue.length === 0 ? (
              <p className="text-gray-500 italic p-4 text-center border-2 border-dashed rounded">No bookings yet today.</p>
            ) : (
              <div className="grid gap-3">
                {queue.map((booking) => (
                  <div key={booking._id} className="border p-4 rounded-lg flex justify-between items-center bg-gray-50">
                    <div>
                      <p className="font-bold text-lg">{booking.timeSlot} <span className="text-sm font-normal text-gray-500">- {booking.serviceId?.name}</span></p>
                      <p className="text-sm text-gray-600">Customer: {booking.customerId?.name} | Paid: ₹{booking.payment?.amount}</p>
                      <p className="text-xs mt-1 font-bold text-blue-600 uppercase">Status: {booking.status}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {booking.status === 'pending' && <button onClick={() => handleUpdateStatus(booking._id, 'in-chair')} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm font-bold shadow">Mark "In Chair"</button>}
                      {booking.status === 'in-chair' && <button onClick={() => handleUpdateStatus(booking._id, 'completed')} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold shadow">Mark "Done"</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}