const assert = require('assert')
const GroupListeningRoom = require('../../../server/models/GroupListeningRoom')
const GroupListeningManager = require('../../../server/managers/GroupListeningManager')

describe('Group Listening Engine & Data Model', () => {
  it('should generate room code and initialize default playback state', () => {
    const room = new GroupListeningRoom({ libraryItemId: 'item_123', hostUserId: 'user_456' })
    assert.match(room.id, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    assert.strictEqual(room.libraryItemId, 'item_123')
    assert.strictEqual(room.hostUserId, 'user_456')
    assert.strictEqual(room.playbackState.isPlaying, false)
  })

  it('should accurately calculate expected current time based on clock drift', () => {
    const now = Date.now()
    const room = new GroupListeningRoom({
      playbackState: {
        isPlaying: true,
        currentTime: 100,
        playbackRate: 1.0,
        updatedAt: now - 5000 // 5 seconds ago
      }
    })

    const expectedTime = room.getExpectedCurrentTime()
    assert.ok(Math.abs(expectedTime - 105) < 0.5)
  })

  it('should manage password hash generation and verification', async () => {
    const room = new GroupListeningRoom()
    await room.setPassword('secret123')
    assert.strictEqual(typeof room.passwordHash, 'string')

    const isValid = await room.verifyPassword('secret123')
    assert.strictEqual(isValid, true)

    const isInvalid = await room.verifyPassword('wrongpass')
    assert.strictEqual(isInvalid, false)
  })

  it('should add participants and system chat messages', () => {
    const room = new GroupListeningRoom({ hostUserId: 'host_1' })
    const participant = room.addParticipant('sock_1', { userId: 'host_1', displayName: 'Alex Host' })

    assert.strictEqual(participant.isHost, true)
    assert.strictEqual(room.participants.size, 1)

    const msg = room.addChatMessage('sock_1', 'Hello group!')
    assert.strictEqual(msg.senderName, 'Alex Host')
    assert.strictEqual(room.chatHistory.length, 1)
  })

  it('should create and retrieve room via GroupListeningManager', async () => {
    const room = await GroupListeningManager.createRoom({
      libraryItemId: 'item_789',
      hostUserId: 'user_789'
    })

    const fetched = GroupListeningManager.getRoom(room.id)
    assert.strictEqual(fetched, room)
  })
})
