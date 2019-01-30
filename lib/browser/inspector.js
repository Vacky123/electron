'use strict'

const { dialog, Menu } = require('electron')
const fs = require('fs')
const url = require('url')

const ipcMain = require('@electron/internal/browser/ipc-main-internal')

const convertToMenuTemplate = function (event, items) {
  return items.map(function (item) {
    const transformed = item.type === 'subMenu' ? {
      type: 'submenu',
      label: item.label,
      enabled: item.enabled,
      submenu: convertToMenuTemplate(event, item.subItems)
    } : item.type === 'separator' ? {
      type: 'separator'
    } : item.type === 'checkbox' ? {
      type: 'checkbox',
      label: item.label,
      enabled: item.enabled,
      checked: item.checked
    } : {
      type: 'normal',
      label: item.label,
      enabled: item.enabled
    }

    if (item.id != null) {
      transformed.click = function () {
        event._replyInternal('ELECTRON_INSPECTOR_CONTEXT_MENU_CLICK', item.id)
      }
    }

    return transformed
  })
}

const getEditMenuItems = function () {
  return [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'pasteAndMatchStyle' },
    { role: 'delete' },
    { role: 'selectAll' }
  ]
}

const isChromeDevTools = function (pageURL) {
  const { protocol } = url.parse(pageURL)
  return protocol === 'chrome-devtools:'
}

const handleMessage = function (channel, handler) {
  ipcMain.on(channel, (event, ...args) => {
    const pageURL = event.sender._getURL()
    if (isChromeDevTools(pageURL)) {
      handler(event, ...args)
    } else {
      console.error(`Blocked ${channel} from ${pageURL}`)
      event.returnValue = null
    }
  })
}

handleMessage('ELECTRON_INSPECTOR_CONTEXT_MENU', function (event, items, isEditMenu) {
  const template = isEditMenu ? getEditMenuItems() : convertToMenuTemplate(event, items)
  const menu = Menu.buildFromTemplate(template)
  const window = event.sender.getOwnerBrowserWindow()

  menu.once('menu-will-close', () => {
    setTimeout(() => {
      event._replyInternal('ELECTRON_INSPECTOR_CONTEXT_MENU_CLOSE')
    })
  })

  menu.popup({ window })
})

handleMessage('ELECTRON_INSPECTOR_SELECT_FILE', function (event, requestId) {
  new Promise(resolve => {
    dialog.showOpenDialog({}, function (files) {
      if (files) {
        const [path] = files
        fs.readFile(path, (error, data) => resolve(error ? [path] : [path, data]))
      } else {
        resolve([])
      }
    })
  }).then(responseArgs => {
    event._replyInternal(`ELECTRON_INSPECTOR_SELECT_FILE_RESPONSE_${requestId}`, ...responseArgs)
  })
})

handleMessage('ELECTRON_INSPECTOR_CONFIRM', function (event, message, title) {
  if (message == null) message = ''
  if (title == null) title = ''

  const options = {
    message: `${message}`,
    title: `${title}`,
    buttons: ['OK', 'Cancel'],
    cancelId: 1
  }
  const window = event.sender.getOwnerBrowserWindow()
  dialog.showMessageBox(window, options, (response) => {
    event.returnValue = (response === 0)
  })
})
