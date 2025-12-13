const express = require('express');
const router = express.Router();
const User = require('../Models/user.model');
const { sendOTP } = require('../utils/mailer');


router.get('/test', (req, res) => {
  res.send('working');
});

router.post("/generate-otp", async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    
    req.session.otp = otp;
    req.session.email = email;
    req.session.otpExpiry = otpExpiry;

    await sendOTP(email, otp);
    
    // Don't send OTP in response for security
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, name, mobile, password, address, role } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Check if OTP exists in session
    if (!req.session.otp || !req.session.email) {
      return res.status(400).json({ message: "OTP not found. Please generate a new OTP" });
    }

    // Check if OTP has expired
    if (req.session.otpExpiry && Date.now() > req.session.otpExpiry) {
      // Clear expired OTP
      delete req.session.otp;
      delete req.session.email;
      delete req.session.otpExpiry;
      return res.status(400).json({ message: "OTP has expired. Please generate a new OTP" });
    }

    // Verify OTP and email match
    if (parseInt(otp) !== req.session.otp || email !== req.session.email) {
      return res.status(400).json({ message: "Invalid OTP or email" });
    }

    // OTP is valid, create or authenticate user
    let user = await User.findOne({ email: email });
    
    if (!user) {
      // Validate required fields for new user
      if (!name || !mobile || !password || !address) {
        return res.status(400).json({ message: "Name, mobile, password, and address are required for registration" });
      }
      
      // Create new user
      user = new User({ name, mobile, email, password, address, role: role || 'user' });
      await user.save();
      
      // Clear OTP from session after successful verification
      delete req.session.otp;
      delete req.session.email;
      delete req.session.otpExpiry;
      
      return res.status(201).json({ 
        message: "User registered successfully", 
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } else {
      // User already exists - clear OTP and return success
      delete req.session.otp;
      delete req.session.email;
      delete req.session.otpExpiry;
      
      return res.status(200).json({ 
        message: "User authenticated successfully", 
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
})

router.get("/login", (req, res) => {
    res.render("login");
});



module.exports = router;