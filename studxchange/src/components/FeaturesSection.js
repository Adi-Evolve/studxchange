import React from "react";

const features = [
  {
    title: "Easy Uploads",
    description: "Upload your notes, projects, and study material with just a few clicks.",
    icon: "📤"
  },
  {
    title: "Secure Storage",
    description: "All files are stored securely in the cloud with instant access.",
    icon: "🔒"
  },
  {
    title: "Discover & Connect",
    description: "Find resources from other students and connect for collaborations.",
    icon: "🔗"
  },
  {
    title: "No Fees",
    description: "Enjoy free uploads and downloads with no hidden charges.",
    icon: "💸"
  }
];

const FeaturesSection = () => (
  <section className="py-14 bg-gradient-to-br from-pink-100 via-blue-100 to-purple-200 theme-fade-in">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-4xl font-extrabold text-center mb-10 theme-gradient-text drop-shadow-xl">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {features.map((f, i) => (
          <div key={i} className="theme-card flex flex-col items-center py-8 px-5 text-center">
            <div className="text-5xl mb-4 animate-bounce" style={{filter:'drop-shadow(0 0 8px #8b5cf6)'}}>{f.icon}</div>
            <h3 className="text-2xl font-bold mb-2 theme-gradient-text">{f.title}</h3>
            <p className="text-gray-700 text-lg">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
