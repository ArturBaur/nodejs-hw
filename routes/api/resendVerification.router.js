const express = require("express");
const resendVerification = express.Router();
const Joi = require("joi");
const User = require("../../model/user.model");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});

resendVerification.post("/", async (req, res) => {
  try {
    const { error } = resendVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Missing required field: email" });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
    }

    const verificationLink = `${req.protocol}://${req.get(
      "host"
    )}/users/verify/${user.verificationToken}`;
    const msg = {
      to: "artur.baur@gmail.com",
      from: "artur.baur@gmail.com",
      subject: "Email verification",
      html: `
        <p>Click the link below to verify your email:</p>
        <a href="${verificationLink}">${verificationLink}</a>
      `,
    };
    await sgMail.send(msg);

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error during resending verification email:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = resendVerification;
