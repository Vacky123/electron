'use strict'

const binding = process.atomBinding('ipc')
const v8Util = process.atomBinding('v8_util')

const errorUtils = require('@electron/internal/common/error-utils')

// Created by init.js.
const ipcRenderer = v8Util.getHiddenValue(global, 'ipc-internal')
const internal = true

ipcRenderer.send = function (channel, ...args) {
  return binding.send(internal, channel, args)
}

ipcRenderer.sendSync = function (channel, ...args) {
  return binding.sendSync(internal, channel, args)[0]
}

ipcRenderer.sendTo = function (webContentsId, channel, ...args) {
  return binding.sendTo(internal, false, webContentsId, channel, args)
}

ipcRenderer.sendToAll = function (webContentsId, channel, ...args) {
  return binding.sendTo(internal, true, webContentsId, channel, args)
}

let nextId = 0

ipcRenderer.invoke = function (command, ...args) {
  return new Promise((resolve, reject) => {
    const requestId = ++nextId
    ipcRenderer.once(`${command}_RESPONSE_${requestId}`, (event, error, result) => {
      if (error) {
        reject(errorUtils.deserialize(error))
      } else {
        resolve(result)
      }
    })
    ipcRenderer.send(command, requestId, ...args)
  })
}

ipcRenderer.invokeSync = function (command, ...args) {
  const [ error, result ] = ipcRenderer.sendSync(command, ...args)

  if (error) {
    throw errorUtils.deserialize(error)
  } else {
    return result
  }
}

module.exports = ipcRenderer
