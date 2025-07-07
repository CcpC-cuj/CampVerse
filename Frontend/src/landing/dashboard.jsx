import React from "react";

const DashboardPreview = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 text-white"
            style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
          >
            Experience CampVerse
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Intuitive dashboards for both students and institutions.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Student Dashboard Preview */}
          <div className="md:w-1/2 bg-gray-800/60 rounded-lg overflow-hidden shadow-lg">
            <div className="bg-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white">Student Dashboard</h3>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="p-6">
              <img
                src="https://readdy.ai/api/search-image?query=futuristic%2520student%2520dashboard%2520UI%2520with%2520event%2520cards%252C%2520calendar%252C%2520and%2520notifications%252C%2520dark%2520space%2520theme%2520with%2520purple%2520and%2520blue%2520accents%252C%2520clean%2520modern%2520interface%252C%2520high%2520quality%2520UI%2520design%252C%2520detailed%2520screen%2520mockup&width=600&height=400&seq=dash1&orientation=landscape"
                alt="Student Dashboard"
                className="rounded-lg w-full h-auto"
              />
              <div className="mt-6 space-y-4 text-white">
                <FeatureItem
                  icon="ri-calendar-line"
                  title="Personalized Event Feed"
                  description="Events tailored to your interests and previous participation"
                />
                <FeatureItem
                  icon="ri-bookmark-line"
                  title="Save & RSVP"
                  description="Bookmark events and get reminders before they start"
                />
              </div>
            </div>
          </div>

          {/* Institution Dashboard Preview */}
          <div className="md:w-1/2 bg-gray-800/60 rounded-lg overflow-hidden shadow-lg">
            <div className="bg-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white">Institution Dashboard</h3>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="p-6">
              <img
                src="https://readdy.ai/api/search-image?query=futuristic%2520institution%2520dashboard%2520UI%2520with%2520event%2520management%2520tools%252C%2520analytics%2520charts%252C%2520and%2520participant%2520lists%252C%2520dark%2520space%2520theme%2520with%2520purple%2520and%2520blue%2520accents%252C%2520clean%2520modern%2520interface%252C%2520high%2520quality%2520UI%2520design%252C%2520detailed%2520screen%2520mockup&width=600&height=400&seq=dash2&orientation=landscape"
                alt="Institution Dashboard"
                className="rounded-lg w-full h-auto"
              />
              <div className="mt-6 space-y-4 text-white">
                <FeatureItem
                  icon="ri-add-circle-line"
                  title="Create & Manage Events"
                  description="Easily publish and update event details"
                />
                <FeatureItem
                  icon="ri-bar-chart-line"
                  title="Analytics & Insights"
                  description="Track registrations, attendance, and engagement"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureItem = ({ icon, title, description }) => (
  <div className="flex items-center">
    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mr-4">
      <i className={`${icon} ri-lg text-primary`}></i>
    </div>
    <div>
      <h4 className="font-medium text-white">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  </div>
);

export default DashboardPreview;
