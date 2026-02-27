import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const API_URL = 'https://salon-backend-hlzb.onrender.com/api'; 
const socket = io('https://salon-backend-hlzb.onrender.com');

export default function CustomerView() {
  // --- AUTHENTICATION STATE ---
  const [token, setToken] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // --- APP STATE ---
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const availableSlots = ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "2:00 PM"];

  useEffect(() => {
    fetch(`${API_URL}/shops`)
      .then(res => res.json())
      .then(data => setShops(data))
      .catch(err => console.error("Error fetching shops:", err));
  }, []);

  const handleLogout = () => {
    setToken(null);
    setSelectedShop(null);
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
    const payload = isLoginMode 
      ? { phone, password } 
      : { name, phone, password, role: "customer", email: `${phone}@placeholder.com` };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.token) {
        setToken(data.token);
        alert(isLoginMode ? "Welcome back!" : "Account created successfully!");
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) return alert("Please pick a time!");
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
        alert("Booking Confirmed! The shop owner has been notified.");
        setSelectedSlot(null);
      } else {
        const data = await res.json(); alert(data.message);
      }
    } catch (error) { console.error("Booking failed:", error); }
  };

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
            <input type="tel" placeholder="Phone Number" required className="border p-3 rounded" value={phone} onChange={e => setPhone(e.target.value)} />
            <input type="password" placeholder="Password" required className="border p-3 rounded" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">
              {isLoginMode ? 'Secure Login' : 'Sign Up'}
            </button>
          </form>
          <p className="mt-4 text-sm text-center text-gray-600">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
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
            <p className="text-sm text-gray-500">Find a shop & skip the wait</p>
          </header>

          {!selectedShop && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Select a Nearby Shop</h2>
              <div className="grid gap-3">
                {shops.map(shop => (
                  <div key={shop._id} onClick={() => handleShopSelect(shop)} className="p-4 border rounded-lg cursor-pointer bg-white shadow-sm hover:border-blue-500 transition-all">
                    <p className="font-bold text-lg">{shop.name}</p>
                    <p className="text-sm text-gray-500">{shop.address}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedShop && (
            <div>
              <button onClick={() => setSelectedShop(null)} className="text-blue-600 text-sm font-semibold mb-4">&larr; Back to Shops</button>
              <h2 className="text-xl font-bold mb-4">{selectedShop.name}</h2>
              <h3 className="text-md font-semibold mb-2">1. Select Service</h3>
              <div className="grid gap-2 mb-6">
                {services.map(service => (
                  <div key={service._id} onClick={() => setSelectedService(service)} className={`p-3 border rounded cursor-pointer flex justify-between ${selectedService?._id === service._id ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}>
                    <div><p className="font-medium">{service.name}</p><p className="text-xs text-gray-500">{service.durationMinutes} mins</p></div>
                    <p className="font-bold">₹{service.price}</p>
                  </div>
                ))}
              </div>
              {selectedService && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-2">2. Pick a Time Today</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(slot => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-2 rounded text-sm font-medium transition-colors ${selectedSlot === slot ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedSlot && (
                <button onClick={handleBooking} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 shadow-lg">
                  Pay ₹50 Advance & Confirm
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}