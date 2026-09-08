import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CLUB 90s",
    short_name: "CLUB90s",
    description: "Membership, matches, finance, tournaments, and community for CLUB 90s.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f6",
    theme_color: "#1c7a3e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
