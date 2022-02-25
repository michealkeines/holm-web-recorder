import { app, BrowserWindow, session } from 'electron'
import contextMenu from 'electron-context-menu'
import { MenuItemConstructorOptions } from 'electron/main'
import path from 'path'
import store from './store'
import createSession from './session'

// Enable local debugging
app.commandLine.appendSwitch('remote-debugging-port', '8315')

// Add record extension
const recorderExtension = require.resolve('@seleniumhq/side-recorder')
// @ts-expect-error
session.loadExtension(path.join(recorderExtension, 'dist'));

contextMenu({
  prepend: (defaultActions, _parameters, browserWindow, _event) => {
    console.log(_event)
    const actions: MenuItemConstructorOptions[] = []
    const win = browserWindow as BrowserWindow
    if (win.title === 'Playback Window') {
      actions.push(defaultActions.inspect())
      return actions
    }
    return actions
  },
  showLookUpSelection: false,
  showInspectElement: false,
  showSearchWithGoogle: false,
})

app.on('ready', async () => {
  await createSession(app, store)
})

let allWindowsClosed = false
// Respect the OSX convention of having the application in memory even
// after all windows have been closed
app.on('window-all-closed', () => {
  allWindowsClosed = true
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Getting things in a row so that re-activating an app with no windows
// on Darwin recreates the main window again
app.on('activate', async () => {
  if (allWindowsClosed) {
    allWindowsClosed = false
    await createSession(app, store)
  }
})