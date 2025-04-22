import React from "react";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import NotesUpload from "./components/NotesUpload";
import SimilarProducts from "./components/SimilarProducts";

function App() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-100 min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <div className="max-w-4xl mx-auto my-12">
        <NotesUpload />
      </div>
      <SimilarProducts />
    </div>
  );
}

export default App;
