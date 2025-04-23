import React from "react";

const RoomSellForm = () => (
  <form className="theme-card p-8 flex flex-col gap-5">
    <h3 className="text-2xl font-bold theme-gradient-text mb-4">List a Room</h3>
    <input type="text" placeholder="Room Title" className="border rounded px-4 py-2" />
    <input type="number" placeholder="Rent per Month" className="border rounded px-4 py-2" />
    <input type="text" placeholder="Location" className="border rounded px-4 py-2" />
    <textarea placeholder="Description" className="border rounded px-4 py-2" />
    <input type="file" accept="image/*" className="border rounded px-4 py-2" />
    <button className="theme-btn mt-2">Submit Room</button>
  </form>
);

export default RoomSellForm;
