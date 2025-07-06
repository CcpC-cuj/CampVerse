import React, { useState } from "react";

const Navbar = ({ onLoginClick, onSignupClick }) => {
  const [hovered, setHovered] = useState("login"); // Default: hover on "login"

  return (
    <nav className="fixed top-0 left-0 w-full z-20 backdrop-blur-md bg-[#0b0f2b]/70 border-b border-gray-300 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <span className="text-3xl font-semibold text-white tracking-wide">
          CampVerse
        </span>

        {/* Nav links */}
        <div className="hidden md:flex space-x-10">
          {["features", "events", "testimonials", "faq"].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="relative text-gray-300 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-white hover:after:w-full after:transition-all after:duration-300"
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="flex space-x-4">
          {/* Log In */}
          <button
            onClick={onLoginClick}
            onMouseEnter={() => setHovered("login")}
            onMouseLeave={() => setHovered(null)}
            className={`px-5 py-2 rounded-full text-white transition duration-300 ${
              hovered === "signup" ? "bg-transparent" : "bg-white/10"
            } hover:scale-105`}
          >
            Log In
          </button>

          {/* Sign Up */}
          <button
            onClick={onSignupClick}
            onMouseEnter={() => setHovered("signup")}
            onMouseLeave={() => setHovered(null)}
            className="px-5 py-2 rounded-full text-white bg-primary hover:bg-white/10 hover:scale-105 transition duration-300"
          >
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
