export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email) => EMAIL_REGEX.test(email?.trim() || "");

export const validatePassword = (password) => (password || "").length >= 6;

export const validateUsername = (username) => (username?.trim() || "").length >= 3;
