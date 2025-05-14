// Deprecated: This file is no longer used. Backend has migrated to Supabase.
exports.googleAuth = async (req, res) => {
    try {
        console.log('POST /api/auth/google - Processing Google authentication');
        
        // Validate request body
        if (!req.body || !req.body.email) {
            console.error('POST /api/auth/google - Missing required fields');
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const { name, email, googleId, picture } = req.body;
        console.log(`POST /api/auth/google - Processing authentication for email: ${email}`);
        
        // For Vercel environment, ensure database connection is active
        if (process.env.VERCEL && mongoose.connection.readyState !== 1) {
            console.log('Vercel: Connecting to MongoDB for Google Auth');
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 5000,
                    socketTimeoutMS: 10000
                });
                console.log('Vercel: Connected to MongoDB successfully for Google Auth');
            } catch (dbError) {
                console.error('Vercel: Failed to connect to MongoDB for Google Auth:', dbError);
                return res.status(500).json({ 
                    error: 'Database connection failed',
                    message: 'Unable to connect to database. Please try again.'
                });
            }
        }
        
        // Find user by email or googleId
        let user = await User.findOne({ $or: [{ email }, { googleId }] });
        
        if (!user) {
            console.log(`POST /api/auth/google - Creating new user for email: ${email}`);
            // Create new user
            user = new User({
                name,
                email,
                googleId,
                provider: 'google'
            });
            
            await user.save();
            console.log(`POST /api/auth/google - New user created successfully: ${email}`);
        } else {
            // Update existing user with Google ID if it's missing
            if (!user.googleId && googleId) {
                user.googleId = googleId;
                console.log(`POST /api/auth/google - Updated user with Google ID: ${email}`);
            }
            
            // Update name if changed
            if (user.name !== name) {
                user.name = name;
                console.log(`POST /api/auth/google - Updated user's name: ${email}`);
            }
            
            // Update other fields if needed
            user.provider = 'google';
            await user.save();
        }

        // Return user data without sensitive information
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            provider: user.provider,
            token: 'google-auth-token' // You can implement proper token generation
        };

        console.log(`POST /api/auth/google - Authentication successful for: ${email}`);
        res.json(userResponse);
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ 
            error: 'Authentication failed',
            message: error.message
        });
    }
};