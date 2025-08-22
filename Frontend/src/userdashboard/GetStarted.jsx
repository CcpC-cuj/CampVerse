// src/pages/GetStarted.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const GetStarted = () => {
  const navigate = useNavigate();

  // Color mapping for Tailwind classes to avoid dynamic class issues
  const colorClassMap = {
    indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    teal: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  };

  const handleClose = () => {
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white font-poppins">
      <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50">
        <div className="glass-card rounded-xl p-6 max-w-2xl w-full mx-4 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <i className="ri-close-line text-xl"></i>
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#9b5de5]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-dashboard-line text-[#9b5de5] text-2xl"></i>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Welcome to CampVerse Dashboard</h2>
            <p className="text-slate-300">
              Let's get you started with managing your events effectively
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              {
                icon: "ri-calendar-event-line",
                title: "Event Management",
                color: "indigo",
                text: "Create, manage, and track all your events from one central dashboard",
              },
              {
                icon: "ri-user-add-line",
                title: "Registration Tracking",
                color: "purple",
                text: "Monitor registrations, approvals, and participant engagement",
              },
              {
                icon: "ri-line-chart-line",
                title: "Analytics & Insights",
                color: "amber",
                text: "Get detailed analytics and insights about your events' performance",
              },
              {
                icon: "ri-team-line",
                title: "Team Collaboration",
                color: "teal",
                text: "Collaborate with your team members and manage permissions",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="glass-card rounded-lg p-4 hover:glow-border transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${colorClassMap[card.color].bg} flex items-center justify-center ${colorClassMap[card.color].text} mb-3`}
                >
                  <i className={card.icon}></i>
                </div>
                <h3 className="font-medium mb-2">{card.title}</h3>
                <p className="text-slate-400 text-sm">{card.text}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleClose}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-button transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
