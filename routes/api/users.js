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

const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET;

const upload = multer({
  dest: "tmp/",
  limits: { fileSize: 5 * 250 * 250 },
});

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
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

    const newUser = await Users.create({ 
      email, 
      password: hashedPassword,
      avatarURL, 
    });

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

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
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

module.exports = router;
