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
  <section className="py-12 bg-white">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-blue-700">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((f, i) => (
          <div key={i} className="bg-blue-50 rounded-xl p-6 shadow hover:shadow-lg transition">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-gray-700">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
