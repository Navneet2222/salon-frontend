import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

// Point this to your Node.js backend
const API_URL = 'http://localhost:5000/api'; 
const socket = io('http://localhost:5000');

export default function CustomerView() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('test@customer.com');
  const [password, setPassword] = useState('password123');

  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const availableSlots = ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"];

  useEffect(() => {
    fetch(`${API_URL}/shops`)
      .then(res => res.json())
      .then(data => setShops(data))
      .catch(err => console.error("Error fetching shops:", err));
  }, []);

  const handleShopSelect = (shop) => {
    setSelectedShop(shop);
    setSelectedService(null);
    
    fetch(`${API_URL}/services/${shop._id}`)
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error("Error fetching services:", err));

    socket.emit('joinShopRoom', shop._id);
  };

  const handleQuickLogin = async () => {
    try {
      let res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Test Customer", email, password, role: "customer", phone: "9999999999" })
      });
      let data = await res.json();

      if (res.status === 400) {
        res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        data = await res.json();
      }

      if (data.token) {
        setToken(data.token);
        alert("Logged in successfully!");
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const handleBooking = async () => {
    if (!token) return alert("Please login first!");
    if (!selectedSlot) return alert("Please pick a time!");

    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shopId: selectedShop._id,
          serviceId: selectedService._id,
          appointmentDate: new Date().toISOString().split('T')[0],
          timeSlot: selectedSlot,
          advanceAmount: 50
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Booking Confirmed! The Barber's dashboard just updated.");
        setSelectedSlot(null);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Booking failed:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen p-4 font-sans">
      <Link to="/" className="text-blue-600 text-sm font-semibold mb-4 inline-block">&larr; Back to Home</Link>
      
      {!token && (
        <div className="bg-yellow-100 p-3 mb-4 rounded border border-yellow-300 text-sm">
          <p className="font-bold mb-2">Step 1: Authenticate</p>
          <button onClick={handleQuickLogin} className="bg-black text-white px-4 py-2 rounded w-full">
            Quick Auto-Login as Customer
          </button>
        </div>
      )}

      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">The Salon Marketplace</h1>
        <p className="text-sm text-gray-500">Find a shop & skip the wait</p>
      </header>

      {!selectedShop && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Select a Nearby Shop</h2>
          <div className="grid gap-3">
            {shops.length === 0 ? <p className="text-gray-500 p-4 border rounded bg-white text-center">No shops available. Create one in the Owner Dashboard!</p> : null}
            {shops.map(shop => (
              <div 
                key={shop._id}
                onClick={() => handleShopSelect(shop)}
                className="p-4 border rounded-lg cursor-pointer bg-white hover:border-blue-500 hover:shadow-md transition-all"
              >
                <p className="font-bold text-lg">{shop.name}</p>
                <p className="text-sm text-gray-500">{shop.address}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedShop && (
        <div>
          <button onClick={() => setSelectedShop(null)} className="text-blue-600 text-sm font-semibold mb-4">
            &larr; Back to Shops
          </button>
          
          <h2 className="text-xl font-bold mb-4">{selectedShop.name}</h2>

          <h3 className="text-md font-semibold mb-2">1. Select Service</h3>
          <div className="grid gap-2 mb-6">
            {services.length === 0 ? <p className="text-sm text-gray-500">This shop hasn't added any services yet.</p> : null}
            {services.map(service => (
              <div 
                key={service._id}
                onClick={() => setSelectedService(service)}
                className={`p-3 border rounded cursor-pointer flex justify-between ${selectedService?._id === service._id ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}
              >
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.durationMinutes} mins</p>
                </div>
                <p className="font-bold">₹{service.price}</p>
              </div>
            ))}
          </div>

          {selectedService && (
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">2. Pick a Time Today</h3>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded text-sm font-medium transition-colors ${
                      selectedSlot === slot ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSlot && (
            <button 
              onClick={handleBooking}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 shadow-lg"
            >
              Pay ₹50 Advance & Confirm
            </button>
          )}
        </div>
      )}
    </div>
  );
}