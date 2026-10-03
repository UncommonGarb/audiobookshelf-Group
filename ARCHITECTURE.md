# Group Listening Architecture & Protocol Specification

## System Overview

The Audiobookshelf Group Listening extension enables multiple registered users and **guest listeners** (via Jackbox-style short room codes and share links) to join a shared room to listen to audiobooks in exact lock-step synchronization while participating in low-latency WebRTC voice calls and real-time social chat.

```
                            +-----------------------------------+
                            |   Audiobookshelf Server           |
                            |  (Socket.io + WebRTC Signaling)   |
                            +-----------------+-----------------+
                                              |
     +----------------------------------------+----------------------------------------+
     |                                        |                                        |
     v                                        v                                        v
+-------------------+                +-------------------+                  +-------------------+
| Authenticated User|                | Web Client        |                  | Guest Listener    |
| (Web App)         |                | (Mobile App)      |                  | (Jackbox Join)    |
+-------------------+                +-------------------+                  +-------------------+
```

---

## 1. Public Guest Access & Jackbox-style Room Joining

### Room Credentials & Short Codes
- **Room ID / Short Code**: 8-character uppercase alphanumeric short code (e.g., `READ-4829`).
- **Share Link**: `https://audiobookshelf.example.com/join/READ-4829`
- **Room Password**: Optional passcode set by the host when creating the room.
- **Guest Authentication**: No Audiobookshelf user account required for guests. Guests select a **Display Name** and connect using a guest socket token.

### Data Model Schema

```json
{
  "roomId": "READ-4829",
  "libraryItemId": "item_987",
  "hostUserId": "user_alex",
  "hasPassword": true,
  "passwordHash": "$2b$10$...",
  "playbackState": {
    "isPlaying": true,
    "currentTime": 15152.4,
    "playbackRate": 1.0,
    "updatedAt": 1712100000000,
    "lastActionBy": "Alex",
    "lastActionType": "PLAY"
  },
  "participants": [
    {
      "socketId": "sock_821931",
      "userId": "user_alex",
      "displayName": "Alex (Host)",
      "isGuest": false,
      "isHost": true,
      "audioMuted": false,
      "isSpeaking": true
    },
    {
      "socketId": "sock_992102",
      "userId": "guest_7712",
      "displayName": "Taylor (Guest)",
      "isGuest": true,
      "isHost": false,
      "audioMuted": false,
      "isSpeaking": false
    }
  ]
}
```

---

## 2. Synchronization Protocol (Play, Pause, Seek)

To prevent stuttering and aggressive seeking, the sync engine uses **Timestamp-based Clock Drift Correction**:

1. **Calculated Expected Time**:
   `expectedTime = currentTime + (now() - updatedAt) * playbackRate / 1000`

2. **Sync Tolerance Handling**:
   - **Delta < 0.5s**: No action required.
   - **0.5s <= Delta <= 3.0s**: Adjust `playbackRate` temporarily (1.05x / 0.95x).
   - **Delta > 3.0s**: Hard seek directly to `expectedTime`.

---

## 3. WebRTC Voice Call Signaling Flow

```
Guest / Client A                 Server                         Client B
   |                               |                              |
   |---- webrtc:join-voice ------->|                              |
   |                               |---- user-joined-voice ------>|
   |                               |<--- webrtc:offer ------------|
   |<--- webrtc:offer -------------|                              |
   |---- webrtc:answer ----------->|                              |
   |                               |---- webrtc:answer ---------->|
   |                               |                              |
   |<================ Peer-to-Peer Audio Stream ================>|
```

---

## 4. Socket.io Event Definitions

### Client -> Server Events
- `group:create-room` `{ libraryItemId, password }`
- `group:join-guest` `{ roomCode: "READ-4829", displayName: "Taylor", password: "123" }`
- `group:sync-action` `{ roomCode, actionType: 'PLAY'|'PAUSE'|'SEEK', position }`
- `group:chat-send` `{ roomCode, message }`
- `webrtc:signal` `{ roomCode, targetSocketId, signalData }`

### Server -> Client Events
- `group:guest-joined-success` `{ roomState, guestToken }`
- `group:room-state` `Full Room Object`
- `group:playback-updated` `{ playbackState }`
- `group:chat-received` `{ chatMessage }`
