import { Platform } from "react-native";
import Constants from "expo-constants";

const getExpoHost = () => {
	const hostFromExpoGo = Constants.expoGoConfig?.debuggerHost;
	if (hostFromExpoGo) return hostFromExpoGo.split(":")[0];

	const hostFromExpoConfig = Constants.expoConfig?.hostUri;
	if (hostFromExpoConfig) return hostFromExpoConfig.split(":")[0];

	return "";
};

const expoHost = getExpoHost();

// Prefer Expo's auto-detected host (always matches dev machine IP),
// then fall back to .env, then platform defaults.
const getBaseUrl = () => {
	if (expoHost) return `http://${expoHost}:5000`;
	if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
	return Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
};

const resolvedBaseUrl = getBaseUrl();

export const API_URL = `${resolvedBaseUrl}/api`;

console.log("[API] Base URL →", API_URL);
