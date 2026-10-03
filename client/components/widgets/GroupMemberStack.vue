<template>
  <div class="flex items-center -space-x-2 overflow-hidden">
    <div
      v-for="participant in participants"
      :key="participant.socketId"
      class="relative group"
    >
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-bg transition-all duration-200"
        :class="[
          participant.isHost ? 'bg-amber-600' : 'bg-indigo-600',
          participant.isSpeaking ? 'ring-2 ring-emerald-400 scale-105' : ''
        ]"
      >
        {{ getInitials(participant.displayName) }}
      </div>

      <!-- Tooltip -->
      <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
        <span>{{ participant.displayName }} {{ participant.isHost ? '(Host)' : '' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GroupMemberStack',
  props: {
    participants: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    getInitials(name) {
      if (!name) return '?'
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
  }
}
</script>
