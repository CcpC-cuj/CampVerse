import React, { useState } from "react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: Add backend API call here
    console.log("Login:", email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] to-[#302b63] text-white">
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-10 shadow-xl w-full max-w-md border border-purple-500/40">
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block mb-1 text-sm">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 rounded bg-transparent border border-purple-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded bg-transparent border border-purple-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded bg-purple-600 hover:bg-purple-700 transition font-semibold"
          >
            Log In
          </button>
        </form>
        <p className="text-sm mt-4 text-center text-purple-300">
          Don’t have an account? <a href="/signup" className="underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
