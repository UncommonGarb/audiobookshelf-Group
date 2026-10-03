import Vue from 'vue'

class GroupListeningClient {
  constructor() {
    this.socket = null
    this.roomState = null
    this.audioElement = null
    this.peerConnections = new Map() // socketId -> RTCPeerConnection
    this.localStream = null
    this.isSyncing = false
  }

  init(socket, audioElement) {
    this.socket = socket
    this.audioElement = audioElement

    if (!this.socket) return

    this.socket.on('group:room-state', (state) => {
      this.roomState = state
      this.handlePlaybackSync(state.playbackState)
    })

    this.socket.on('group:playback-updated', ({ playbackState, senderSocketId }) => {
      if (senderSocketId !== this.socket.id) {
        this.handlePlaybackSync(playbackState)
      }
    })

    this.socket.on('webrtc:signal', async ({ senderSocketId, signalData }) => {
      await this.handleWebRTCSignal(senderSocketId, signalData)
    })

    this.setupAudioListeners()
  }

  setupAudioListeners() {
    if (!this.audioElement) return

    const broadcastAction = (actionType) => {
      if (this.isSyncing || !this.roomState) return
      this.socket.emit('group:sync-action', {
        actionType,
        currentTime: this.audioElement.currentTime,
        playbackRate: this.audioElement.playbackRate
      })
    }

    this.audioElement.addEventListener('play', () => broadcastAction('PLAY'))
    this.audioElement.addEventListener('pause', () => broadcastAction('PAUSE'))
    this.audioElement.addEventListener('seeked', () => broadcastAction('SEEK'))
  }

  handlePlaybackSync(playbackState) {
    if (!this.audioElement || !playbackState) return

    this.isSyncing = true
    const { isPlaying, currentTime, playbackRate, updatedAt } = playbackState

    // Calculate expected target time
    const elapsed = isPlaying ? (Date.now() - updatedAt) / 1000 : 0
    const targetTime = currentTime + elapsed * (playbackRate || 1.0)
    const diff = Math.abs(this.audioElement.currentTime - targetTime)

    if (diff > 3.0) {
      // Hard seek for large drift
      this.audioElement.currentTime = targetTime
    } else if (diff > 0.5) {
      // Smooth catch-up rate adjustment
      const catchUpRate = this.audioElement.currentTime < targetTime ? 1.05 : 0.95
      this.audioElement.playbackRate = catchUpRate
      setTimeout(() => {
        if (this.audioElement) this.audioElement.playbackRate = playbackRate || 1.0
      }, 2000)
    }

    if (isPlaying && this.audioElement.paused) {
      this.audioElement.play().catch(() => {})
    } else if (!isPlaying && !this.audioElement.paused) {
      this.audioElement.pause()
    }

    setTimeout(() => {
      this.isSyncing = false
    }, 300)
  }

  async enableVoiceCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      // WebRTC encrypted audio connection setup...
    } catch (err) {
      console.error('Microphone access failed:', err)
    }
  }

  async handleWebRTCSignal(senderSocketId, signalData) {
    let pc = this.peerConnections.get(senderSocketId)
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      this.peerConnections.set(senderSocketId, pc)

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream))
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('webrtc:signal', {
            targetSocketId: senderSocketId,
            signalData: { candidate: event.candidate }
          })
        }
      }

      pc.ontrack = (event) => {
        const remoteAudio = new Audio()
        remoteAudio.srcObject = event.streams[0]
        remoteAudio.play().catch(() => {})
      }
    }

    if (signalData.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp))
      if (signalData.sdp.type === 'offer') {
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        this.socket.emit('webrtc:signal', {
          targetSocketId: senderSocketId,
          signalData: { sdp: pc.localDescription }
        })
      }
    } else if (signalData.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate))
    }
  }
}

export const groupListening = new GroupListeningClient()

export default ({ app }, inject) => {
  inject('groupListening', groupListening)
}
