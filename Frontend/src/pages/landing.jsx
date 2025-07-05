import React from "react";
import StarryBackground from '../landing/StarryBackground';
import Navbar from "../landing/navbar";
import Hero from "../landing/hero";

const Landing = () => {
  return (
    <div>
       <StarryBackground />
      <Navbar />
      <Hero/>
      {/* Other sections go here */}
    </div>
  );
};

export default Landing;
