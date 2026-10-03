# Audiobookshelf Group Listening - Task & Project Roadmap

This document outlines the phased roadmap and task breakdown for implementing synchronized multi-user group listening, WebRTC voice calling, and social chat features across Audiobookshelf server, web client, and mobile application (`mobile/`).

---

## Phase 1: Planning, Mockups & Synchronization Infrastructure (Current Phase)
- [x] Create project `progress` branch.
- [x] Integrate `https://github.com/advplyr/audiobookshelf-app` as submodule under `mobile/`.
- [x] Configure git upstream remotes (`upstream-server` and `upstream-app`) for bidirectionally syncing changes.
- [x] Build interactive HTML/CSS/JS mockups (`mockups/index.html`, `mockups/now-playing.html`, `mockups/mini-player.html`, `mobile-app.html`).
- [x] Author technical architecture and data flow documentation (`ARCHITECTURE.md`).
- [x] Document upstream pull/push sync workflows (`SYNC.md`).

---

## Phase 2: Server-Side Sync Engine & WebRTC Signaling
- [ ] **Data Model Extensions (`server/models/GroupListeningRoom.js`)**
  - Room object schema (id, libraryItemId, hostUserId, participants, playbackState, syncToleranceMs).
- [ ] **Socket.io Group Event Handlers (`server/managers/GroupListeningManager.js`)**
  - Event `group:join-room` / `group:leave-room`
  - Event `group:sync-playback` (play, pause, seek, playbackRate change)
  - Broadcaster with sequence numbering & server timestamp clock-drift correction.
- [ ] **WebRTC Signaling Server Endpoints**
  - Event `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`
  - Peer mesh management / SFU integration adapter interface.
- [ ] **Social Chat Management**
  - Event `group:chat-message` broadcast & persistence in session memory.
  - Automatic system event logging (e.g. "Sarah paused playback", "Alex joined voice call").

---

## Phase 3: Web Client UI Integration (Vue/React Migration)
- [ ] **Top Right Room Member Avatar Stack**
  - Render connected room user badges in top right of Now Playing view.
  - Active speaker halo animation & voice activity detection indicator.
- [ ] **Synchronized HTML5 Audio Player Controller**
  - Intercept playback actions (`onplay`, `onpause`, `onseeking`) to broadcast to group room.
  - Smart lock-step playback controller with smooth seek-catching (adjusting `playbackRate` slightly if offset < 2s instead of hard seeking).
- [ ] **Mini Player Bar User Badges**
  - Persistent bottom mini-bar user pill & member roster popover.
- [ ] **Side Chat Drawer Component**
  - Collapsible side panel for group text messages and activity logs.

---

## Phase 4: Mobile App (`mobile/`) Integration
- [ ] **Capacitor / React Native Bridge for WebRTC**
  - Background audio permissions & microphone audio constraint management.
- [ ] **Mobile Group Listening Screen & Floating Voice Pill**
  - Floating status pill showing active speakers during background playback.
  - Tabbed UI (`Player`, `Group Chat`, `Members`).
- [ ] **Native Haptic Feedback & Lockscreen Controls**
  - Keep lockscreen progress bar in sync with group playback position.

---

## Phase 5: Testing, QA & Upstream Synchronization
- [ ] **Automated Integration Tests**
  - Socket.io concurrent client clock-sync test suite.
  - Edge case testing: network jitter, high latency, reconnection recovery.
- [ ] **Upstream Sync Verification**
  - Execute sync procedure described in `SYNC.md` to merge latest upstream server & mobile updates without regressions.
