# Voice Call Testing Guide - Comprehensive Test Suite

## Ringtone System Architecture

The voice call system uses a **three-layer approach** for reliable ringtone playback:

### Layer 1: Backend Signaling
- When User A calls User B, the server routes `incoming-call` event via WebSocket
- Server sends instant notification for UI toast display
- Event includes callId, caller info, and call type

### Layer 2: Frontend Client
- Voice/video modal receives `incoming-call` event
- Immediately calls `ringtoneService.startRingtone()`
- Ringtone loops until user answers, declines, or caller hangs up
- Uses Web Audio API with dual-tone ring (440Hz + 480Hz) - classic US phone ring

### Layer 3: Browser API Persistence
- Uses `document.hidden` to detect background tabs
- Implements Visibility API listener for tab focus changes
- Queues ringtone if tab is hidden, resumes when visible
- Handles autoplay restrictions with user gesture detection

## Prerequisites
- Two browser windows/tabs or two devices
- User A: First account (caller)
- User B: Second account (recipient)
- Microphone permissions enabled on both
- Browser console open for debugging

## Test Scenarios

### Test 1: Basic Outgoing Voice Call
**Objective**: Verify outgoing voice call initiation works

**Steps**:
1. User A logs in and opens messenger
2. User A clicks voice call button to User B
3. Check console for logs:
   - ✅ `📞 DEEP TEST: ✅ STARTING OUTGOING CALL INITIATION...`
   - ✅ `📞 OUTGOING CALL: Call initiated successfully, ID: [callId]`
   - ✅ `🔊 VOICE CALL: Received remote audio stream`
4. User B should see incoming call notification

**Expected Results**:
- Modal opens with "Connecting" status
- Transitions to "Ringing" after initiation
- Microphone permission granted (no popup blocks)
- Call ID is set and logs appear

---

### Test 2: Incoming Call Reception
**Objective**: Verify incoming calls are received and buffered properly

**Steps**:
1. User A calls User B
2. Check User B's console for logs:
   - ✅ `📞 INCOMING CALL: ==================== RECEIVED ====================`
   - ✅ `📞 INCOMING CALL: Call ID: [callId]`
   - ✅ `✅ INCOMING CALL: Added to activeCalls`
   - ✅ `📞 INCOMING CALL: Triggering onIncomingCall handler`
3. Incoming call modal should appear
4. Check for buffering logs if modal delayed:
   - ✅ `📦 INCOMING CALL: No handler yet, buffering event for later delivery`
   - ✅ `📦 EVENT HANDLER: Delivering buffered incoming call`

**Expected Results**:
- Incoming call modal opens immediately
- Ringtone plays (if available)
- Call details show correctly
- No errors in console

---

### Test 3: Modal Timing Race Condition Fix
**Objective**: Verify incomingCallId is set before user clicks accept

**Steps**:
1. User B receives incoming call
2. Check console immediately:
   - ✅ `🎙️ VOICE: Setting encryptedCallId from incomingCallId: [callId]`
