import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const API_URL = 'https://salon-backend-hlzb.onrender.com/api';
const socket = io('https://salon-backend-hlzb.onrender.com');

export default function OwnerDashboard() {
  // Auth State
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('barber@shop.com');
  const [password, setPassword] = useState('password123');

  // Dashboard State
  const [myShop, setMyShop] = useState(null);
  const [queue, setQueue] = useState([]);

  // Form States
  const [shopName, setShopName] = useState('Urban Fade Studio');
  const [shopAddress, setShopAddress] = useState('123 Main St, Bangalore');
  const [serviceName, setServiceName] = useState('Premium Fade');
  const [servicePrice, setServicePrice] = useState('350');
  const [serviceDuration, setServiceDuration] = useState('30');

  // Real-time listener for new bookings
  useEffect(() => {
    socket.on('newBooking', (booking) => {
      alert('🔔 New Booking Alert!');
      setQueue((prevQueue) => [...prevQueue, booking]);
    });

    return () => socket.off('newBooking');
  }, []);

  // Auth: Quick Login/Register
  const handleQuickLogin = async () => {
    try {
      let res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Barber Owner", email, password, role: "shop_owner", phone: "8888888888" })
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
        fetchMyShop(data.token);
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  // Fetch Owner's Shop Details
  const fetchMyShop = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/shops/owner/my-shop`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const shopData = await res.json();
        setMyShop(shopData);
        fetchQueue(shopData._id, authToken);
        socket.emit('joinShopRoom', shopData._id); // Join the real-time room!
      }
    } catch (error) {
      console.error("Error fetching shop:", error);
    }
  };

  // Create a Shop Profile
  const handleCreateShop = async () => {
    try {
      const res = await fetch(`${API_URL}/shops`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: shopName, address: shopAddress })
      });
      if (res.ok) {
        alert("Shop created! You are now live.");
        fetchMyShop(token);
      }
    } catch (error) {
      console.error("Error creating shop:", error);
    }
  };

  // Add a Service to the Menu
  const handleAddService = async () => {
    try {
      const res = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: serviceName, price: Number(servicePrice), durationMinutes: Number(serviceDuration) })
      });
      if (res.ok) {
        alert(`${serviceName} added to your menu!`);
        setServiceName('');
        setServicePrice('');
      }
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  // Fetch Live Queue
  const fetchQueue = async (shopId, authToken) => {
    try {
      const res = await fetch(`${API_URL}/bookings/queue?shopId=${shopId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        setQueue(await res.json());
      }
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  };

  // Update Booking Status
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Update local state to reflect change instantly
        setQueue(queue.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 min-h-screen p-6 font-sans">
      <Link to="/" className="text-blue-600 text-sm font-semibold mb-4 inline-block">&larr; Back to Home</Link>
      
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Partner Portal (Owner)</h1>
        <p className="text-gray-500">Manage your barbershop, menu, and live queue.</p>
      </header>

      {/* STEP 1: LOGIN */}
      {!token && (
        <div className="bg-white p-6 rounded shadow-md max-w-sm">
          <h2 className="text-xl font-bold mb-4">Owner Login</h2>
          <button onClick={handleQuickLogin} className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700">
            Quick Auto-Login as Barber
          </button>
        </div>
      )}

      {/* STEP 2: CREATE SHOP (If no shop exists) */}
      {token && !myShop && (
        <div className="bg-white p-6 rounded shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Setup Your Shop Profile</h2>
          <input className="w-full border p-2 mb-3 rounded" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Shop Name" />
          <input className="w-full border p-2 mb-4 rounded" value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="Address" />
          <button onClick={handleCreateShop} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Launch Shop</button>
        </div>
      )}

      {/* STEP 3: MANAGE SHOP & QUEUE (If shop exists) */}
      {token && myShop && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Menu Management */}
          <div className="col-span-1 bg-white p-6 rounded shadow-md h-fit">
            <h2 className="text-xl font-bold mb-4">Add Service</h2>
            <input className="w-full border p-2 mb-2 rounded text-sm" value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="Service Name (e.g. Haircut)" />
            <div className="flex gap-2 mb-4">
              <input className="w-1/2 border p-2 rounded text-sm" type="number" value={servicePrice} onChange={e => setServicePrice(e.target.value)} placeholder="Price (₹)" />
              <input className="w-1/2 border p-2 rounded text-sm" type="number" value={serviceDuration} onChange={e => setServiceDuration(e.target.value)} placeholder="Mins" />
            </div>
            <button onClick={handleAddService} className="w-full bg-black text-white py-2 rounded font-bold text-sm">Add to Menu</button>
          </div>

          {/* Right Column: Live Queue */}
          <div className="col-span-2 bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              Live Queue 
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full animate-pulse">Live</span>
            </h2>
            
            {queue.length === 0 ? (
              <p className="text-gray-500 italic">No bookings yet today. Waiting for customers...</p>
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
                      {booking.status === 'pending' && (
                        <button onClick={() => handleUpdateStatus(booking._id, 'in-chair')} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm font-bold shadow">
                          Mark "In Chair"
                        </button>
                      )}
                      {booking.status === 'in-chair' && (
                        <button onClick={() => handleUpdateStatus(booking._id, 'completed')} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold shadow">
                          Mark "Done"
                        </button>
                      )}
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