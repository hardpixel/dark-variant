import Shell from 'gi://Shell'
import * as Util from 'resource:///org/gnome/shell/misc/util.js'
import * as Ext from 'resource:///org/gnome/shell/extensions/extension.js'

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
  constructor(ext) {
    this.settings  = ext.getSettings()
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

export default class Extension extends Ext.Extension {
  enable() {
    this.darkVariant = new DarkVariant(this)
    this.darkVariant.activate()
  }

  disable() {
    this.darkVariant.destroy()
    this.darkVariant = null
  }
}
