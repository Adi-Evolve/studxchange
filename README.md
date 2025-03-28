# StudXchange

A platform for students to buy, sell, and exchange items within their college community.

## Features

- User Authentication (Email & Google Sign-In)
- Product Listing
- Room Listing
- Location-based Search
- Real-time Chat
- Image Upload
- Responsive Design

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT, Google OAuth
- Image Storage: ImgBB

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Adi-Evolve/studxchange.git
cd studxchange
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
```

4. Start the server:
```bash
npm start
```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `EMAIL_USER`: Email address for sending OTPs
- `EMAIL_PASSWORD`: Email password for sending OTPs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 