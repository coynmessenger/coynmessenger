import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Main.tsx is loading...");

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    console.log("Creating React root...");
    root.render(<App />);
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error mounting React app:", error);
  }
} else {
  console.error("Root element not found!");
}
