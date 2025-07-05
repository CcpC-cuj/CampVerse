import React, { useState } from "react";

const Navbar = () => {
  const [hovered, setHovered] = useState(null); // null | 'login' | 'signup'

  return (
    <nav className="fixed top-0 left-0 w-full z-20 backdrop-blur-md bg-[#0b0f2b]/70 border-b border-gray-300 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <a
          href="#"
          className="text-3xl font-semibold text-white tracking-wide transition-transform duration-300"
        >
          CampVerse
        </a>

        <div className="hidden md:flex space-x-10">
        <a
          href="#features"
          className="relative text-gray-300 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
        >
          Features
        </a>

          <a href="#events" className="relative text-gray-300 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full">Events</a>
          <a href="#testimonials" className="relative text-gray-300 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full">Testimonials</a>
          <a href="#faq" className="relative text-gray-300 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full">FAQ</a>
        </div>

        <div className="flex items-center space-x-4">
          <button
            className={`px-5 py-2 rounded-full text-white transition duration-300 ${
              hovered === "signup" ? "bg-transparent" : "bg-white/10"
            } hover:scale-105`}
            onMouseEnter={() => setHovered("login")}
            onMouseLeave={() => setHovered(null)}
          >
            Log In
          </button>

          <button
            className="px-5 py-2 rounded-full text-white bg-primary hover:bg-primary/80 hover:bg-white/10 hover:scale-105 transition duration-300"
            onMouseEnter={() => setHovered("signup")}
            onMouseLeave={() => setHovered(null)}
          >
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
