const app = require('../server');

// Handle Vercel serverless function timeouts
const TIMEOUT = 9000; // 9 seconds

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 's-maxage=0');
  
  const timeout = setTimeout(() => {
    console.error('Request timeout reached');
    res.status(503).json({ message: 'Request timeout, please try again' });
  }, TIMEOUT);
  
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  next();
});

module.exports = app;
