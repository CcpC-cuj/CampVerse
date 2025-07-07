import React from "react";

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 text-white"
            style={{ textShadow: "0 0 10px rgba(155, 93, 229, 0.7)" }}
          >
            What Students Say
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Hear from students who have discovered opportunities through
            CampVerse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              quote:
                "Found my dream hackathon through CampVerse! The platform made it super easy to discover events aligned with my interests and connect with like-minded peers.",
              img: "https://readdy.ai/api/search-image?query=professional%2520headshot%2520of%2520young%2520Indian%2520male%2520student%252C%2520smiling%252C%2520casual%2520attire%252C%2520neutral%2520background%252C%2520high%2520quality%2520portrait%2520photo&width=100&height=100&seq=test1&orientation=squarish",
              name: "Arjun Sharma",
              role: "Computer Science, VIT Vellore",
            },
            {
              quote:
                "Our college fest got 4x visibility thanks to CampVerse. The analytics dashboard helped us understand our audience better and improve our event planning.",
              img: "https://readdy.ai/api/search-image?query=professional%2520headshot%2520of%2520young%2520Indian%2520female%2520student%252C%2520smiling%252C%2520casual%2520attire%252C%2520neutral%2520background%252C%2520high%2520quality%2520portrait%2520photo&width=100&height=100&seq=test2&orientation=squarish",
              name: "Priya Patel",
              role: "Event Coordinator, BITS Pilani",
            },
            {
              quote:
                "As someone who loves participating in debates, CampVerse has been a game-changer. I've discovered competitions across the country I wouldn't have known about otherwise.",
              img: "https://readdy.ai/api/search-image?query=professional%2520headshot%2520of%2520young%2520Indian%2520male%2520student%2520with%2520glasses%252C%2520smiling%252C%2520casual%2520attire%252C%2520neutral%2520background%252C%2520high%2520quality%2520portrait%2520photo&width=100&height=100&seq=test3&orientation=squarish",
              name: "Rahul Verma",
              role: "Political Science, JNU",
            },
          ].map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-800/60 rounded-lg p-8 relative"
              style={{ boxShadow: "0 0 15px rgba(155, 93, 229, 0.5)" }} // glow-effect
            >
              <div className="absolute -top-5 -left-5 text-5xl text-primary opacity-30">
                "
              </div>
              <div className="mb-6">
                <p className="text-gray-300 italic">"{testimonial.quote}"</p>
              </div>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden mr-4">
                  <img
                    src={testimonial.img}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-white">{testimonial.name}</h4>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
