// This file is used as an alternative entry point for Vercel
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = require('../server');

// Graceful timeout handler for Vercel serverless
const MAX_EXECUTION_TIME = 9000; // 9 seconds in ms (leaving 1s margin from Vercel's 10s timeout)

// Export the Express API for Vercel serverless functions
// This helps mitigate cold start issues and MongoDB connection problems
module.exports = async (req, res) => {
  // Start the execution timer
  const startTime = Date.now();
  let timeoutId;
  
  // Set timeout to respond before Vercel cuts off
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      console.warn('Function approaching timeout limit, sending early response');
      reject(new Error('Function execution time limit approaching'));
    }, MAX_EXECUTION_TIME);
  });
  
  try {
    // Set CORS headers for Vercel serverless functions
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      clearTimeout(timeoutId);
      return res.status(200).end();
    }

    // Connect to the database before handling the request
    if (mongoose.connection.readyState !== 1) {
      console.log('API: Connecting to MongoDB before handling request');
      try {
        await Promise.race([
          mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 3000, // Reduced for serverless
            connectTimeoutMS: 3000,
            socketTimeoutMS: 5000
          }),
          timeoutPromise
        ]);
        console.log('API: Connected to MongoDB successfully');
      } catch (dbError) {
        if (dbError.message === 'Function execution time limit approaching') {
          return res.status(503).json({
            error: 'Service Temporarily Unavailable',
            message: 'Database connection is taking too long, please try again'
          });
        }
        console.error('API: Failed to connect to MongoDB:', dbError);
        // Still proceed with the request, as the server.js will also try to connect
      }
    }
    
    // Race the Express app against the timeout
    const result = await Promise.race([
      // Handle the request through the Express app
      new Promise((resolve) => {
        // Save the original res.end to monitor when the response is completed
        const originalEnd = res.end;
        res.end = function() {
          clearTimeout(timeoutId);
          resolve();
          return originalEnd.apply(this, arguments);
        };
        
        // Process the request with the Express app
        app(req, res);
      }),
      timeoutPromise
    ]);
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.message === 'Function execution time limit approaching') {
      console.warn('Serverless function timeout prevention triggered after', 
                  (Date.now() - startTime), 'ms');
      
      // Only send response if headers haven't been sent yet
      if (!res.headersSent) {
        return res.status(503).json({
          error: 'Service Temporarily Unavailable',
          message: 'Request is taking too long to process, please try again'
        });
      }
      return;
    }
    
    console.error('Serverless function error:', error);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
      });
    }
  }
}; 