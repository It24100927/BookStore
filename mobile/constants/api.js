import { Platform } from "react-native";
import Constants from "expo-constants";

// ── Production backend URL (Railway) ──────────────────────
const PRODUCTION_URL = "https://onlinebookstore-production-73ec.up.railway.app";

const getExpoHost = () => {
	const hostFromExpoGo = Constants.expoGoConfig?.debuggerHost;
	if (hostFromExpoGo) return hostFromExpoGo.split(":")[0];

	const hostFromExpoConfig = Constants.expoConfig?.hostUri;
	if (hostFromExpoConfig) return hostFromExpoConfig.split(":")[0];

	return "";
};

const expoHost = getExpoHost();

// In dev mode, use local server; in production, use Railway
const getBaseUrl = () => {
	if (__DEV__ && expoHost) return `http://${expoHost}:5000`;
	if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
	return PRODUCTION_URL;
};

const resolvedBaseUrl = getBaseUrl();

export const API_URL = `${resolvedBaseUrl}/api`;

console.log("[API] Base URL →", API_URL);
