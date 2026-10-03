const GroupListeningManager = require('../managers/GroupListeningManager')
const Database = require('../Database')
const Logger = require('../Logger')

class GroupListeningController {
  async getRoomInfo(req, res) {
    const roomCode = req.params.code
    const room = GroupListeningManager.getRoom(roomCode)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    let libraryItem = null
    if (room.libraryItemId) {
      const item = await Database.libraryItemModel.getExpandedById(room.libraryItemId)
      if (item) {
        libraryItem = item.toOldJSONExpanded()
      }
    }

    res.json({
      id: room.id,
      libraryItemId: room.libraryItemId,
      hasPassword: !!room.passwordHash,
      participantCount: room.participants.size,
      libraryItem
    })
  }

  async validatePasscode(req, res) {
    const roomCode = req.params.code
    const { password } = req.body || {}
    const room = GroupListeningManager.getRoom(roomCode)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const isValid = await room.verifyPassword(password)
    res.json({ valid: isValid })
  }
}

module.exports = new GroupListeningController()
