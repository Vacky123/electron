'use strict'

const { nativeImage, deprecate } = require('electron')
const ipcRenderer = require('@electron/internal/renderer/ipc-renderer-internal')

// |options.types| can't be empty and must be an array
function isValid (options) {
  const types = options ? options.types : undefined
  return Array.isArray(types)
}

function mapSources (sources) {
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: nativeImage.createFromDataURL(source.thumbnail),
    display_id: source.display_id,
    appIcon: source.appIcon ? nativeImage.createFromDataURL(source.appIcon) : null
  }))
}

const getSources = (options) => {
  return new Promise((resolve, reject) => {
    if (!isValid(options)) throw new Error('Invalid options')

    const captureWindow = options.types.includes('window')
    const captureScreen = options.types.includes('screen')

    if (options.thumbnailSize == null) {
      options.thumbnailSize = {
        width: 150,
        height: 150
      }
    }
    if (options.fetchWindowIcons == null) {
      options.fetchWindowIcons = false
    }

    ipcRenderer.invoke('ELECTRON_BROWSER_DESKTOP_CAPTURER_GET_SOURCES', captureWindow, captureScreen, options.thumbnailSize, options.fetchWindowIcons)
      .then(sources => resolve(mapSources(sources)), reject)
  })
}

exports.getSources = deprecate.promisify(getSources)
