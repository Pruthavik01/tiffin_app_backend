require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth.route');
const session = require("express-session");
const app = express();

const connectDB = require('./db/db');
connectDB();

app.use(express.json());

app.use(
    session({
        name: "otp-session",
        secret: process.env.SESSION_SECRET || "dev-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 5 * 60 * 1000, // 5 minutes
        },
    })
);

app.use("/auth", authRoutes);

module.exports = app;