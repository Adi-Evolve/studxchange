import React, { useState } from "react";
import ProductSellForm from "../components/ProductSellForm";
import RoomSellForm from "../components/RoomSellForm";
import NotesSellForm from "../components/NotesSellForm";

const Sell = () => {
  const [category, setCategory] = useState("product");

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="flex justify-center gap-4 mb-8">
        <button
          className={`theme-btn px-6 py-2 ${category === "product" ? "ring-4 ring-blue-300" : "opacity-70"}`}
          onClick={() => setCategory("product")}
          type="button"
        >
          Product
        </button>
        <button
          className={`theme-btn px-6 py-2 ${category === "room" ? "ring-4 ring-purple-300" : "opacity-70"}`}
          onClick={() => setCategory("room")}
          type="button"
        >
          Room
        </button>
        <button
          className={`theme-btn px-6 py-2 ${category === "notes" ? "ring-4 ring-pink-300" : "opacity-70"}`}
          onClick={() => setCategory("notes")}
          type="button"
        >
          Notes
        </button>
      </div>
      <div className="theme-fade-in">
        {category === "product" && <ProductSellForm />}
        {category === "room" && <RoomSellForm />}
        {category === "notes" && <NotesSellForm />}
      </div>
    </div>
  );
};

export default Sell;
