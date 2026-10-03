<template>
  <div v-if="inGroupRoom" class="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700 text-xs text-gray-200">
    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
    <span class="font-semibold text-emerald-400">{{ roomCode }}</span>
    <span class="text-gray-400">({{ participants.length }} members)</span>
    <button @click="$emit('toggle-chat')" class="ml-1 text-gray-300 hover:text-white">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  name: 'MiniPlayerGroupPill',
  props: {
    inGroupRoom: Boolean,
    roomCode: String,
    participants: {
      type: Array,
      default: () => []
    }
  }
}
</script>
