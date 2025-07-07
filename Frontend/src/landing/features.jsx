import React from "react";

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-gray-900/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className="font-orbitron text-3xl md:text-4xl font-bold mb-4 text-white "
            style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
          >
            Explore the CampVerse
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            A complete platform designed to connect students with events that
            matter to them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-gray-800/60 rounded-lg p-8 transition-all duration-300 hover:shadow-cyan-500/50 hover:shadow-md">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <i className="ri-search-line ri-xl text-primary"></i>
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Discover</h3>
            <p className="text-gray-300">
              Explore events from colleges across India, filtered by your
              interests, location, and availability.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-800/60 rounded-lg p-8 transition-all duration-300 hover:shadow-cyan-500/50 hover:shadow-md">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <i className="ri-user-add-line ri-xl text-primary"></i>
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Register</h3>
            <p className="text-gray-300">
              Secure registration with your college ID, ensuring authentic
              participation and streamlined access.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-800/60 rounded-lg p-8 transition-all duration-300 hover:shadow-cyan-500/50 hover:shadow-md">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <i className="ri-group-line ri-xl text-primary"></i>
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">Participate</h3>
            <p className="text-gray-300">
              Join events virtually or in-person, connect with peers, and
              showcase your talents on a national stage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
