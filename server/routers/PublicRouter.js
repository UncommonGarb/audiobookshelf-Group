const express = require('express')
const ShareController = require('../controllers/ShareController')
const SessionController = require('../controllers/SessionController')
const GroupListeningController = require('../controllers/GroupListeningController')

class PublicRouter {
  constructor(playbackSessionManager) {
    /** @type {import('../managers/PlaybackSessionManager')} */
    this.playbackSessionManager = playbackSessionManager

    this.router = express()
    this.router.disable('x-powered-by')
    this.init()
  }

  init() {
    this.router.get('/share/:slug', ShareController.getMediaItemShareBySlug.bind(this))
    this.router.get('/share/:slug/track/:index', ShareController.getMediaItemShareAudioTrack.bind(this))
    this.router.get('/share/:slug/cover', ShareController.getMediaItemShareCoverImage.bind(this))
    this.router.get('/share/:slug/download', ShareController.downloadMediaItemShare.bind(this))
    this.router.patch('/share/:slug/progress', ShareController.updateMediaItemShareProgress.bind(this))
    this.router.get('/session/:id/track/:index', SessionController.getTrack.bind(this))

    // Group Listening public endpoints
    this.router.get('/group/:code', GroupListeningController.getRoomInfo.bind(this))
    this.router.post('/group/:code/validate', GroupListeningController.validatePasscode.bind(this))
  }
}
module.exports = PublicRouter
