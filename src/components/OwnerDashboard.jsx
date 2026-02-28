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
  const [myServices, setMyServices] = useState([]); 
  
  // Shop Setup & Edit State
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [bannerImage, setBannerImage] = useState(''); 
  
  // Service Data & Edit State
  const [editingServiceId, setEditingServiceId] = useState(null);
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
    setMyServices([]);
    setIsEditingShop(false);
    alert("Logged out successfully!");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    const isEmail = phoneOrEmail.includes('@');
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
        alert(data.message || data.error || "Authentication failed. Please check your details.");
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
        fetchMyServices(shopData._id); 
        socket.emit('joinShopRoom', shopData._id); 
      }
    } catch (error) { 
      console.error("Error fetching shop:", error); 
    }
  };

  const fetchMyServices = async (shopId) => {
    try {
      const res = await fetch(`${API_URL}/services/${shopId}`);
      if (res.ok) {
        const data = await res.json();
        setMyServices(data);
      }
    } catch (error) { console.error("Error fetching services:", error); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return alert("Please choose an image smaller than 5MB!");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateShop = async () => {
    if(!shopName || !shopAddress) return alert("Please fill in both fields.");
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
        alert(data.message || data.error || "Failed to create shop.");
      }
    } catch (error) { 
      alert("Network Error: Image might be too large, or backend is restarting.");
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

  // NEW: Save Service (Handles both Create and Update)
  const handleSaveService = async () => {
    if(!serviceName || !servicePrice || !serviceDuration) return alert("Please fill out all service details.");
    
    const url = editingServiceId ? `${API_URL}/services/${editingServiceId}` : `${API_URL}/services`;
    const method = editingServiceId ? 'PUT' : 'POST';
    const bodyPayload = editingServiceId 
      ? { name: serviceName, price: Number(servicePrice), durationMinutes: Number(serviceDuration) }
      : { shopId: myShop._id, name: serviceName, price: Number(servicePrice), durationMinutes: Number(serviceDuration) };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bodyPayload)
      });
      
      if (res.ok) {
        alert(editingServiceId ? 'Menu updated!' : `${serviceName} added to menu!`);
        cancelServiceEdit();
        fetchMyServices(myShop._id);
      } else {
        const data = await res.json();
        alert(data.message || data.error || "Failed to save service.");
      }
    } catch (error) { 
      console.error("Error saving service:", error); 
    }
  };

  // NEW: Populate edit form
  const handleEditServiceClick = (service) => {
    setEditingServiceId(service._id);
    setServiceName(service.name);
    setServicePrice(service.price);
    setServiceDuration(service.durationMinutes);
  };

  // NEW: Cancel edit
  const cancelServiceEdit = () => {
    setEditingServiceId(null);
    setServiceName('');
    setServicePrice('');
    setServiceDuration('');
  };

  // NEW: Delete Service
  const handleDeleteService = async (serviceId) => {
    if(!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        fetchMyServices(myShop._id);
      }
    } catch(error) {
      console.error("Failed to delete", error);
    }
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

      {/* Login & Registration Block (Hidden when logged in) */}
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

      {/* Shop Creation Block */}
      {token && !myShop && (
        <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-blue-600 mb-8 max-w-lg mx-auto mt-10">
          <div className="text-center mb-6">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Step 2 of 2</span>
            <h2 className="text-2xl font-bold mt-4">Launch Your Storefront</h2>
          </div>
          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Upload Shop Photo (Gallery)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 mb-3 rounded bg-white text-sm" />
            {bannerImage && <img src={bannerImage} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-sm border" />}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Official Shop Name</label>
            <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. Urban Fade Studio" />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-1">Full Location Address</label>
            <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="e.g. 123 Main St, Indiranagar, Bangalore" />
          </div>
          <button onClick={handleCreateShop} className="w-full bg-green-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg">
            Go Live on the Marketplace 🚀
          </button>
        </div>
      )}

      {/* Edit Shop Profile */}
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
              <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopName} onChange={e => setShopName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
              <input className="w-full border p-3 rounded-lg bg-gray-50" value={shopAddress} onChange={e => setShopAddress(e.target.value)} />
            </div>
          </div>
          <button onClick={handleUpdateShop} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 shadow-md">Save Changes</button>
        </div>
      )}

      {/* Main Dashboard Panel */}
      {token && myShop && !isEditingShop && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="col-span-1 flex flex-col gap-6">
            {/* Service Form (Add/Edit) */}
            <div className={`p-6 rounded-xl shadow-md border ${editingServiceId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">{editingServiceId ? 'Edit Service' : 'Add Service'}</h2>
                {editingServiceId && (
                  <button onClick={cancelServiceEdit} className="text-xs text-gray-500 font-bold hover:text-gray-800">Cancel</button>
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Service Name</label>
                <input className="w-full border p-3 rounded-lg text-sm bg-white" value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="e.g. Premium Haircut" />
              </div>
              <div className="flex gap-3 mb-5">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Price</label>
                  <input className="w-full border p-3 rounded-lg text-sm bg-white" type="number" value={servicePrice} onChange={e => setServicePrice(e.target.value)} placeholder="₹" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Duration</label>
                  <input className="w-full border p-3 rounded-lg text-sm bg-white" type="number" value={serviceDuration} onChange={e => setServiceDuration(e.target.value)} placeholder="Mins" />
                </div>
              </div>
              <button 
                onClick={handleSaveService} 
                className={`w-full text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-md ${editingServiceId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-gray-800'}`}
              >
                {editingServiceId ? 'Save Updates' : 'Add to Menu'}
              </button>
            </div>

            {/* Current Menu List */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Your Menu</h2>
              {myServices.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center p-4 border rounded bg-gray-50">No services added yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {myServices.map(service => (
                    <div key={service._id} className="flex flex-col border border-gray-100 bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm text-gray-800">{service.name}</p>
                          <p className="text-xs text-gray-500">{service.durationMinutes} mins</p>
                        </div>
                        <p className="font-bold text-green-600 text-sm">₹{service.price}</p>
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <button onClick={() => handleEditServiceClick(service)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">Edit</button>
                        <button onClick={() => handleDeleteService(service._id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Live Queue */}
          <div className="col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-between text-gray-800">
              Today's Live Queue 
              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full animate-pulse uppercase tracking-wide font-bold flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Live
              </span>
            </h2>
            
            {queue.length === 0 ? (
              <div className="text-gray-500 italic p-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <p className="text-lg mb-1">No bookings yet today.</p>
                <p className="text-sm">Keep your dashboard open to receive live updates.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {queue.map((booking) => (
                  <div key={booking._id} className="border border-gray-200 p-5 rounded-xl flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-bold text-xl text-gray-900">{booking.timeSlot} <span className="text-base font-normal text-gray-500 ml-1">- {booking.serviceId?.name}</span></p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold">Customer:</span> {booking.customerId?.name} &nbsp;|&nbsp; 
                        <span className="font-semibold">Paid:</span> <span className="text-green-600">₹{booking.payment?.amount}</span>
                      </p>
                      <p className="text-xs mt-2 font-bold text-blue-600 uppercase bg-blue-50 inline-block px-2 py-1 rounded">Status: {booking.status}</p>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      {booking.status === 'pending' && <button onClick={() => handleUpdateStatus(booking._id, 'in-chair')} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-yellow-600 transition-colors">Mark "In Chair"</button>}
                      {booking.status === 'in-chair' && <button onClick={() => handleUpdateStatus(booking._id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-green-700 transition-colors">Mark "Done"</button>}
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