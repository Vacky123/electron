'use strict'

const ipcRenderer = require('@electron/internal/renderer/ipc-renderer-internal')

window.onload = function () {
  // Use menu API to show context menu.
  window.InspectorFrontendHost.showContextMenuAtPoint = createMenu

  // correct for Chromium returning undefined for filesystem
  window.Persistence.FileSystemWorkspaceBinding.completeURL = completeURL

  // Use dialog API to override file chooser dialog.
  window.UI.createFileSelectorElement = createFileSelectorElement
}

// Extra / is needed as a result of MacOS requiring absolute paths
function completeURL (project, path) {
  project = 'file:///'
  return `${project}${path}`
}

window.confirm = function (message, title) {
  ipcRenderer.send('ELECTRON_INSPECTOR_CONFIRM', message, title)
}

ipcRenderer.on('ELECTRON_INSPECTOR_CONTEXT_MENU_CLICK', function (event, id) {
  window.DevToolsAPI.contextMenuItemSelected(id)
})

ipcRenderer.on('ELECTRON_INSPECTOR_CONTEXT_MENU_CLOSE', function () {
  window.DevToolsAPI.contextMenuCleared()
})

const useEditMenuItems = function (x, y, items) {
  return items.length === 0 && document.elementsFromPoint(x, y).some(function (element) {
    return element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA' || element.isContentEditable
  })
}

const createMenu = function (x, y, items) {
  const isEditMenu = useEditMenuItems(x, y, items)
  ipcRenderer.send('ELECTRON_INSPECTOR_CONTEXT_MENU', items, isEditMenu)
}

let nextId = 0

const showFileChooserDialog = function (callback) {
  const requestId = ++nextId
  ipcRenderer.once(`ELECTRON_INSPECTOR_SELECT_FILE_RESPONSE_${requestId}`, function (event, path, data) {
    if (path && data) {
      callback(dataToHtml5FileObject(path, data))
    }
  })
  ipcRenderer.send('ELECTRON_INSPECTOR_SELECT_FILE', requestId)
}

const dataToHtml5FileObject = function (path, data) {
  const blob = new Blob([data])
  blob.name = path
  return blob
}

const createFileSelectorElement = function (callback) {
  const fileSelectorElement = document.createElement('span')
  fileSelectorElement.style.display = 'none'
  fileSelectorElement.click = showFileChooserDialog.bind(this, callback)
  return fileSelectorElement
}
