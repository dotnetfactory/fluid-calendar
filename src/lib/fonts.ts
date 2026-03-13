import localFont from "next/font/local";

// Load Inter font from local files
export const inter = localFont({
  src: "../../public/fonts/inter/Inter-V.ttf",
  variable: "--font-inter",
  display: "swap",
});
