'use strict'

const { EventEmitter } = require('events')
const errorUtils = require('@electron/internal/common/error-utils')

const emitter = new EventEmitter()

// Do not throw exception when channel name is "error".
emitter.on('error', () => {})

emitter.handle = function (channel, handler) {
  emitter.on(channel, (event, requestId, ...args) => {
    new Promise(resolve => {
      resolve(handler(event, ...args))
    }).then(result => {
      return [null, result]
    }, error => {
      return [errorUtils.serialize(error)]
    }).then(responseArgs => {
      event._replyInternal(`${channel}_RESPONSE_${requestId}`, ...responseArgs)
    })
  })
}

emitter.handleSync = function (channel, handler) {
  emitter.on(channel, (event, ...args) => {
    try {
      event.returnValue = [null, handler(event, ...args)]
    } catch (error) {
      event.returnValue = [errorUtils.serialize(error)]
    }
  })
}

module.exports = emitter
