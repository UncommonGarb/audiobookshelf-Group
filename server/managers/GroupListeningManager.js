const Logger = require('../Logger')
const GroupListeningRoom = require('../models/GroupListeningRoom')

class GroupListeningManager {
  constructor() {
    this.Server = null
    /** @type {Map<string, GroupListeningRoom>} roomCode -> GroupListeningRoom */
    this.rooms = new Map()
    /** @type {Map<string, string>} socketId -> roomCode */
    this.socketRoomMap = new Map()
  }

  initialize(Server) {
    this.Server = Server
    Logger.info('[GroupListeningManager] Initialized')
  }

  /**
   * Create a new group listening room
   * @param {Object} options
   * @param {string} options.libraryItemId
   * @param {string} options.hostUserId
   * @param {string} [options.password]
   * @returns {Promise<GroupListeningRoom>}
   */
  async createRoom({ libraryItemId, hostUserId, password }) {
    const room = new GroupListeningRoom({
      libraryItemId,
      hostUserId
    })

    if (password) {
      await room.setPassword(password)
    }

    this.rooms.set(room.id, room)
    Logger.info(`[GroupListeningManager] Created room ${room.id} for item ${libraryItemId} by host ${hostUserId}`)
    return room
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode)
  }

  /**
   * Bind Socket.io events for group listening and WebRTC
   * @param {import('socket.io').Socket} socket
   * @param {Object} client SocketAuthority client
   */
  attachSocketListeners(socket, client) {
    socket.on('group:create-room', async (payload, callback) => {
      try {
        if (!client.user) {
          if (callback) callback({ error: 'Unauthorized' })
          return
        }
        const room = await this.createRoom({
          libraryItemId: payload.libraryItemId,
          hostUserId: client.user.id,
          password: payload.password
        })

        // Auto join host to the room
        const participant = room.addParticipant(socket.id, {
          userId: client.user.id,
          displayName: client.user.username,
          isGuest: false
        })
        this.socketRoomMap.set(socket.id, room.id)
        socket.join(`group:${room.id}`)

        const roomState = room.toJSON()
        if (callback) callback({ success: true, room: roomState })
        socket.emit('group:room-state', roomState)
      } catch (err) {
        Logger.error(`[GroupListeningManager] Error in group:create-room: ${err.message}`)
        if (callback) callback({ error: err.message })
      }
    })

    socket.on('group:join-room', async (payload, callback) => {
      try {
        const { roomCode, password, displayName } = payload || {}
        const room = this.rooms.get(roomCode)
        if (!room) {
          if (callback) callback({ error: 'Room not found' })
          return
        }

        if (room.hasPassword) {
          const isValid = await room.verifyPassword(password)
          if (!isValid) {
            if (callback) callback({ error: 'Invalid password' })
            return
          }
        }

        const isGuest = !client.user
        const name = client.user ? client.user.username : (displayName || 'Guest')
        const participant = room.addParticipant(socket.id, {
          userId: client.user?.id,
          displayName: name,
          isGuest
        })

        this.socketRoomMap.set(socket.id, room.id)
        socket.join(`group:${room.id}`)

        const roomState = room.toJSON()
        if (callback) callback({ success: true, room: roomState })

        // Notify room members
        socket.to(`group:${room.id}`).emit('group:participant-joined', { participant, roomState })
        socket.emit('group:room-state', roomState)

        // Add system message
        const systemMsg = room.addChatMessage(socket.id, `${participant.displayName} joined the room.`, true)
      if (this.Server.socketAuthority.socketIoServers) {
        this.Server.socketAuthority.socketIoServers.forEach((io) => {
          io.to(`group:${room.id}`).emit('group:chat-received', systemMsg)
        })
      }
      } catch (err) {
        Logger.error(`[GroupListeningManager] Error in group:join-room: ${err.message}`)
        if (callback) callback({ error: err.message })
      }
    })

    socket.on('group:leave-room', (callback) => {
      this.handleSocketDisconnect(socket.id)
      if (callback) callback({ success: true })
    })

    socket.on('group:sync-action', (payload, callback) => {
      const roomCode = this.socketRoomMap.get(socket.id)
      if (!roomCode) {
        if (callback) callback({ error: 'Not in a group room' })
        return
      }

      const room = this.rooms.get(roomCode)
      if (!room) {
        if (callback) callback({ error: 'Room not found' })
        return
      }

      const participant = room.getParticipant(socket.id)
      const { actionType, currentTime, playbackRate } = payload || {}

      room.updatePlayback(actionType, currentTime, playbackRate, participant ? participant.displayName : 'Unknown')

      const updatedState = room.toJSON()
      if (this.Server.socketAuthority.socketIoServers) {
        this.Server.socketAuthority.socketIoServers.forEach((io) => {
          io.to(`group:${roomCode}`).emit('group:playback-updated', {
            playbackState: updatedState.playbackState,
            senderSocketId: socket.id
          })
        })
      }

      if (callback) callback({ success: true })
    })

    socket.on('group:chat-send', (payload, callback) => {
      const roomCode = this.socketRoomMap.get(socket.id)
      if (!roomCode) {
        if (callback) callback({ error: 'Not in a group room' })
        return
      }

      const room = this.rooms.get(roomCode)
      if (!room) {
        if (callback) callback({ error: 'Room not found' })
        return
      }

      const { message } = payload || {}
      if (!message || typeof message !== 'string') {
        if (callback) callback({ error: 'Message empty' })
        return
      }

      const chatMsg = room.addChatMessage(socket.id, message, false)
      if (this.Server.socketAuthority.socketIoServers) {
        this.Server.socketAuthority.socketIoServers.forEach((io) => {
          io.to(`group:${roomCode}`).emit('group:chat-received', chatMsg)
        })
      }

      if (callback) callback({ success: true })
    })

    // WebRTC Signaling
    socket.on('webrtc:signal', (payload) => {
      const { targetSocketId, signalData } = payload || {}
      if (targetSocketId && signalData) {
        if (this.Server.socketAuthority.socketIoServers) {
          this.Server.socketAuthority.socketIoServers.forEach((io) => {
            io.to(targetSocketId).emit('webrtc:signal', {
              senderSocketId: socket.id,
              signalData
            })
          })
        }
      }
    })

    socket.on('webrtc:voice-state', (payload) => {
      const roomCode = this.socketRoomMap.get(socket.id)
      if (!roomCode) return
      const room = this.rooms.get(roomCode)
      if (!room) return

      const participant = room.getParticipant(socket.id)
      if (participant) {
        if (payload.audioMuted !== undefined) participant.audioMuted = payload.audioMuted
        if (payload.isSpeaking !== undefined) participant.isSpeaking = payload.isSpeaking

        if (this.Server.socketAuthority.socketIoServers) {
          this.Server.socketAuthority.socketIoServers.forEach((io) => {
            io.to(`group:${roomCode}`).emit('webrtc:participant-voice-updated', {
              socketId: socket.id,
              audioMuted: participant.audioMuted,
              isSpeaking: participant.isSpeaking
            })
          })
        }
      }
    })
  }

  handleSocketDisconnect(socketId) {
    const roomCode = this.socketRoomMap.get(socketId)
    if (!roomCode) return

    this.socketRoomMap.delete(socketId)
    const room = this.rooms.get(roomCode)
    if (!room) return

    const participant = room.removeParticipant(socketId)
    if (participant) {
      if (this.Server.socketAuthority.socketIoServers) {
        this.Server.socketAuthority.socketIoServers.forEach((io) => {
          io.to(`group:${roomCode}`).emit('group:participant-left', {
            socketId,
            displayName: participant.displayName
          })
        })
      }

      const systemMsg = room.addChatMessage(socketId, `${participant.displayName} left the room.`, true)
      if (this.Server.socketAuthority.socketIoServers) {
        this.Server.socketAuthority.socketIoServers.forEach((io) => {
          io.to(`group:${roomCode}`).emit('group:chat-received', systemMsg)
        })
      }
    }

    // Clean up empty room
    if (room.participants.size === 0) {
      Logger.info(`[GroupListeningManager] Cleaning up empty room ${roomCode}`)
      this.rooms.delete(roomCode)
    }
  }
}

module.exports = new GroupListeningManager()
