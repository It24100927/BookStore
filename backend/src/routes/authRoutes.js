import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import protectRoute from "../middleware/auth.middleware.js";
import isAdmin from "../middleware/admin.middleware.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import { uploadBookImage } from "../lib/cloudinary.js";

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15d" });
};

const toUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  profileImage: user.profileImage,
  role: user.role,
  mobile: user.mobile,
  address: user.address,
  paymentCard: user.paymentCard,
  createdAt: user.createdAt,
});

// ─── PUBLIC ROUTES ────────────────────────────────────────

router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters long" });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: "Username should be at least 3 characters long" });
    }

    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username.trim()}`;

    const user = new User({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password,
      profileImage,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── AUTHENTICATED USER ROUTES ────────────────────────────

router.get("/me", protectRoute, async (req, res) => {
  return res.status(200).json({ user: toUserResponse(req.user) });
});

router.put("/profile", protectRoute, async (req, res) => {
  try {
    const { username, email, password, mobile, address, paymentCard } = req.body;

    if (!username?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Username and email are required" });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ message: "Username should be at least 3 characters long" });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    const duplicateUsername = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user._id },
    });
    if (duplicateUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const { profileImage } = req.body;
    if (profileImage && profileImage.startsWith("data:image")) {
       const imageUrl = await uploadBookImage(profileImage);
       req.user.profileImage = imageUrl;
    }

    const duplicateEmail = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: req.user._id },
    });
    if (duplicateEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    req.user.username = username.trim();
    req.user.email = email.trim().toLowerCase();

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password should be at least 6 characters long" });
      }
      req.user.password = password;
    }

    if (mobile !== undefined) {
      req.user.mobile = {
        countryCode: mobile.countryCode?.trim() || "",
        number: mobile.number?.trim() || "",
        flag: mobile.flag?.trim() || "",
      };
    }

    if (address !== undefined) {
      req.user.address = {
        street: address.street?.trim() || "",
        postalCode: address.postalCode?.trim() || "",
        country: address.country?.trim() || "",
      };
    }

    if (paymentCard && paymentCard.cardNumber) {
      // Validate Card Number Length & Format (Visa / Mastercard)
      const sanitizedCard = paymentCard.cardNumber.replace(/\s+/g, '');
      const isVisa = /^4[0-9]{12}(?:[0-9]{3})?$/.test(sanitizedCard);
      const isMastercard = /^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/.test(sanitizedCard);
      
      if (!isVisa && !isMastercard) {
        return res.status(400).json({ message: "Invalid Card. Must be Visa or Mastercard." });
      }

      // Validate Expiry Date MM/YY
      const expiry = paymentCard.expiryDate?.trim();
      const expiryRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
      if (!expiryRegex.test(expiry)) {
        return res.status(400).json({ message: "Invalid Expiry Date. Format must be MM/YY" });
      }
      const [, month, year] = expiry.match(expiryRegex);
      const currentDate = new Date();
      const currentYear = parseInt(currentDate.getFullYear().toString().slice(-2), 10);
      const currentMonth = currentDate.getMonth() + 1;
      
      const expYear = parseInt(year, 10);
      const expMonth = parseInt(month, 10);
      
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
         return res.status(400).json({ message: "Card has expired" });
      }

      // Validate CVV
      const cvv = paymentCard.cvv?.trim();
      if (!/^[0-9]{3,4}$/.test(cvv)) {
        return res.status(400).json({ message: "Invalid CVV. Must be 3 or 4 digits" });
      }

      req.user.paymentCard = {
        cardNumber: paymentCard.cardNumber || "",
        expiryDate: paymentCard.expiryDate || "",
        cvv: paymentCard.cvv || "",
      };
    } else if (paymentCard && !paymentCard.cardNumber) {
      // Allow clearing the card
      req.user.paymentCard = { cardNumber: "", expiryDate: "", cvv: "" };
    }

    await req.user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: toUserResponse(req.user),
    });
  } catch (error) {
    console.error("Error updating profile", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/account", protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;

    await Promise.all([
      Review.deleteMany({ user: userId }),
      Order.deleteMany({ user: userId }),
      User.findByIdAndDelete(userId),
    ]);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ─── ADMIN-ONLY ROUTES ───────────────────────────────────

// Get all users (admin)
router.get("/admin/users", protectRoute, isAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments();

    return res.status(200).json({
      users,
      currentPage: page,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    console.error("Error fetching users", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new user — admin or customer (admin-only)
router.post("/admin/create-user", protectRoute, isAdmin, async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password should be at least 6 characters long" });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ message: "Username should be at least 3 characters long" });
    }

    const validRole = role === "admin" ? "admin" : "customer";

    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username.trim()}`;

    const newUser = new User({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password,
      profileImage,
      role: validRole,
    });

    await newUser.save();

    return res.status(201).json({
      message: `${validRole === "admin" ? "Admin" : "User"} created successfully`,
      user: toUserResponse(newUser),
    });
  } catch (error) {
    console.error("Error creating user", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a user (admin)
router.delete("/admin/users/:id", protectRoute, isAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own admin account from here" });
    }

    await Promise.all([
      Review.deleteMany({ user: targetUser._id }),
      Order.deleteMany({ user: targetUser._id }),
      User.findByIdAndDelete(targetUser._id),
    ]);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
