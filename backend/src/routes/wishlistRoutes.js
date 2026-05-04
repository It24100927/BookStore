import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import Book from "../models/Book.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");

    return res.status(200).json(user?.wishlist || []);
  } catch (error) {
    console.error("Error fetching wishlist", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:bookId", protectRoute, async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(req.user._id);
    const alreadySaved = user.wishlist.some((savedBookId) => savedBookId.toString() === bookId);

    if (alreadySaved) {
      return res.status(409).json({ message: "Book already in wishlist" });
    }

    user.wishlist.push(bookId);
    await user.save();

    return res.status(201).json({ message: "Book added to wishlist" });
  } catch (error) {
    console.error("Error adding to wishlist", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:bookId", protectRoute, async (req, res) => {
  try {
    const { bookId } = req.params;

    await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: bookId } });

    return res.status(200).json({ message: "Book removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
