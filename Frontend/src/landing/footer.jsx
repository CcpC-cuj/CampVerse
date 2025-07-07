import React from "react";
import "remixicon/fonts/remixicon.css";

const Footer = () => {
  return (
    <footer className="bg-gray-900 pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <a href="#" className="logo text-2xl font-bold text-white glow-text mb-4 inline-block">
              CampVerse
            </a>
            <p className="text-gray-400 mt-4">
              Uniting campuses across India through a shared platform for events, opportunities, and connections.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 transition-colors">
                <i className="ri-instagram-line ri-lg"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 transition-colors">
                <i className="ri-twitter-x-line ri-lg"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 transition-colors">
                <i className="ri-linkedin-line ri-lg"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              {["Home", "Features", "Events", "Testimonials", "FAQ"].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Students */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">For Students</h3>
            <ul className="space-y-2">
              {["Browse Events", "Create Profile", "My Registrations", "Certificates", "Support"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Institutions */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-white">For Institutions</h3>
            <ul className="space-y-2">
              {["Register Institution", "Create Events", "Analytics", "Pricing", "Contact Sales"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; 2025 CampVerse. All rights reserved. Made by students, for students.
          </div>
          <div className="flex space-x-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((policy) => (
              <a key={policy} href="#" className="text-gray-400 text-sm hover:text-white transition-colors">
                {policy}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
