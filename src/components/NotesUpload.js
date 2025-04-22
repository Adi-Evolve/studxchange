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
    <section id="notes-upload" className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Upload Your Notes (PDF, up to 100MB)</h2>
      <div className="flex flex-col md:flex-row items-center gap-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="border border-blue-300 rounded px-4 py-2"
        />
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {url && (
        <div className="mt-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline font-semibold"
          >
            View Uploaded PDF
          </a>
        </div>
      )}
    </section>
  );
};

export default NotesUpload;
