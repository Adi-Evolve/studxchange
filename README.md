# StudXchange

StudXchange is a platform for students to exchange academic resources, connect with peers, and collaborate on projects.

## Features

- Resource sharing
- Peer-to-peer collaboration
- Academic networking
- Project management tools

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your credentials
4. Run the development server:
   ```
   npm run dev
   ```

## Deployment to Vercel

### Prerequisites

- A Vercel account
- MongoDB Atlas database
- Gmail account for sending OTPs
- ImgBB account for image uploads
- Google OAuth credentials

### Steps

1. Push your code to GitHub
2. Log in to Vercel and create a new project
3. Import your GitHub repository
4. Configure the following environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASSWORD`: Your Gmail app password
   - `IMGBB_API_KEY`: Your ImgBB API key
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
5. Deploy the project

### Troubleshooting

If you encounter the "Cannot find module" error:
1. Make sure all dependencies are properly listed in `package.json`
2. Redeploy the project after updating `package.json`
3. Check Vercel logs for specific error messages

## API Endpoints

- `/api/products`: Get all products or add a new product
- `/api/rooms`: Get all rooms or add a new room
- `/api/users/register`: Register a new user
- `/api/users/login`: Login a user
- `/api/users/send-otp`: Send OTP for email verification
- `/api/users/verify-otp`: Verify OTP
- `/api/auth/google`: Google authentication
- `/api/sold-items`: Get sold items
- `/api/products/mark-sold`: Mark a product as sold

## Contact

For more information, contact Adi-Evolve.

## License

This project is licensed under the MIT License. 