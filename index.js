// index.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Example Express route
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  // Implement actual server-side OTP validation
  if (otp !== storedOtpForEmail) {
    return res.status(401).json({ error: "Invalid OTP" });
  }
  
  // Mark email as verified
  res.json({ verified: true });
});

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// For any route, send the index.html from the public folder
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
