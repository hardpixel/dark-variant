const Shell = imports.gi.Shell
const Util  = imports.misc.util
const Me    = imports.misc.extensionUtils.getCurrentExtension()

function getXid(win) {
  const desc  = win.get_description()
  const match = desc && desc.match(/0x[0-9a-f]+/)

  return match && match[0]
}

function setVariant(xid, value) {
  const hint = '_GTK_THEME_VARIANT'
  Util.spawn(['xprop', '-id', xid, '-f', hint, '8u', '-set', hint, value])
}

function applyVariant(win, variant) {
  const xid = win && getXid(win)
  xid && setVariant(xid, variant)
}

class ShellApp {
  constructor(app) {
    this.app = app

    this.windowsChangedId = this.app.connect(
      'windows-changed', this.update.bind(this)
    )

    this.update()
  }

  get windows() {
    return this.app.get_windows()
  }

  update() {
    this.windows.forEach(win => {
      if (!win._darkVariant) {
        win._darkVariant = true
        applyVariant(win, 'dark')
      }
    })
  }

  destroy() {
    this.app.disconnect(this.windowsChangedId)

    this.windows.forEach(win => {
      if (win._darkVariant) {
        delete win['_darkVariant']
        applyVariant(win, 'light')
      }
    })
  }
}

class DarkVariant {
  constructor() {
    this.settings  = Me.imports.convenience.getSettings()
    this.appSystem = Shell.AppSystem.get_default()
    this.appsList  = new Map()

    this.settingsChangedID = this.settings.connect(
      'changed::applications', this.activate.bind(this)
    )
  }

  activate() {
    const appIds = this.settings.get_strv('applications')

    this.appsList.forEach((app, id, map) => {
      if (!appIds.includes(id)) {
        app.destroy()
        map.delete(id)
      }
    })

    appIds.forEach(id => {
      if (!this.appsList.has(id)) {
        const app = this.appSystem.lookup_app(id)
        app && this.appsList.set(id, new ShellApp(app))
      }
    })
  }

  destroy() {
    this.settings.disconnect(this.settingsChangedID)
    this.appsList.forEach(app => app.destroy())
  }
}

let darkVariant = null

function enable() {
  darkVariant = new DarkVariant()
  darkVariant.activate()
}

function disable() {
  darkVariant.destroy()
  darkVariant = null
}
