import Review from "../models/Review.js";

export const requireReviewOwner = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.review = review;
    next();
  } catch (error) {
    console.error("Review ownership middleware error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
