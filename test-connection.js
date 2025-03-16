const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/studxchange', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('MongoDB connected successfully');
    mongoose.connection.close(); // Close the connection
  })
  .catch(err => console.error('MongoDB connection error:', err));
