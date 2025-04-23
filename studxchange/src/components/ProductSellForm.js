import React from "react";

const ProductSellForm = () => (
  <form className="theme-card p-8 flex flex-col gap-5">
    <h3 className="text-2xl font-bold theme-gradient-text mb-4">Sell a Product</h3>
    <input type="text" placeholder="Product Name" className="border rounded px-4 py-2" />
    <input type="number" placeholder="Price" className="border rounded px-4 py-2" />
    <textarea placeholder="Description" className="border rounded px-4 py-2" />
    <input type="file" accept="image/*" className="border rounded px-4 py-2" />
    <button className="theme-btn mt-2">Submit Product</button>
  </form>
);

export default ProductSellForm;
