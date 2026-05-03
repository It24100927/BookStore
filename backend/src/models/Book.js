import mongoose from "mongoose";

const CATEGORIES = [
  "Fiction",
  "Non-Fiction",
  "Novel",
  "Science Fiction",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Romance",
  "Horror",
  "Biography",
  "Self-Help",
  "History",
  "Science",
  "Technology",
  "Business",
  "Children",
  "Poetry",
  "Comics",
  "Other",
];

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stockCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
      default: "Other",
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Text index for search
bookSchema.index({ title: "text", caption: "text" });

const Book = mongoose.model("Book", bookSchema);

export { CATEGORIES };
export default Book;
