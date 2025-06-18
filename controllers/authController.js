// Deprecated: This file is no longer used. Backend has migrated to Supabase.
exports.googleAuth = async (req, res) => {
    try {
        
        
        // Validate request body
        if (!req.body || !req.body.email) {
            
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const { name, email, googleId, picture } = req.body;
        
        
        // For Vercel environment, ensure database connection is active
        if (process.env.VERCEL && mongoose.connection.readyState !== 1) {
            
            try {
                await mongoose.connect(process.env.MONGODB_URI, {
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 5000,
                    socketTimeoutMS: 10000
                });
                
            } catch (dbError) {
                
                return res.status(500).json({ 
                    error: 'Database connection failed',
                    message: 'Unable to connect to database. Please try again.'
                });
            }
        }
        
        // Find user by email or googleId
        let user = await User.findOne({ $or: [{ email }, { googleId }] });
        
        if (!user) {
            
            // Create new user
            user = new User({
                name,
                email,
                googleId,
                provider: 'google'
            });
            
            await user.save();
            
        } else {
            // Update existing user with Google ID if it's missing
            if (!user.googleId && googleId) {
                user.googleId = googleId;
                
            }
            
            // Update name if changed
            if (user.name !== name) {
                user.name = name;
                
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

        
        res.json(userResponse);
    } catch (error) {
        
        res.status(500).json({ 
            error: 'Authentication failed',
            message: error.message
        });
    }
};