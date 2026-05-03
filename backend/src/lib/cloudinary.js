import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

export const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadBookImage = async (imageInput) => {
  if (isCloudinaryConfigured && imageInput?.startsWith("data:image")) {
    const uploadResponse = await cloudinary.uploader.upload(imageInput);
    return uploadResponse.secure_url;
  }

  return imageInput;
};

export const deleteCloudinaryImageIfAny = async (publicId) => {
  if (!isCloudinaryConfigured || !publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
