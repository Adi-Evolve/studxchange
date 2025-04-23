import React, { useState } from "react";
import axios from "axios";

const CLOUD_NAME = "djouqnug2";
const UPLOAD_PRESET = "studx_pdf_upload";

function ProductSellForm() {
  return (
    <form className="theme-card p-8 flex flex-col gap-5">
      <h3 className="text-2xl font-bold theme-gradient-text mb-4">Sell a Product</h3>
      <input type="text" placeholder="Product Name" className="border rounded px-4 py-2" />
      <input type="number" placeholder="Price" className="border rounded px-4 py-2" />
      <textarea placeholder="Description" className="border rounded px-4 py-2" />
      <input type="file" accept="image/*" className="border rounded px-4 py-2" />
      <button className="theme-btn mt-2">Submit Product</button>
    </form>
  );
}

function RoomSellForm() {
  return (
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
}

function NotesSellForm() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUrl("");
    setError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large! Max 100MB.");
      return;
    }
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        formData
      );
      setUrl(res.data.secure_url);
    } catch (err) {
      setError("Upload failed. Please try again.");
    }
    setUploading(false);
  };

  return (
    <form className="theme-card p-8 flex flex-col gap-5" onSubmit={handleUpload}>
      <h3 className="text-2xl font-bold theme-gradient-text mb-4">Upload Notes</h3>
      <input type="text" placeholder="Notes Title" className="border rounded px-4 py-2" />
      <input type="text" placeholder="Subject / Course" className="border rounded px-4 py-2" />
      <textarea placeholder="Description" className="border rounded px-4 py-2" />
      <input type="file" accept="application/pdf" className="border rounded px-4 py-2" onChange={handleFileChange} />
      <button className="theme-btn mt-2" disabled={uploading || !file} type="submit">
        {uploading ? "Uploading..." : "Upload Notes"}
      </button>
      {error && <p className="text-red-600 mt-2 animate-pulse">{error}</p>}
      {url && (
        <div className="mt-4">
          <a href={url} target="_blank" rel="noopener noreferrer" className="theme-btn inline-block text-base mt-2" style={{background: 'linear-gradient(90deg,#06b6d4,#6366f1)'}}>View Uploaded PDF</a>
        </div>
      )}
    </form>
  );
}

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
