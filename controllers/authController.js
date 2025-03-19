const User = require('../models/user');
const mongoose = require('mongoose');

exports.googleAuth = async (req, res) => {
    try {
        const { name, email, googleId } = req.body;
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find or create user
        let user = await User.findOne({ googleId });
        
        if (!user) {
            user = new User({
                name,
                email,
                googleId,
                provider: 'google'
            });
            await user.save();
        }

        // Return user data without sensitive information
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            profileComplete: !!user.phone // Add other profile completion checks
        };

        res.json(userResponse);
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};