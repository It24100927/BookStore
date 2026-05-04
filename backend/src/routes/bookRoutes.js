import express from "express";
import {
  uploadBookImage,
  deleteCloudinaryImageIfAny,
  isCloudinaryConfigured,
} from "../lib/cloudinary.js";
import Book, { CATEGORIES } from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";
import isAdmin from "../middleware/admin.middleware.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

const router = express.Router();

const getCloudinaryPublicIdFromUrl = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary")) return null;
  const withoutVersion = imageUrl.split("/upload/")[1];
  if (!withoutVersion) return null;
  const segments = withoutVersion.split("/");
  if (segments[0].startsWith("v")) segments.shift();
  const fileName = segments.pop();
  if (!fileName) return null;
  const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
  return [...segments, fileNameWithoutExt].join("/");
};

// Get available categories
router.get("/categories", protectRoute, (req, res) => {
  return res.status(200).json(CATEGORIES);
});

// Admin only: Create a new book
router.post("/", protectRoute, isAdmin, async (req, res) => {
  try {
    const { title, caption, image, price, stockCount, category, discountPercentage } = req.body;

    if (!image || !title?.trim() || !caption?.trim()) {
      return res.status(400).json({ message: "Title, caption, and image are required" });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "Price must be a non-negative number" });
    }

    const numericStock = Number(stockCount);
    if (isNaN(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
      return res.status(400).json({ message: "Stock count must be a non-negative integer" });
    }

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const imageUrl = await uploadBookImage(image);

    const newBook = new Book({
      title: title.trim(),
      caption: caption.trim(),
      image: imageUrl,
      price: numericPrice,
      stockCount: numericStock,
      category: category || "Other",
      discountPercentage: discountPercentage ? Number(discountPercentage) : 0,
    });

    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    console.log("Error creating book", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// All authenticated: Browse books with search, filter, pagination
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, category, sort } = req.query;

    const filter = {};

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { caption: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    let sortOption = { createdAt: -1 };
    if (sort === "rating") sortOption = { averageRating: -1, createdAt: -1 };
    if (sort === "popular") sortOption = { soldCount: -1, createdAt: -1 };

    const books = await Book.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalBooks = await Book.countDocuments(filter);

    res.status(200).json({
      books,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (error) {
    console.log("Error in get all books route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get a single book
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    return res.status(200).json(book);
  } catch (error) {
    console.log("Error fetching book", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Admin only: Update a book
router.put("/:id", protectRoute, isAdmin, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const { title, caption, price, stockCount, image, category, discountPercentage } = req.body;

    if (!title?.trim() || !caption?.trim()) {
      return res.status(400).json({ message: "Title and caption are required" });
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number" });
      }
      book.price = numericPrice;
    }

    if (stockCount !== undefined) {
      const numericStock = Number(stockCount);
      if (isNaN(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
        return res.status(400).json({ message: "Stock count must be a non-negative integer" });
      }
      book.stockCount = numericStock;
    }

    if (category) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      book.category = category;
    }

    if (discountPercentage !== undefined) {
      const numericDiscount = Number(discountPercentage);
      if (isNaN(numericDiscount) || numericDiscount < 0 || numericDiscount > 100) {
        return res.status(400).json({ message: "Discount must be between 0 and 100" });
      }
      book.discountPercentage = numericDiscount;
    }

    book.title = title.trim();
    book.caption = caption.trim();

    if (image) {
      const oldPublicId = getCloudinaryPublicIdFromUrl(book.image);
      if (oldPublicId) {
        await deleteCloudinaryImageIfAny(oldPublicId).catch(() => null);
      }
      book.image = await uploadBookImage(image);
      if (!isCloudinaryConfigured && image?.startsWith("data:image")) {
        book.image = image;
      }
    }

    await book.save();
    return res.status(200).json(book);
  } catch (error) {
    console.log("Error updating book", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Admin only: Delete a book
router.delete("/:id", protectRoute, isAdmin, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const publicId = getCloudinaryPublicIdFromUrl(book.image);
    if (publicId) {
      try {
        await deleteCloudinaryImageIfAny(publicId);
      } catch (deleteError) {
        console.log("Error deleting image from cloudinary", deleteError);
      }
    }

    await Promise.all([
      book.deleteOne(),
      Review.deleteMany({ book: book._id }),
      User.updateMany({ wishlist: book._id }, { $pull: { wishlist: book._id } }),
    ]);

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.log("Error deleting book", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
