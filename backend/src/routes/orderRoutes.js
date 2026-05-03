import express from "express";
import Order from "../models/Order.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";
import isAdmin from "../middleware/admin.middleware.js";

const router = express.Router();

// ─── CUSTOMER ROUTES ──────────────────────────────────────

// Create an order (checkout)
router.post("/", protectRoute, async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    if (!shippingAddress || !shippingAddress.street?.trim() || !shippingAddress.postalCode?.trim() || !shippingAddress.country?.trim()) {
      return res.status(400).json({ message: "Complete shipping address (street, postal code, country) is required" });
    }

    const validPaymentMethods = ["Card", "Cash on Delivery"];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let totalPrice = 0;
    const processedItems = [];

    for (const item of orderItems) {
      if (!item.book || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: "Each item must have a valid book ID and quantity" });
      }

      const quantity = Math.floor(Number(item.quantity));
      if (isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a positive integer" });
      }

      const book = await Book.findById(item.book);
      if (!book) {
        return res.status(404).json({ message: `Book not found: ${item.book}` });
      }

      if (book.stockCount < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${book.title}". Available: ${book.stockCount}, Requested: ${quantity}`,
        });
      }

      const discountMod = book.discountPercentage ? (1 - book.discountPercentage / 100) : 1;
      const checkoutPrice = Math.round(book.price * discountMod * 100) / 100;

      processedItems.push({
        book: book._id,
        title: book.title,
        price: checkoutPrice,
        image: book.image,
        quantity,
      });

      totalPrice += checkoutPrice * quantity;
    }

    // Decrement stock and increment soldCount for all items
    for (const item of processedItems) {
      await Book.findByIdAndUpdate(item.book, {
        $inc: { stockCount: -item.quantity, soldCount: item.quantity },
      });
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems: processedItems,
      totalPrice: Math.round(totalPrice * 100) / 100,
      shippingAddress: {
        street: shippingAddress.street.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        country: shippingAddress.country.trim(),
      },
      paymentMethod: paymentMethod || "Cash on Delivery",
    });

    const populatedOrder = await Order.findById(order._id).populate("user", "username email");

    return res.status(201).json(populatedOrder);
  } catch (error) {
    console.error("Error creating order", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get logged-in user's orders
router.get("/myorders", protectRoute, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "username email");

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Cancel an order (customer — pending only, restores stock)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: `Cannot cancel an order that is already '${order.status}'` });
    }

    // Restore stock for each item
    for (const item of order.orderItems) {
      await Book.findByIdAndUpdate(item.book, { $inc: { stockCount: item.quantity } });
    }

    await Order.findByIdAndUpdate(order._id, { status: "cancelled" });

    return res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling order", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────

// Get all orders (admin)
router.get("/", protectRoute, isAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username email profileImage");

    const totalOrders = await Order.countDocuments();

    return res.status(200).json({
      orders,
      currentPage: page,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (error) {
    console.error("Error fetching all orders", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update order status (admin)
router.put("/:id/status", protectRoute, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["pending", "shipped", "delivered", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate("user", "username email profileImage");

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
