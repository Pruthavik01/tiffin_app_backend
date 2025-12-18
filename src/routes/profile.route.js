const express = require('express');
const router = express.Router();
const userModel = require('../Models/user.model');
const { sendEmail } = require('../utils/mailer');

router.post("/update-pass", async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const user = await userModel.findById(userId).select('password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.password !== oldPassword) {
            return res.status(400).json({ message: "Incorrect password" });
        }
        if (oldPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from old password" });
        }
        await userModel.findByIdAndUpdate(userId, { password: newPassword });
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        return res.status(500).json({ message: "Error updating password" });
    }
});

router.post("/update-name", async (req, res) => {
    try {
        const { userId, newName } = req.body;
        const user = await userModel.findByIdAndUpdate(userId, { name: newName }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "Name updated successfully", user });
    } catch (err) {
        return res.status(500).json({ message: "Error updating name" });
    }
});

router.post("/contact-through-email", async (req, res) => {
  try {
    const { userId, subject, message } = req.body;

    if (!userId || !subject || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await userModel.findById(userId).select("email");

    if (!user || !user.email) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendEmail(userId, user.email, subject, message);

    return res.status(200).json({
      message: "Your message has been sent to the developer",
    });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ message: "Error sending contact email" });
  }
});


module.exports = router;