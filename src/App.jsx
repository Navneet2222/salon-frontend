import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerView from './components/CustomerView'; 
import OwnerDashboard from './components/OwnerDashboard'; // <-- We imported the new dashboard!

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">The Salon Marketplace</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        The smartest way to manage barbershop queues. Choose your portal below.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link 
          to="/customer" 
          className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg"
        >
          I need a Haircut ✂️
        </Link>
        <Link 
          to="/owner" 
          className="flex-1 bg-white text-blue-600 border-2 border-blue-600 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg"
        >
          I am a Shop Owner 🏬
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/customer" element={<CustomerView />} /> 
        <Route path="/owner" element={<OwnerDashboard />} /> {/* <-- Connected the route here! */}
      </Routes>
    </Router>
  );
}