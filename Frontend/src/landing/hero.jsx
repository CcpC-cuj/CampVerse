// src/landing/hero.jsx
import React from "react";

// Accept onSignupClick prop
const Hero = ({ onSignupClick }) => {
  return (
    <section id="home" className="hero-bg relative z-0 py-20 md:py-32">
      <div className="container mx-auto px-6 w-full">
        <div className="flex flex-col md:flex-row items-center">
          {/* Left Content */}
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white"
              style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
            >
              Uniting Campuses.<br />Empowering Talent.
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-lg">
              Discover, register, and participate in cultural, technical, and
              academic events across colleges in India with just a few clicks.
            </p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Join button */}
              <button
                aria-label="Join with College Email"
                onClick={onSignupClick}
                className="px-6 py-3 border border-[#9b5de5] text-white rounded-full text-lg font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-[#9b5de5] transition-colors whitespace-nowrap hover:bg-[#9b5de5]/20"
              >
                Join with College Email
              </button>

              {/* Explore button */}
              <button
                aria-label="Explore events"
                onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-3 border border-[#9b5de5] text-white rounded-full text-lg font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-[#9b5de5] transition-colors whitespace-nowrap hover:bg-[#9b5de5]/20"
              >
                Explore Events
              </button>
            </div>
          </div>

          {/* Right Image */}
          <div className="md:w-1/2 flex justify-center">
            <img
              src="https://readdy.ai/api/search-image?query=futuristic%2520digital%2520interface%2520showing%2520college%2520events%2520and%2520activities%252C%2520holographic%2520display%2520with%2520event%2520cards%2520floating%2520in%2520space%252C%2520cosmic%2520background%252C%2520purple%2520and%2520blue%2520glowing%2520elements%252C%2520high%2520quality%252C%2520detailed%2520UI%2520visualization&width=600&height=500&seq=hero1&orientation=landscape"
              alt="CampVerse Platform"
              className="rounded-lg shadow-2xl glow-effect max-w-full h-auto"
            />
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex justify-center mt-16">
          <div className="bg-gray-900/60 backdrop-blur-sm py-4 px-8 rounded-full flex flex-wrap justify-center gap-x-8 gap-y-2 glow-effect">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-white mr-2">500+</span>
              <span className="text-gray-300">Colleges</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-white mr-2">3000+</span>
              <span className="text-gray-300">Events</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-white mr-2">10,000+</span>
              <span className="text-gray-300">Participants</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
