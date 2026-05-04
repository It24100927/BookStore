import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 500,
      trim: true,
    },
  },
  { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 500,
      trim: true,
    },
    replies: [replySchema],
  },
  { timestamps: true }
);

// One review per user per book
reviewSchema.index({ user: 1, book: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
