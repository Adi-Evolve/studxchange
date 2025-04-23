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
  <section className="py-16 bg-gradient-to-br from-purple-200 via-pink-200 to-blue-100 theme-fade-in">
    <div className="max-w-6xl mx-auto px-6">
      <h2 className="text-4xl font-extrabold text-center mb-10 theme-gradient-text drop-shadow-xl">Similar Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        {products.map((p, i) => (
          <div key={i} className="theme-card flex flex-col items-center p-6 hover:scale-105 transition-transform duration-200">
            <img src={p.img} alt={p.title} className="w-32 h-32 object-cover rounded-xl mb-4 shadow-lg border-4 border-white" style={{boxShadow: '0 0 0 6px #f472b6'}} />
            <h3 className="text-xl font-bold mb-2 theme-gradient-text text-center">{p.title}</h3>
            <p className="text-gray-700 mb-4 text-center">{p.desc}</p>
            <a href={p.url} className="theme-btn text-base px-6 py-2 mt-auto">View</a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SimilarProducts;
