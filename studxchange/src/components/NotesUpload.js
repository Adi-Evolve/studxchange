import React, { useState } from "react";
import axios from "axios";

const CLOUD_NAME = "djouqnug2";
const UPLOAD_PRESET = "studx_pdf_upload"; // Make sure you create this preset in Cloudinary dashboard

const NotesUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUrl("");
    setError("");
  };

  const handleUpload = async () => {
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
    <section id="notes-upload" className="theme-card shadow-2xl p-10 max-w-2xl mx-auto mt-12 theme-fade-in">
      <h2 className="text-3xl font-extrabold theme-gradient-text mb-6 text-center drop-shadow">Upload Your Notes (PDF, up to 100MB)</h2>
      <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="border border-fuchsia-400 rounded px-4 py-3 bg-white shadow focus:outline-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
        />
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="theme-btn text-lg shadow-xl"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>
      {error && <p className="text-red-600 mt-4 text-center animate-pulse">{error}</p>}
      {url && (
        <div className="mt-6 text-center animate-fade-in">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="theme-btn inline-block text-base mt-2"
            style={{background: 'linear-gradient(90deg,#06b6d4,#6366f1)'}}
          >
            View Uploaded PDF
          </a>
        </div>
      )}
    </section>
  );
};

export default NotesUpload;
