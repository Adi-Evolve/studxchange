const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

let mailOptions = {
  from: process.env.GMAIL_USER,
  to: 'adiinamdar888@gmail.com', // Replace with your email to test
  subject: 'Test Email',
  text: 'This is a test email from Nodemailer.'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error("Test email error:", error);
  }
  console.log('Test email sent:', info.response);
});
