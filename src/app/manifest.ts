import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/lib/theme";

// Required so the manifest is emitted as a static file with `output: 'export'`.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ملّيقة — مساعد المطبخ",
    short_name: "ملّيقة",
    description: "ماذا أطبخ اليوم أو غداً بما عندي في البيت؟ يعمل بلا إنترنت.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLORS.light,
    theme_color: "#C44A2B",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "مطبخي", url: "/pantry", description: "حدّث ما عندك من مكونات" },
      { name: "وصفات", url: "/recipes", description: "تصفّح كل الوصفات" },
    ],
  };
}