3. User B clicks Accept button
4. Verify Accept button works (doesn't say "Call not found")

**Expected Results**:
- Call ID is captured correctly
- Accept button works without delay
- No "Call not found" errors
- Connection established

---

### Test 4: ICE Candidate Queuing
**Objective**: Verify ICE candidates are buffered and processed

**Steps**:
1. During call establishment, check console for:
   - ✅ `🧊 ICE: Received ICE candidate for call: [callId]`
   - ✅ `🧊 ICE: No peer connection yet - queuing candidate`
   - ✅ `🧊 ICE: Queued candidates count: [N]`
   - ✅ `🧊 ICE: Remote description not set yet - queuing candidate`
   - ✅ `🧊 ICE: Processing [N] pending ICE candidates`
   - ✅ `🧊 ICE: Pending candidate added successfully`
   - ✅ `🧊 ICE: All pending candidates processed`

**Expected Results**:
- Candidates are queued when peer connection not ready
- Candidates processed when remote description set
- No "Failed to add ICE candidate" errors
- Connection completes successfully

---

### Test 5: Stream Buffering
**Objective**: Verify remote audio streams are buffered and delivered

**Steps**:
1. During call connection, check for:
   - ✅ `📦 STREAM SETUP: Delivering buffered remote stream for call: [callId]`
   - OR ✅ `✅ STREAM SETUP: Handler available, delivering stream immediately`
2. Verify audio playback starts:
   - ✅ `✅ VOICE CALL: Remote audio playback started successfully`
   - OR ✅ `🔄 VOICE CALL: User gesture already received, retrying immediately`

**Expected Results**:
- Remote audio plays without delay
- Autoplay restrictions handled gracefully
- Retry logic works if autoplay blocked
- Both sides can hear each other

---

### Test 6: Event Handler Registration
**Objective**: Verify pending events are delivered when handlers register

**Steps**:
1. Check console during modal setup:
   - ✅ `📦 EVENT HANDLER: Delivering buffered incoming call for: [callId]`
   - ✅ `📦 EVENT HANDLER: Delivering buffered call accepted for: [callId]`
   - ✅ `📦 EVENT HANDLER: Delivering buffered remote stream for: [callId]`

**Expected Results**:
- All buffered events delivered on handler registration
- No events lost due to timing
- UI updates correctly

---

### Test 7: Accept Voice Call
**Objective**: Verify call acceptance flow with bi-directional audio

**Steps**:
1. User B receives incoming call
2. User B clicks Accept button
3. Check console for (RECEIVER SIDE):
   - ✅ `🧪 COMPREHENSIVE TEST: ==================== ACCEPT CALL TEST ====================`
   - ✅ `✅ TEST PASSED: Service Initialization Check`
   - ✅ `✅ TEST PASSED: Call found in activeCalls`
   - ✅ `✅ ACCEPT: Using cached microphone stream`
   - ✅ `📞 ACCEPT: Setting remote offer description`
   - ✅ `✅ ACCEPT: Remote offer set successfully`
   - ✅ `📞 ACCEPT: Creating WebRTC answer...`
   - ✅ `✅ ACCEPT: Local answer SDP set successfully`
   - ✅ `🔊 BI-DIRECTIONAL AUDIO CHECK:` (with outgoing track info)
   - ✅ `📤 ACCEPT: Sending answer to signaling server...`
   - ✅ `✅ ACCEPT: Call accepted and answer sent to caller`
   - ✅ `✅ ACCEPT CALL: HANDSHAKE COMPLETE`
4. Check console for (CALLER SIDE):
   - ✅ `📞 CALLER: RECEIVED ANSWER FROM RECEIVER`
   - ✅ `📞 CALLER: Setting remote answer SDP...`
   - ✅ `✅ CALLER: Remote answer set successfully`
   - ✅ `🔊 CALLER BI-DIRECTIONAL AUDIO CHECK:` (with incoming/outgoing track info)
   - ✅ `✅ CALLER: WEBRTC HANDSHAKE COMPLETE`

**Expected Results**:
- Accept button responsive
- Microphone stream acquired
- Remote offer processed
- Answer generated and sent
- Bi-directional audio tracks verified (both outgoing and incoming)
- Connection established
- Modal transitions to "Connected" state
- Both users can hear each other

---

### Test 8: Audio Playback Retry Logic
**Objective**: Verify autoplay restrictions are handled

**Steps**:
1. Make a call with autoplay potentially blocked
2. Check for retry logs:
   - ✅ `⚠️ VOICE CALL: Playback attempt 1 failed`
   - ✅ `🔄 VOICE CALL: User gesture already received, retrying immediately`
   - OR ✅ `💡 VOICE CALL: Autoplay blocked - saving stream for retry`

**Expected Results**:
- Autoplay blocks are handled gracefully
- Retry mechanism works
- Audio eventually plays after user gesture
- No console errors

---

### Test 9: Call Duration Timer
**Objective**: Verify call duration tracking

**Steps**:
1. Establish connected call
2. Watch the call status area
3. Verify timer starts and increments:
   - Starts at 0:00
   - Updates every second
   - Format: MM:SS (e.g., 00:05, 01:23)

**Expected Results**:
- Timer displays correctly
- Updates smoothly
- No visual glitches

---

### Test 10: End Call Flow
**Objective**: Verify proper call termination

**Steps**:
1. During active call, click Hang Up button
2. Check console for:
   - ✅ `📞 CALL ENDED: Received call ended event`
   - ✅ `🧹 Stopped local stream tracks`
   - ✅ `🧹 Stopped remote stream tracks`
3. Verify modal closes
4. Verify both users see call ended

**Expected Results**:
- Call ends gracefully
- Streams are cleaned up
- No resource leaks
- Modal closes properly
- Both users notified

---

### Test 11: Connection States
**Objective**: Verify WebRTC connection state logging

**Steps**:
1. During call, check for state transitions:
   - ✅ `🔌 CLIENT: Connection state changed: connecting`
   - ✅ `🔌 CLIENT: Connection state changed: connected`
   - ✅ `✅ CLIENT: WebRTC connection established successfully!`

**Expected Results**:
- States logged correctly
- Transitions are smooth
- Success confirmation appears
- No failed states

---

### Test 12: ICE Connection States
**Objective**: Verify ICE layer state monitoring

**Steps**:
1. During connection, check for ICE logs:
   - ✅ `🧊 ICE MONITOR: Connection state changed: checking`
   - ✅ `🧊 ICE MONITOR: Connection state changed: connected`
   - ✅ `✅ ICE MONITOR: ICE connection established!`

**Expected Results**:
- ICE states tracked correctly
- Can see if STUN/TURN is used
- Connection type identified (host, srflx, relay)

---

### Test 13: Error Handling - Microphone Denied
**Objective**: Verify graceful handling of microphone permission denial

**Steps**:
1. Deny microphone permission when prompted
2. Check console:
   - ✅ `❌ INCOMING CALL: Microphone permission denied:`
   - ✅ Toast notification: "Microphone Access Denied"

**Expected Results**:
- Error handled gracefully
- User-friendly error message
- Modal closes without crashing
- App remains stable

---

### Test 14: Cleanup on Component Unmount
**Objective**: Verify resources are released when modal unmounts

**Steps**:
1. During call, close the modal
2. Check console for cleanup logs:
   - ✅ `🧹 VOICE CALL: Component unmounting, ending call to release streams`
   - ✅ `🧹 Stopped local stream tracks`

**Expected Results**:
- Cleanup runs automatically
- No zombie streams
- Resources freed properly

---

## Console Log Expectations

### Connection Flow (Successful)
```
📞 INCOMING CALL: RECEIVED
✅ INCOMING CALL: Added to activeCalls
📞 INCOMING CALL: Triggering onIncomingCall handler
🎙️ VOICE: Setting encryptedCallId from incomingCallId
🔊 VOICE CALL: Received remote audio stream
🧊 ICE: Received ICE candidate
🧊 ICE: Processing [N] pending ICE candidates
🔌 CLIENT: Connection state changed: connected
✅ CLIENT: WebRTC connection established successfully!
```

### Error Scenarios
- No "Call not found" errors
- No "Failed to add ICE candidate" errors
- No "undefined reference" errors
- No unhandled promise rejections

---

## Performance Metrics

**Expected Connection Times**:
- Outgoing call initiation: < 1 second
- Remote audio playback: < 3 seconds
- ICE gathering: < 5 seconds
- Total connection time: < 10 seconds

**Expected Console Updates**:
- No lag in state transitions
- All logs appear in order
- No duplicate events

---

## Testing Checklist

- [ ] Test 1: Basic Outgoing Voice Call
- [ ] Test 2: Incoming Call Reception
- [ ] Test 3: Modal Timing Race Condition Fix
- [ ] Test 4: ICE Candidate Queuing
- [ ] Test 5: Stream Buffering
- [ ] Test 6: Event Handler Registration
- [ ] Test 7: Accept Voice Call
- [ ] Test 8: Audio Playback Retry Logic
- [ ] Test 9: Call Duration Timer
- [ ] Test 10: End Call Flow
- [ ] Test 11: Connection States
- [ ] Test 12: ICE Connection States
- [ ] Test 13: Error Handling - Microphone Denied
- [ ] Test 14: Cleanup on Component Unmount

---

## Debugging Tips

1. **Open Console**: Press F12 or right-click → Inspect → Console
2. **Filter Logs**: Type `VOICE` in console filter for voice-specific logs
3. **Search Logs**: Type emoji filters: 🎙️, 🧊, 🔊, ✅, ❌
4. **Copy Logs**: Select all (Ctrl+A), copy for analysis
5. **Check Timestamps**: Compare timestamps between browser and mobile client

---

## Ringtone Testing

### Test 15: Ringtone Playback
**Objective**: Verify ringtone plays for incoming calls

**Steps**:
1. User A calls User B
2. On User B's device, check console for:
   - ✅ `🔔 RINGTONE: Starting incoming call ringtone...`
   - ✅ `🔔 RINGTONE: Tab hidden: false`
   - ✅ `✅ RINGTONE: Started successfully`
3. Listen for dual-tone ring sound (440Hz + 480Hz pattern)

**Expected Results**:
- Classic phone ring sound plays
- Ring pattern: two bursts, then 2-second silence, repeat
- Volume is audible but not startling

---

### Test 16: Ringtone Stop on Accept
**Objective**: Verify ringtone stops when call is accepted

**Steps**:
1. User B receives incoming call (ringtone playing)
2. User B clicks Accept
3. Check console for:
   - ✅ `🔇 RINGTONE: Stopping...`
   - ✅ `✅ RINGTONE: Stopped`

**Expected Results**:
- Ringtone stops immediately
- No lingering audio
- Smooth transition to connected state

---

### Test 17: Ringtone in Background Tab
**Objective**: Verify ringtone behavior when tab is hidden

**Steps**:
1. Open User B's tab
2. Switch to another tab (making User B's tab hidden)
3. User A calls User B
4. Check console for:
   - ✅ `🔔 RINGTONE: Tab is hidden, setting pending flag`
5. Switch back to User B's tab
6. Check console for:
   - ✅ `🔔 RINGTONE: Tab became visible, resuming ringtone`

**Expected Results**:
- Ringtone queued when tab hidden
- Ringtone starts when tab becomes visible
- User gesture detection helps with autoplay restrictions

---

### Test 18: Autoplay Restriction Handling
**Objective**: Verify handling of browser autoplay restrictions

**Steps**:
1. Open User B's tab in a fresh browser session
2. Don't interact with the page (no clicks/touches)
3. User A calls User B
4. Check console for autoplay warning if blocked
5. Click anywhere on the page
6. Check if ringtone resumes

**Expected Results**:
- If autoplay blocked, pending flag set
- After user gesture, audio context resumes
- Ringtone plays after user interaction

---

## Known Limitations

- Autoplay may be blocked on first call (user gesture required for playback)
- Some browsers require user interaction before any audio playback
- NAT/Firewall may require TURN servers for connection
- Multiple tabs may share microphone (browser dependent)

---

## Success Criteria

✅ All 14 tests pass without errors
✅ No "Call not found" errors
✅ Audio plays bi-directionally
✅ Connection establishes within 10 seconds
✅ Call can be ended cleanly
✅ No resource leaks
✅ Proper error messages for failures
