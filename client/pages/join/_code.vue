<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-extrabold text-emerald-400 mb-1">Join Group Room</h1>
        <p class="text-sm text-gray-400">Enter room code and details to listen together</p>
      </div>

      <div v-if="error" class="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
        {{ error }}
      </div>

      <form @submit.prevent="joinRoom" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Room Code</label>
          <input
            v-model="roomCode"
            type="text"
            placeholder="e.g. READ-4829"
            required
            class="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-lg font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500 uppercase text-center"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Display Name</label>
          <input
            v-model="displayName"
            type="text"
            placeholder="Your Name"
            required
            class="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div v-if="requiresPassword">
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Room Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Passcode"
            class="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-lg text-white transition-colors shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <span>{{ loading ? 'Connecting...' : 'Join Group Listening' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GroupJoinPage',
  data() {
    return {
      roomCode: this.$route.params.code || '',
      displayName: '',
      password: '',
      requiresPassword: false,
      error: null,
      loading: false
    }
  },
  mounted() {
    if (this.roomCode) {
      this.checkRoom()
    }
  },
  methods: {
    async checkRoom() {
      try {
        const res = await this.$axios.$get(`/public/group/${this.roomCode}`)
        this.requiresPassword = res.hasPassword
      } catch (e) {
        this.error = 'Room not found or invalid'
      }
    },
    async joinRoom() {
      this.error = null
      this.loading = true
      try {
        if (this.$socket) {
          this.$socket.emit('group:join-room', {
            roomCode: this.roomCode.toUpperCase(),
            displayName: this.displayName,
            password: this.password
          }, (res) => {
            this.loading = false
            if (res.error) {
              this.error = res.error
            } else {
              this.$router.push('/')
            }
          })
        } else {
          this.error = 'Socket connection unavailable'
          this.loading = false
        }
      } catch (err) {
        this.error = err.message
        this.loading = false
      }
    }
  }
}
</script>
