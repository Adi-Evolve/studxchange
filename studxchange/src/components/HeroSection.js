import React from "react";

const HeroSection = () => (
  <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white text-center">
    <div className="max-w-3xl mx-auto">
      <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">Welcome to StudXchange</h1>
      <p className="text-xl mb-8 font-light">Buy, sell, and exchange notes, projects, and study material with students all over the world.</p>
      <a href="#notes-upload" className="inline-block px-8 py-3 bg-white text-blue-700 font-bold rounded-full shadow-lg hover:bg-blue-50 transition">Upload Notes</a>
    </div>
  </section>
);

export default HeroSection;
