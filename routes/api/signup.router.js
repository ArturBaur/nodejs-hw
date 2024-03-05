const express = require("express");
const signup = express.Router();
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const gravatar = require("gravatar");
const User = require("../../model/user.model");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { v4: uuidv4 } = require("uuid");

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

signup.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { error } = signupSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email in use" });
    }

    const avatarURL = gravatar.url(email, {
      protocol: "http",
      s: "250",
      rating: "pg",
      d: "404",
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = uuidv4();

    const newUser = new User({
      email,
      password: hashedPassword,
      avatarURL,
      verificationToken,
    });

    await newUser.save();

    const verificationLink = `${req.protocol}://${req.get(
      "host"
    )}/users/verify/${verificationToken}`;
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

    res.status(201).json({
      message: "Success, user registered",
      user: { email: newUser.email, subscription: newUser.subscription },
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = signup;
