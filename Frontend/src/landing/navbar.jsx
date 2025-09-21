import React, { useState } from "react";
import { Menu, X } from "lucide-react";

const Navbar = ({ onLoginClick, onSignupClick }) => {
  const [hovered, setHovered] = useState(null); // Track hovered button
  const [isOpen, setIsOpen] = useState(false); // Mobile menu toggle

  const navLinks = ["features", "events", "testimonials", "faq"];

  return (
    <nav className="fixed top-0 left-0 w-full z-20 backdrop-blur-md bg-[#0b0f2b]/70 border-b border-gray-300 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <span className="text-3xl font-semibold text-white tracking-wide">
          CampVerse
        </span>

        {/* Desktop Nav links */}
        <div className="hidden md:flex space-x-10">
          {navLinks.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="relative text-gray-300 hover:text-white transition-colors duration-300 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-white hover:after:w-full after:transition-all after:duration-300"
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </a>
          ))}
        </div>

        {/* Desktop Auth buttons */}
        <div className="hidden md:flex space-x-4">
          <button
            aria-label="Open login modal"
            onClick={onLoginClick}
            onMouseEnter={() => setHovered("login")}
            onMouseLeave={() => setHovered(null)}
            className={`px-5 py-2 rounded-full text-white transition duration-300
              ${hovered === "login" ? "bg-[#9b5de5]" : "bg-white/10"}
              ${hovered === "login" ? "" : ""}
            `}
          >
            Log In
          </button>

          <button
            aria-label="Open signup modal"
            onClick={onSignupClick}
            onMouseEnter={() => setHovered("signup")}
            onMouseLeave={() => setHovered(null)}
            className={`px-5 py-2 rounded-full text-white transition duration-300
              ${hovered === "login" ? "bg-transparent" : "bg-[#9b5de5]"}
            `}
          >
            Sign Up
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-white" aria-label="Toggle menu">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-6 pb-4 space-y-4 bg-[#0b0f2b]/90 backdrop-blur-md">
          {navLinks.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              onClick={() => setIsOpen(false)}
              className="block text-gray-300 hover:text-white transition-colors duration-300"
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </a>
          ))}

          <button
            onClick={() => {
              onLoginClick();
              setIsOpen(false);
            }}
            className="block w-full text-left px-5 py-2 rounded-full text-white bg-white/10 hover:scale-105 transition duration-300"
          >
            Log In
          </button>

          <button
            onClick={() => {
              onSignupClick();
              setIsOpen(false);
            }}
            className="block w-full text-left px-5 py-2 rounded-full text-white bg-[#9b5de5] hover:bg-white/10 hover:scale-105 transition duration-300"
          >
            Sign Up
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
