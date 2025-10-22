// test/webrtc-simulate.ts
// Quick test harness for debugging WebRTC signaling in COYN Messenger
import { io } from "socket.io-client";

const URL = "http://localhost:5000"; // Backend URL

const caller = io(URL);
const callee = io(URL);

let testCallId: string;

caller.on("connect", () => {
  console.log("\n🔵 [CALLER] Connected, socket ID:", caller.id);
  caller.emit("authenticate", { userId: "userA" });
  console.log("🔵 [CALLER] Sent authentication for userA");

  // Initiate a call to userB after auth
  setTimeout(() => {
    testCallId = `test_call_${Date.now()}`;
    console.log("\n🔵 [CALLER] Initiating call to userB...");
    console.log("🔵 [CALLER] Call ID:", testCallId);
    
    caller.emit("initiate-call", {
      callId: testCallId,
      targetUserId: "userB",
      type: "voice",
      offer: {
        type: "offer",
        sdp: "fake-offer-sdp-data"
      }
    });
  }, 1000);
});

caller.on("call-initiated", (payload) => {
  console.log("\n✅ [CALLER] Received call-initiated confirmation:", payload);
});

caller.on("call-accepted", (payload) => {
  console.log("\n✅ [CALLER] Received call-accepted:", payload);
  console.log("   Answer SDP:", payload.answer?.sdp?.substring(0, 50) + "...");
  
  // End the call after 2 seconds
  setTimeout(() => {
    console.log("\n🔵 [CALLER] Ending call...");
    caller.emit("end-call", { callId: testCallId });
  }, 2000);
});

caller.on("call-ended", (payload) => {
  console.log("\n✅ [CALLER] Received call-ended:", payload);
  console.log("\n🎉 TEST COMPLETE - Disconnecting...");
  
  setTimeout(() => {
    caller.disconnect();
    callee.disconnect();
    process.exit(0);
  }, 500);
});

caller.on("call-error", (error) => {
  console.error("\n❌ [CALLER] Call error:", error);
});

callee.on("connect", () => {
  console.log("\n🟢 [CALLEE] Connected, socket ID:", callee.id);
  callee.emit("authenticate", { userId: "userB" });
  console.log("🟢 [CALLEE] Sent authentication for userB");
});

callee.on("incoming-call", (payload) => {
  console.log("\n✅ [CALLEE] Incoming call detected!");
  console.log("   From User ID:", payload.fromUserId);
  console.log("   Call ID:", payload.callId);
  console.log("   Call Type:", payload.type);
  console.log("   Offer SDP:", payload.offer?.sdp?.substring(0, 50) + "...");
  console.log("   Encrypted:", payload.encrypted);
  
  // Simulate acceptance after 1 second
  setTimeout(() => {
    console.log("\n🟢 [CALLEE] Accepting call...");
    callee.emit("accept-call", {
      callId: payload.callId,
      answer: {
        type: "answer",
        sdp: "fake-answer-sdp-data"
      }
    });
  }, 1000);
});

callee.on("call-accepted-confirmation", (payload) => {
  console.log("\n✅ [CALLEE] Received call-accepted confirmation:", payload);
});

callee.on("call-ended", (payload) => {
  console.log("\n✅ [CALLEE] Received call-ended:", payload);
  console.log("   Ended by:", payload.endedBy);
  console.log("   Reason:", payload.reason);
});

callee.on("instant-notification", (payload) => {
  console.log("\n📬 [CALLEE] Received instant notification:", payload);
});

callee.on("call-error", (error) => {
  console.error("\n❌ [CALLEE] Call error:", error);
});

// Log all events for debugging
caller.onAny((event, ...args) => {
  if (!['connect', 'call-initiated', 'call-accepted', 'call-ended', 'call-error'].includes(event)) {
    console.log("🔵 [CALLER] Event:", event, args);
  }
});

callee.onAny((event, ...args) => {
  if (!['connect', 'incoming-call', 'instant-notification', 'call-accepted-confirmation', 'call-ended', 'call-error'].includes(event)) {
    console.log("🟢 [CALLEE] Event:", event, args);
  }
});

// Handle errors
caller.on("connect_error", (err) => {
  console.error("❌ [CALLER] Connection error:", err.message);
});

callee.on("connect_error", (err) => {
  console.error("❌ [CALLEE] Connection error:", err.message);
});

console.log("🚀 Starting WebRTC signaling test...");
console.log("📍 Server URL:", URL);
console.log("\n" + "=".repeat(60));
