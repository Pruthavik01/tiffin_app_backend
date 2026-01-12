require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const authRoutes = require('./routes/auth.route');
const providerRoutes = require('./routes/provider.route');
const orderRoutes = require('./routes/order.route');
const analyticRoutes = require('./routes/analytic.route');
const profileRoutes = require('./routes/profile.route');
const userRoutes = require('./routes/user.route');
const connectDB = require('./db/db');

// Connect to database
connectDB();

const app = express();

// CORS configuration - must be before other middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:19006',
    'http://localhost:8081',
    'http://192.168.1.7:3000',
    'exp://localhost:8081',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    // ✅ Allow Expo tunnel / web origins
    /^https?:\/\/.*\.exp\.direct$/,
    /^https?:\/\/.*\.expo\.dev$/,
];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/session to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Middleware - order matters
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true only in production with HTTPS
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Use 'lax' for development, 'none' for production with HTTPS
  }
}));

// Routes
app.use("/auth", authRoutes);
app.use("/provider", providerRoutes);
app.use("/orders", orderRoutes);
app.use('/analytic', analyticRoutes);
app.use('/profile', profileRoutes); 
app.use('/user', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Accessible from network at http://YOUR_IP:${PORT}`);
});

module.exports = app;