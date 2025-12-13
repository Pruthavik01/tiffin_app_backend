require('dotenv').config();
const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth.route');
const connectDB = require('./db/db');

// Connect to database
connectDB();

const app = express();

// Middleware - order matters
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use("/auth", authRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;