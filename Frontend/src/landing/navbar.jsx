import React from "react";
import logo from "";
const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-4 bg-gradient-to-r from-primary to-secondary shadow-md">
      <div className="flex items-center space-x-4">
        <img src={logo} alt="CampVerse Logo" className="h-10" />
        <span className="text-xl font-bold text-white">CampVerse</span>
      </div>
      <div className="hidden md:flex space-x-8">
        <a href="#" className="text-white hover:text-gray-200">
          Home
        </a>
        <a href="#" className="text-white hover:text-gray-200">
          Events
        </a>
        <a href="#" className="text-white hover:text-gray-200">
          About
        </a>
        <a href="#" className="text-white hover:text-gray-200">
          Contact
        </a>
      </div>
      <div className="md:hidden">
        <button>
          <i className="ri-menu-line text-white text-2xl"></i>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
