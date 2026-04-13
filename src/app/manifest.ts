import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tetris Nexus",
    short_name: "Nexus",
    description: "Installable Tetris with typed engine architecture.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#fb7185",
    orientation: "portrait",
    categories: ["games", "entertainment"],
  };
}
