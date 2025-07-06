import React, { useState } from "react";

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = (e) => {
    e.preventDefault();
    // TODO: Add backend API call here
    console.log("Signup:", form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] to-[#302b63] text-white">
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-10 shadow-xl w-full max-w-md border border-purple-500/40">
        <h2 className="text-3xl font-bold text-center mb-6">Sign Up</h2>
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block mb-1 text-sm">Name</label>
            <input
              type="text"
              name="name"
              className="w-full px-4 py-2 rounded bg-transparent border border-purple-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Email</label>
            <input
              type="email"
              name="email"
              className="w-full px-4 py-2 rounded bg-transparent border border-purple-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Password</label>
            <input
              type="password"
              name="password"
              className="w-full px-4 py-2 rounded bg-transparent border border-purple-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              onChange={handleChange}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded bg-purple-600 hover:bg-purple-700 transition font-semibold"
          >
            Sign Up
          </button>
        </form>
        <p className="text-sm mt-4 text-center text-purple-300">
          Already have an account? <a href="/login" className="underline">Log In</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
