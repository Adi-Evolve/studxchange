// Minimal Vercel serverless function to test deployment
module.exports = (req, res) => {
  res.status(200).json({ ok: true, message: "Minimal serverless function works!" });
};
