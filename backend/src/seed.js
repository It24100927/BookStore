import mongoose from "mongoose";
import "dotenv/config";
import User from "./models/User.js";
import { connectDB } from "./lib/db.js";

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      process.exit(0);
    }

    const admin = new User({
      username: "admin",
      email: "admin@bookworm.com",
      password: "admin123",
      role: "admin",
      profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    });

    await admin.save();
    console.log("Admin user created successfully:");
    console.log(`  Email: admin@bookworm.com`);
    console.log(`  Password: admin123`);
    console.log(`  Role: admin`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
