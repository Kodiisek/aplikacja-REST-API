const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const gravatar = require("gravatar");
const multer = require("multer");
const jimp = require("jimp");
const path = require("path");
const fs = require("fs");
const Users = require("../../models/user");
const sendVerificationEmail = require("../../emailAuth/sgMail");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET;

const checkToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const upload = multer({
  dest: "tmp/",
  limits: { fileSize: 5 * 250 * 250 },
});

router.post("/signup", async (req, res) => {
  try {
    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarURL = gravatar.url(email, {
      s: '200',
      r: 'pg',
      d: 'mm',
    });

    const verificationToken = uuidv4();

    const newUser = await Users.create({ 
      email, 
      password: hashedPassword,
      avatarURL,
      verificationToken,
    });

    await sendVerificationEmail(email, verificationToken);

    console.log("Sending email to:", email);
    
    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
        avatarURL: newUser.avatarURL, 
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/verify/:verificationToken", async (req, res) => {
  const { verificationToken } = req.params;

  try {
    const user = await Users.findOne({ verificationToken });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.verify = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: "Verification successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "missing required field email" });
  }

  try {
    const user = await Users.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verify) {
      return res.status(400).json({ message: "Verification has already been passed" });
    }

    const verificationToken = uuidv4();
    user.verificationToken = verificationToken;
    await user.save();

    await sendVerificationEmail(user.email);

    res.status(200).json({ message: "Verification email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    if (!user.verify) {
      return res.status(401).json({ message: "Email not verified" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });
    await Users.findByIdAndUpdate(user._id, { token });

    res.status(200).json({
      token,
      user: {
        email: user.email,
        subscription: user.subscription,
        avatarURL: user.avatarURL, 
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/current", checkToken, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.status(200).json({
      email: user.email,
      subscription: user.subscription,
      avatarURL: user.avatarURL, 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/avatars", checkToken, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { path: tempPath, originalname } = req.file;
    const { _id } = req.user;

    try {
      if (!fs.existsSync(tempPath)) {
        return res.status(500).json({ message: "Temporary file not found" });
      }

      const image = await jimp.read(path.resolve(tempPath));
      await image.resize(250, 250);

      const avatarName = `${_id}_${Date.now()}.jpg`;
      const publicPath = path.join(__dirname, "../../public/avatars", avatarName);

      await image.write(publicPath);

      fs.unlinkSync(tempPath);

      const avatarURL = `/avatars/${avatarName}`;

      await Users.findByIdAndUpdate(_id, { avatarURL });

      res.status(200).json({ avatarURL });
    } catch (err) {
      return res.status(500).json({ message: "Error processing image", error: err.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || !text || !html) {
      return res.status(400).json({ message: "Missing required email fields" });
    }

    await sendEmail({ to, subject, text, html });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending email", error });
  }
});

module.exports = router;
