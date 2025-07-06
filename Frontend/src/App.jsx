// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Landing from "./pages/landing";
import Login   from "./pages/login";
import Signup  from "./pages/signup";
// (You can add UserDashboard or OtpPage here later)

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing stays at root */}
        <Route path="/" element={<Landing />} />

        {/* New routes */}
        <Route path="/login"  element={<Login />}  />
        <Route path="/signup" element={<Signup />} />

        {/* Fallback: redirect unknown URLs back to landing */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </Router>
  );
}

export default App;
