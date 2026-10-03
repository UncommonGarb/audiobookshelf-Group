const crypto = require('crypto')
const bcrypt = require('../libs/bcryptjs')

class GroupListeningRoom {
  constructor(data = {}) {
    this.id = data.id || this.generateRoomCode()
    this.libraryItemId = data.libraryItemId || null
    this.hostUserId = data.hostUserId || null
    this.passwordHash = data.passwordHash || null
    this.syncToleranceMs = data.syncToleranceMs || 1000
    this.createdAt = data.createdAt || Date.now()

    this.playbackState = data.playbackState || {
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1.0,
      updatedAt: Date.now(),
      lastActionBy: 'System',
      lastActionType: 'INIT'
    }

    /** @type {Map<string, Object>} socketId -> Participant */
    this.participants = new Map(data.participants || [])
    /** @type {Array<Object>} */
    this.chatHistory = data.chatHistory || []
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    code += '-'
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async setPassword(plainPassword) {
    if (!plainPassword) {
      this.passwordHash = null
      return
    }
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(plainPassword, salt)
  }

  async verifyPassword(plainPassword) {
    if (!this.passwordHash) return true
    if (!plainPassword) return false
    return bcrypt.compare(plainPassword, this.passwordHash)
  }

  getExpectedCurrentTime() {
    if (!this.playbackState.isPlaying) {
      return this.playbackState.currentTime
    }
    const elapsedSeconds = (Date.now() - this.playbackState.updatedAt) / 1000
    return this.playbackState.currentTime + elapsedSeconds * (this.playbackState.playbackRate || 1.0)
  }

  updatePlayback(actionType, currentTime, playbackRate = 1.0, actionBy = 'System') {
    this.playbackState = {
      isPlaying: actionType === 'PLAY' ? true : actionType === 'PAUSE' ? false : this.playbackState.isPlaying,
      currentTime: Number(currentTime),
      playbackRate: Number(playbackRate),
      updatedAt: Date.now(),
      lastActionBy: actionBy,
      lastActionType: actionType
    }
  }

  addParticipant(socketId, participantData) {
    const participant = {
      socketId,
      userId: participantData.userId || `guest_${crypto.randomBytes(4).toString('hex')}`,
      displayName: participantData.displayName || 'Guest',
      isGuest: !!participantData.isGuest,
      isHost: participantData.userId === this.hostUserId,
      audioMuted: true,
      isSpeaking: false,
      joinedAt: Date.now()
    }
    this.participants.set(socketId, participant)
    return participant
  }

  removeParticipant(socketId) {
    const participant = this.participants.get(socketId)
    this.participants.delete(socketId)
    return participant
  }

  getParticipant(socketId) {
    return this.participants.get(socketId)
  }

  addChatMessage(senderSocketId, text, isSystem = false) {
    const participant = this.participants.get(senderSocketId)
    const msg = {
      id: crypto.randomUUID(),
      senderName: isSystem ? 'System' : (participant?.displayName || 'Unknown'),
      senderUserId: participant?.userId || null,
      isGuest: participant?.isGuest || false,
      text,
      isSystem,
      timestamp: Date.now()
    }
    this.chatHistory.push(msg)
    if (this.chatHistory.length > 200) {
      this.chatHistory.shift()
    }
    return msg
  }

  toJSON() {
    return {
      id: this.id,
      libraryItemId: this.libraryItemId,
      hostUserId: this.hostUserId,
      hasPassword: !!this.passwordHash,
      syncToleranceMs: this.syncToleranceMs,
      createdAt: this.createdAt,
      playbackState: {
        ...this.playbackState,
        expectedCurrentTime: this.getExpectedCurrentTime()
      },
      participants: Array.from(this.participants.values()),
      chatHistory: this.chatHistory
    }
  }
}

module.exports = GroupListeningRoom
