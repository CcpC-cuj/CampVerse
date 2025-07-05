import React from "react";

const Navbar = () => {
  return (
    <nav className="relative z-10 px-6 py-4 border-b border-gray-800 bg-[#0b0f2b]">
      <div className="container mx-auto flex justify-between items-center">
        <a href="#" className="logo text-2xl font-bold text-white glow-text">
          CampVerse
        </a>
        <div className="hidden md:flex space-x-8 items-center">
          <a href="#features" className="text-gray-300 hover:text-white">
            Features
          </a>
          <a href="#events" className="text-gray-300 hover:text-white">
            Events
          </a>
          <a href="#testimonials" className="text-gray-300 hover:text-white">
            Testimonials
          </a>
          <a href="#faq" className="text-gray-300 hover:text-white">
            FAQ
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 text-white border border-primary rounded-button hover:bg-primary/20">
            Log In
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-button hover:bg-primary/80">
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
