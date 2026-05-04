import express from "express";
import Book from "../models/Book.js";
import Review from "../models/Review.js";
import protectRoute from "../middleware/auth.middleware.js";
import mongoose from "mongoose";
import { requireReviewOwner } from "../middleware/ownership.middleware.js";

const updateBookAverageRating = async (bookId) => {
  const avgResult = await Review.aggregate([
    { $match: { book: new mongoose.Types.ObjectId(bookId) } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } },
  ]);
  const averageRating = avgResult.length > 0 ? Math.round(avgResult[0].averageRating * 10) / 10 : 0;
  await Book.findByIdAndUpdate(bookId, { averageRating });
};

const router = express.Router();

// Get reviews for a book (with average rating)
router.get("/book/:bookId", protectRoute, async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const reviews = await Review.find({ book: bookId })
      .sort({ createdAt: -1 })
      .populate("user", "username profileImage role")
      .populate("replies.user", "username profileImage role");

    const avgResult = await Review.aggregate([
      { $match: { book: book._id } },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const averageRating = avgResult.length > 0 ? Math.round(avgResult[0].averageRating * 10) / 10 : 0;
    const reviewCount = avgResult.length > 0 ? avgResult[0].count : 0;

    return res.status(200).json({ reviews, averageRating, reviewCount });
  } catch (error) {
    console.error("Error fetching reviews", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create a review (CUSTOMERS ONLY — admins cannot review)
router.post("/book/:bookId", protectRoute, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot write reviews" });
    }

    const { bookId } = req.params;
    const { text, rating } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Review text is required" });
    }
    if (text.trim().length < 5 || text.trim().length > 500) {
      return res.status(400).json({ message: "Review must be between 5 and 500 characters" });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const existingReview = await Review.findOne({ book: bookId, user: req.user._id });
    if (existingReview) {
      return res.status(409).json({ message: "You have already reviewed this book" });
    }

    const review = await Review.create({
      book: bookId,
      user: req.user._id,
      text: text.trim(),
      rating: numericRating,
    });

    const populatedReview = await Review.findById(review._id)
      .populate("user", "username profileImage role");

    await updateBookAverageRating(bookId);

    return res.status(201).json(populatedReview);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already reviewed this book" });
    }
    console.error("Error creating review", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update a review (owner only)
router.put("/:id", protectRoute, requireReviewOwner, async (req, res) => {
  try {
    const { text, rating } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Review text is required" });
    }
    if (text.trim().length < 5 || text.trim().length > 500) {
      return res.status(400).json({ message: "Review must be between 5 and 500 characters" });
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      }
      req.review.rating = numericRating;
    }

    req.review.text = text.trim();
    await req.review.save();

    const updatedReview = await Review.findById(req.review._id)
      .populate("user", "username profileImage role")
      .populate("replies.user", "username profileImage role");

    await updateBookAverageRating(req.review.book);

    return res.status(200).json(updatedReview);
  } catch (error) {
    console.error("Error updating review", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a review (owner only)
router.delete("/:id", protectRoute, requireReviewOwner, async (req, res) => {
  try {
    const bookId = req.review.book;
    await req.review.deleteOne();
    await updateBookAverageRating(bookId);
    return res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Add a reply to a review (any authenticated user)
router.post("/:id/reply", protectRoute, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }
    if (text.trim().length > 500) {
      return res.status(400).json({ message: "Reply must be under 500 characters" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.replies.push({
      user: req.user._id,
      text: text.trim(),
    });

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate("user", "username profileImage role")
      .populate("replies.user", "username profileImage role");

    return res.status(201).json(updatedReview);
  } catch (error) {
    console.error("Error adding reply", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a reply (reply owner or admin)
router.delete("/:id/reply/:replyId", protectRoute, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const reply = review.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (reply.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    review.replies.pull(req.params.replyId);
    await review.save();

    return res.status(200).json({ message: "Reply deleted" });
  } catch (error) {
    console.error("Error deleting reply", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
