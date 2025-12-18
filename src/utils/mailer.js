const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTP = async (email, otp) => {
  await resend.emails.send({
    from: "onboarding@resend.dev", // ✅ REQUIRED
    to: email,
    subject: "Your OTP Code",
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>Valid for 5 minutes.</p>
    `,
  });
};

const sendEmail = async (userId, fromEmail, subject, message) => {
  await resend.emails.send({
    from: "contact@resend.dev",
    to: "ramr33770@gmail.com",
    subject,
    reply_to: fromEmail,
    html: `
      <h2>Contact from User <p>${userId}</p></h2>
      <p><strong>From:</strong> ${fromEmail}</p>
      <p>${message}</p>
    `,
  });
};


module.exports = { sendOTP, sendEmail };
