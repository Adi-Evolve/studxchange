import React from "react";

const HeroSection = () => (
  <section className="py-20 bg-gradient-to-br from-fuchsia-500 via-blue-500 to-purple-600 text-white text-center theme-fade-in theme-glow">
    <div className="max-w-3xl mx-auto">
      <h1 className="text-6xl font-extrabold mb-6 theme-gradient-text drop-shadow-xl animate-pulse">StudXchange</h1>
      <p className="text-2xl mb-10 font-light">Buy, sell, and exchange notes, projects, and study material with students all over the world.</p>
      <a href="#notes-upload" className="theme-btn text-lg shadow-xl">Upload Notes</a>
    </div>
  </section>
);

export default HeroSection;
