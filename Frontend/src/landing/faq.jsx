import React, { useState } from "react";

const FaqCta = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Who can use CampVerse?",
      answer:
        "CampVerse is designed for college students, faculty, and institutions across India. Students can discover and participate in events, while institutions can create and manage their events on the platform.",
    },
    {
      question: "How do I register for an event?",
      answer:
        'After creating an account with your college email, you can browse events and click the "Register" button on any event page. You\'ll receive a confirmation email with details and any additional steps required by the event organizers.',
    },
    {
      question: "How can my college join CampVerse?",
      answer:
        "Institutions can register through our dedicated portal. We verify each institution to ensure authenticity. Once approved, you'll get access to the institution dashboard where you can create and manage events.",
    },
    {
      question: "Is CampVerse free to use?",
      answer:
        "Yes, CampVerse is completely free for students to discover and register for events. Institutions have a free tier with basic features, with premium options available for advanced analytics and promotional tools.",
    },
    {
      question: "Can I participate in events from other colleges?",
      answer:
        "Absolutely! One of CampVerse's main features is enabling students to discover and participate in events across different colleges. Each event will specify if it's open to external participants or restricted to their own students.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-900/30 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4 "
              style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get answers to common questions about CampVerse.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-800/60 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 flex justify-between items-center focus:outline-none"
                >
                  <span className="font-medium text-left text-white">
                    {faq.question}
                  </span>
                  <i
                    className={`ri-arrow-down-s-line ri-lg transform transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  ></i>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-300">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(rgba(11, 15, 43, 0.8), rgba(11, 15, 43, 0.9)),
            url('https://readdy.ai/api/search-image?query=cosmic%2520nebula%2520with%2520stars%2520and%2520galaxies%252C%2520purple%2520and%2520blue%2520space%2520clouds%252C%2520dark%2520space%2520background%2520with%2520vibrant%2520colors%252C%2520high%2520quality%2520cosmic%2520scene%252C%2520detailed%2520space%2520visualization&width=1920&height=600&seq=cta1&orientation=landscape')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2
              className="text-3xl md:text-4xl font-bold mb-6 text-white"
              style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
            >
              Ready to Join the CampVerse?
            </h2>
            <p className="text-xl text-gray-300 mb-10">
              Connect with thousands of students and discover events that match
              your interests and aspirations.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button className="px-8 py-4 bg-secondary text-white rounded-button text-lg font-medium hover:bg-secondary/80 transition-colors whitespace-nowrap">
                Create Account
              </button>
              <button className="px-8 py-4 border border-primary text-white rounded-button text-lg font-medium hover:bg-primary/20 transition-colors whitespace-nowrap">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2
              className="text-4xl md:text-5xl font-bold mb-8 text-white"
              style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
            >
              Join the Cosmic Community of Campus Events
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Whether you're organizing the next big hackathon or searching for
              your next creative challenge, CampVerse connects you with endless
              possibilities.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: "ri-rocket-line",
                  title: "500+ Events",
                  desc: "Monthly events across all categories",
                },
                {
                  icon: "ri-team-line",
                  title: "10K+ Students",
                  desc: "Active community members",
                },
                {
                  icon: "ri-building-line",
                  title: "100+ Colleges",
                  desc: "Partner institutions nationwide",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-6"
                  style={{ boxShadow: "0 0 15px rgba(155, 93, 229, 0.5)" }}
                >
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${item.icon} ri-xl text-primary`}></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">
                    {item.title}
                  </h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="px-8 py-4 bg-secondary text-white rounded-button text-lg font-medium hover:bg-secondary/80 transition-colors glow-pink flex items-center whitespace-nowrap" >
                 <i className="ri-rocket-line ri-lg mr-2"></i>
                     Launch Your Journey
                </button>

              <button className="px-8 py-4 bg-gray-800/40 backdrop-blur-sm text-white rounded-button text-lg font-medium hover:bg-gray-800/60 transition-colors flex items-center whitespace-nowrap">
                <i className="ri-calendar-line ri-lg mr-2"></i>
                Browse Events
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FaqCta;
