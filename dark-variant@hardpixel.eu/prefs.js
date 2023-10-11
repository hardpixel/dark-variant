import GObject from 'gi://GObject'
import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'
import Gio from 'gi://Gio'
import * as Prefs from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

class DarkVariantPrefsWidget extends Adw.PreferencesGroup {
  static {
    GObject.registerClass(this)
  }

  constructor() {
    super({
      title: 'Applications'
    })

    this._list = new Gtk.ListBox({
      selection_mode: Gtk.SelectionMode.NONE,
      css_classes: ['boxed-list']
    })

    this.add(this._list)

    this._list.append(new NewAppRow())
    this._list.connect('row-activated', this._onAddActivated.bind(this))

    this._settings = preferences.getSettings()
    this._changeId = this._settings.connect(
      'changed::applications',
      this._onSync.bind(this)
    )

    this._onSync()
  }

  _onAddActivated() {
    const dialog = new NewAppDialog(this.get_root())
    dialog.show()
  }

  _onSync() {
    const oldApps = [...this._list].filter(row => !!row.id)
    const newApps = this._settings.get_strv('applications')
      .map(id => Gio.DesktopAppInfo.new(id))
      .filter(appInfo => !!appInfo)

    this._settings.block_signal_handler(this._changeId)

    newApps.forEach((appInfo, index) => {
      const id = appInfo.get_id()

      if (!oldApps.some(row => row.id === id)) {
        this._list.insert(new AppRow(appInfo), index)
      }
    })

    oldApps.forEach((row, index) => {
      if (!newApps.some(appInfo => row.id === appInfo.get_id())) {
        this._list.remove(row)
      }
    })

    this._settings.unblock_signal_handler(this._changeId)
  }
}

class AppRow extends Adw.ActionRow {
  static {
    GObject.registerClass(this)
  }

  constructor(appInfo) {
    super({
      activatable: false,
      title: appInfo.get_display_name()
    })

    this._appInfo  = appInfo
    this._settings = preferences.getSettings()

    const icon = new Gtk.Image({
      css_classes: ['icon-dropshadow'],
      gicon: appInfo.get_icon(),
      pixel_size: 32
    })

    this.add_prefix(icon)

    const button = new Gtk.Button({
      icon_name: 'edit-delete-symbolic',
      has_frame: false,
      valign: Gtk.Align.CENTER
    })

    button.connect('clicked', this._onRemoveClicked.bind(this))
    this.add_suffix(button)
  }

  get id() {
    return this._appInfo.get_id()
  }

  _onRemoveClicked() {
    const current = this._settings.get_strv('applications')
    const updated = current.filter(app => app !== this.id)

    this._settings.set_strv('applications', updated)
  }
}

class NewAppRow extends Gtk.ListBoxRow {
  static {
    GObject.registerClass(this)
  }

  constructor() {
    const icon = new Gtk.Image({
      icon_name: 'list-add-symbolic',
      pixel_size: 16,
      margin_top: 12,
      margin_bottom: 12,
      margin_start: 12,
      margin_end: 12
    })

    super({
      child: icon
    })
  }
}

class NewAppDialog extends Gtk.AppChooserDialog {
  static {
    GObject.registerClass(this)
  }

  constructor(parent) {
    super({
      transient_for: parent,
      modal: true
    })

    this._widget   = this.get_widget()
    this._settings = preferences.getSettings()

    this._widget.get_parent().set({
      margin_top: 5,
      margin_bottom: 5,
      margin_start: 5,
      margin_end: 5
    })

    this._widget.set({
      show_all: true,
      show_other: true
    })

    this._widget.connect(
      'application-selected',
      this._updateSensitivity.bind(this)
    )

    this.connect(
      'response',
      this._onResponse.bind(this)
    )

    this._updateSensitivity()
  }

  _updateSensitivity() {
    const appList = this._settings.get_strv('applications')
    const appInfo = this._widget.get_app_info()

    this.set_response_sensitive(
      Gtk.ResponseType.OK,
      appInfo && !appList.some(app => app.startsWith(appInfo.get_id()))
    )
  }

  _onResponse(dlg, id) {
    const appInfo = id === Gtk.ResponseType.OK
      ? this._widget.get_app_info()
      : null

    if (appInfo) {
      const current = this._settings.get_strv('applications')
      const updated = [...current, appInfo.get_id()]

      this._settings.set_strv('applications', updated)
    }

    this.destroy()
  }
}

let preferences = null

export default class Preferences extends Prefs.ExtensionPreferences {
  fillPreferencesWindow(window) {
    preferences = this

    const page = Adw.PreferencesPage.new()
    const pref = new DarkVariantPrefsWidget()

    page.add(pref)
    window.add(page)
  }
}
