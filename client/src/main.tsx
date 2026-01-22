import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('🚀 COYN Messenger: App initializing...');
console.log('📋 COYN Messenger: Environment:', import.meta.env.MODE);
console.log('📋 COYN Messenger: Build time:', new Date().toISOString());

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
