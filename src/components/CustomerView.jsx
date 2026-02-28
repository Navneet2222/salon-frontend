import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const API_URL = 'https://salon-backend-hlzb.onrender.com/api'; 
const socket = io('https://salon-backend-hlzb.onrender.com');

// Auto-generate time slots from 10:00 AM to 10:00 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 10; i <= 21; i++) { 
    const hour = i > 12 ? i - 12 : i;
    const ampm = i >= 12 ? 'PM' : 'AM';
    slots.push(`${hour}:00 ${ampm}`);
    slots.push(`${hour}:30 ${ampm}`);
  }
  slots.push("10:00 PM");
  return slots;
};

export default function CustomerView() {
  const [token, setToken] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');

  const [shops, setShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Use the new dynamically generated array!
  const availableSlots = generateTimeSlots();

  useEffect(() => {
    fetch(`${API_URL}/shops`)
      .then(res => res.json())
      .then(data => setShops(data))
      .catch(err => console.error("Error fetching shops:", err));
  }, []);

  const handleLogout = () => {
    setToken(null);
    setSelectedShop(null);
    setSearchQuery('');
    alert("Logged out successfully!");
  };

  const handleShopSelect = (shop) => {
    setSelectedShop(shop);
    setSelectedService(null);
    fetch(`${API_URL}/services/${shop._id}`)
      .then(res => res.json())
      .then(data => setServices(data));
    socket.emit('joinShopRoom', shop._id);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    const isEmail = phoneOrEmail.includes('@');
    const payload = isLoginMode 
      ? { [isEmail ? 'email' : 'phone']: phoneOrEmail, password } 
      : { name, [isEmail ? 'email' : 'phone']: phoneOrEmail, password, role: "customer", email: isEmail ? phoneOrEmail : `${phoneOrEmail}@customer.com` };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        alert(isLoginMode ? "Welcome back!" : "Account created!");
      } else {
        alert(data.message || "Auth failed");
      }
    } catch (error) { console.error("Auth error:", error); }
  };

  const handleBooking = async () => {
    if (!selectedSlot) return alert("Pick a time!");
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          shopId: selectedShop._id, serviceId: selectedService._id,
          appointmentDate: new Date().toISOString().split('T')[0],
          timeSlot: selectedSlot, advanceAmount: 50
        })
      });
      if (res.ok) {
        alert("Booking Confirmed!");
        setSelectedSlot(null);
      } else {
        const data = await res.json(); alert(data.message);
      }
    } catch (error) { console.error("Booking failed:", error); }
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    shop.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen p-4 font-sans">
      <div className="flex justify-between items-center mb-4">
        <Link to="/" className="text-blue-600 text-sm font-semibold">&larr; Back to Home</Link>
        {token && (
          <button onClick={handleLogout} className="text-red-500 text-sm font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50">
            Logout
          </button>
        )}
      </div>
      
      {!token && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-center">{isLoginMode ? 'Customer Login' : 'Create Account'}</h2>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLoginMode && (
              <input type="text" placeholder="Full Name" required className="border p-3 rounded" value={name} onChange={e => setName(e.target.value)} />
            )}
            <input type="text" placeholder="Phone or Email" required className="border p-3 rounded" value={phoneOrEmail} onChange={e => setPhoneOrEmail(e.target.value)} />
            <input type="password" placeholder="Password" required className="border p-3 rounded" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">
              {isLoginMode ? 'Secure Login' : 'Sign Up'}
            </button>
          </form>
          <p className="mt-4 text-sm text-center text-gray-600">
            {isLoginMode ? "Need an account? " : "Already registered? "}
            <span className="text-blue-600 cursor-pointer font-bold hover:underline" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </div>
      )}

      {token && (
        <>
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800">The Salon Marketplace</h1>
          </header>
          
          {!selectedShop && (
            <div>
              <div className="mb-6">
                <input 
                  type="text" 
                  placeholder="Search by area or shop name..." 
                  className="w-full border-2 border-gray-200 p-3 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid gap-4">
                {filteredShops.length === 0 ? (
                  <p className="text-gray-500 text-center p-4 bg-white rounded border">No shops found matching your search.</p>
                ) : (
                  filteredShops.map(shop => (
                    <div key={shop._id} onClick={() => handleShopSelect(shop)} className="border rounded-xl cursor-pointer bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden">
                      {shop.bannerImage ? (
                        <img src={shop.bannerImage} alt={shop.name} className="w-full h-40 object-cover bg-gray-100" />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-medium">
                          No Shop Photo
                        </div>
                      )}
                      <div className="p-4">
                        <p className="font-bold text-lg text-gray-900">{shop.name}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{shop.address}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedShop && (
            <div>
              <button onClick={() => setSelectedShop(null)} className="text-blue-600 text-sm font-semibold mb-4">&larr; Back to Shops</button>
              
              {selectedShop.bannerImage && (
                <img src={selectedShop.bannerImage} alt={selectedShop.name} className="w-full h-48 object-cover rounded-xl mb-4 shadow-sm" />
              )}
              
              <h2 className="text-2xl font-bold mb-1">{selectedShop.name}</h2>
              <p className="text-sm text-gray-500 mb-6">{selectedShop.address}</p>

              <h3 className="text-md font-bold text-gray-800 mb-3">1. Select Service</h3>
              <div className="grid gap-2 mb-6">
                {services.map(service => (
                  <div key={service._id} onClick={() => setSelectedService(service)} className={`p-4 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${selectedService?._id === service._id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'bg-white hover:border-gray-400'}`}>
                    <div>
                      <p className="font-bold text-gray-800">{service.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{service.durationMinutes} mins</p>
                    </div>
                    <p className="font-black text-lg text-green-600">₹{service.price}</p>
                  </div>
                ))}
              </div>
              
              {selectedService && (
                <div className="mb-8">
                  <h3 className="text-md font-bold text-gray-800 mb-3">2. Pick a Time Today</h3>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                    {availableSlots.map(slot => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-3 rounded-lg text-sm font-bold transition-all ${selectedSlot === slot ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedSlot && (
                <button onClick={handleBooking} className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-900 shadow-xl flex justify-center items-center gap-2 mt-4">
                  <span>Pay ₹50 Advance & Book</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}