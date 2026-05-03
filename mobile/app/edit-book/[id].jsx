import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

// Edit book functionality is now handled by /admin-book-form with ?id= param.
// This file redirects to it for backward compatibility.
export default function EditBook() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace({ pathname: "/admin-book-form", params: { id } });
    } else {
      router.back();
    }
  }, [id]);

  return null;
}
