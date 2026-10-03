# Group Listening Architecture & Protocol Specification

## System Overview

The Audiobookshelf Group Listening extension enables multiple users to join a shared room to listen to audiobooks in exact lock-step synchronization while participating in low-latency WebRTC voice calls and real-time social chat.

```
                  +-----------------------------------+
                  |   Audiobookshelf Server           |
                  |  (Socket.io + WebRTC Signaling)   |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-------------------+                               +-------------------+
|  Web Client       |  <=== WebRTC Voice Mesh ===>  |  Mobile App       |
|  (Browser)        |                               |  (mobile/ Submod) |
+-------------------+                               +-------------------+
```

---

## 1. Room State Schema

```json
{
  "roomId": "room_abc123",
  "libraryItemId": "item_987",
  "hostUserId": "user_alex",
  "playbackState": {
    "isPlaying": true,
    "currentTime": 15152.4,
    "playbackRate": 1.0,
    "updatedAt": 1712100000000,
    "lastActionBy": "user_sarah",
    "lastActionType": "PAUSE"
  },
  "participants": [
    {
      "userId": "user_alex",
      "username": "Alex",
      "avatarUrl": "/api/users/user_alex/avatar",
      "isHost": true,
      "audioMuted": false,
      "isSpeaking": true,
      "latencyMs": 24
    },
    {
      "userId": "user_sarah",
      "username": "Sarah",
      "avatarUrl": "/api/users/user_sarah/avatar",
      "isHost": false,
      "audioMuted": false,
      "isSpeaking": false,
      "latencyMs": 45
    }
  ]
}
```

---

## 2. Synchronization Protocol (Play, Pause, Seek)

To prevent stuttering and aggressive seeking, the sync engine uses **Timestamp-based Clock Drift Correction**:

1. **Calculated Expected Time**:
   When client receives a state update, expected position is calculated as:
   `expectedTime = currentTime + (now() - updatedAt) * playbackRate / 1000`

2. **Sync Tolerance Handling**:
   - **Delta < 0.5s**: No action required (seamless alignment).
   - **0.5s <= Delta <= 3.0s**: Adjust `playbackRate` temporarily (e.g. 1.05x or 0.95x) to catch up smoothly without audio popping.
   - **Delta > 3.0s**: Hard seek directly to `expectedTime`.

---

## 3. WebRTC Voice Call Signaling Flow

Voice communication relies on WebSockets for SDP offer/answer exchange and ICE candidate trickle:

```
Client A                         Server                        Client B
   |                               |                              |
   |---- webrtc:join-voice ------->|                              |
   |                               |---- user-joined-voice ------>|
   |                               |<--- webrtc:offer ------------|
   |<--- webrtc:offer -------------|                              |
   |---- webrtc:answer ----------->|                              |
   |                               |---- webrtc:answer ---------->|
   |---- webrtc:ice-candidate ---->|                              |
   |                               |---- webrtc:ice-candidate --->|
   |                               |                              |
   |<================ Peer-to-Peer Audio Stream ================>|
```

---

## 4. Socket.io Event Definitions

### Client -> Server Events
- `group:create-room` `{ libraryItemId }`
- `group:join-room` `{ roomId }`
- `group:leave-room` `{ roomId }`
- `group:sync-action` `{ roomId, actionType: 'PLAY'|'PAUSE'|'SEEK', position, timestamp }`
- `group:chat-send` `{ roomId, message }`
- `webrtc:signal` `{ roomId, targetUserId, signalData }`

### Server -> Client Events
- `group:room-state` `Full Room Object`
- `group:user-joined` `{ user }`
- `group:user-left` `{ userId }`
- `group:playback-updated` `{ playbackState }`
- `group:chat-received` `{ chatMessage }`
- `group:system-notice` `{ text, timestamp }`
