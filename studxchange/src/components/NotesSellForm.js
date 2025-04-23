import React, { useState } from "react";
import axios from "axios";

const CLOUD_NAME = "djouqnug2";
const UPLOAD_PRESET = "studx_pdf_upload";

const NotesSellForm = () => {
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
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
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
      setError("Upload failed. Please check your Cloudinary preset and try again.");
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
};

export default NotesSellForm;
