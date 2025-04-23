import React from "react";

const products = [
  {
    title: "Advanced Calculus Notes",
    desc: "Comprehensive notes for advanced calculus with solved examples.",
    url: "#",
    img: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=400&q=80"
  },
  {
    title: "Python Project Report",
    desc: "A complete Python project with report and code.",
    url: "#",
    img: "https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80"
  },
  {
    title: "Engineering Graphics Diagrams",
    desc: "High quality diagrams for engineering graphics assignments.",
    url: "#",
    img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80"
  },
  {
    title: "Business Studies Case Studies",
    desc: "Curated case studies for business studies exams.",
    url: "#",
    img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80"
  }
];

const SimilarProducts = () => (
  <section className="py-12 bg-gradient-to-br from-purple-50 to-blue-100">
    <div className="max-w-6xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-purple-700">Similar Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {products.map((p, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition p-4 flex flex-col items-center">
            <img src={p.img} alt={p.title} className="w-32 h-32 object-cover rounded mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-blue-800">{p.title}</h3>
            <p className="text-gray-700 mb-4 text-center">{p.desc}</p>
            <a href={p.url} className="text-blue-600 underline font-medium">View</a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SimilarProducts;
