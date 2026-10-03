<template>
  <div
    class="fixed inset-y-0 right-0 w-80 bg-gray-800 text-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <!-- Header -->
    <div class="p-4 border-b border-gray-700 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <h3 class="font-bold text-lg">Group Room Chat</h3>
        <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {{ roomCode }}
        </span>
      </div>
      <button @click="$emit('close')" class="text-gray-400 hover:text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Messages List -->
    <div ref="messageContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div
        v-for="msg in chatHistory"
        :key="msg.id"
        :class="msg.isSystem ? 'text-center italic text-gray-400 text-xs my-1' : 'flex flex-col'"
      >
        <template v-if="!msg.isSystem">
          <div class="flex items-center space-x-2 text-xs text-gray-400">
            <span class="font-semibold text-gray-200">{{ msg.senderName }}</span>
            <span>{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="mt-0.5 bg-gray-700/60 rounded px-3 py-1.5 text-sm inline-block self-start max-w-[85%]">
            {{ msg.text }}
          </div>
        </template>
        <template v-else>
          <span>{{ msg.text }}</span>
        </template>
      </div>
    </div>

    <!-- Input -->
    <div class="p-3 border-t border-gray-700 bg-gray-850">
      <form @submit.prevent="sendMessage" class="flex space-x-2">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="Type a message..."
          class="flex-1 bg-gray-900 text-white rounded px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GroupChatDrawer',
  props: {
    isOpen: Boolean,
    roomCode: String,
    chatHistory: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      inputMessage: ''
    }
  },
  watch: {
    chatHistory() {
      this.$nextTick(() => {
        if (this.$refs.messageContainer) {
          this.$refs.messageContainer.scrollTop = this.$refs.messageContainer.scrollHeight
        }
      })
    }
  },
  methods: {
    sendMessage() {
      if (!this.inputMessage.trim()) return
      this.$emit('send-message', this.inputMessage)
      this.inputMessage = ''
    },
    formatTime(ts) {
      if (!ts) return ''
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>
