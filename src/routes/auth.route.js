const express = require('express');
const router = express.Router();
const User = require('../Models/user.model');
const session = require('express-session');
const { sendOTP } = require('../utils/mailer');


router.get('/test', (req, res) => {
  res.send('working');
});

router.post("/generate-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    req.session.otp = otp;
    req.session.email = email;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;

    await sendOTP(email, otp);

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, name, mobile, password, address, role } = req.body;

    if (!req.session.otp || !req.session.email) {
      return res.status(400).json({ message: "OTP session expired" });
    }

    if (Date.now() > req.session.otpExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (
      email !== req.session.email ||
      parseInt(otp) !== req.session.otp
    ) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, mobile, email, password, address, role });
      await user.save();
    }

    // Clear OTP session after success
    req.session.otp = null;
    req.session.email = null;
    req.session.otpExpires = null;

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});

router.get("/login", (req, res) => {
    res.render("login");
});



module.exports = router;