const GLib           = imports.gi.GLib
const GObject        = imports.gi.GObject
const Gtk            = imports.gi.Gtk
const Gio            = imports.gi.Gio
const Pango          = imports.gi.Pango
const ExtensionUtils = imports.misc.extensionUtils

var DarkVariantSettings = GObject.registerClass(
  class DarkVariantPrefsWidget extends Gtk.ScrolledWindow {
    _init() {
      super._init({
        hscrollbar_policy: Gtk.PolicyType.NEVER
      })

      const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        spacing: 12,
        margin_top: 36,
        margin_bottom: 36,
        margin_start: 36,
        margin_end: 36
      })

      this.set_child(box)

      const label = new Gtk.Label({
        label: '<b>Applications</b>',
        use_markup: true,
        halign: Gtk.Align.START
      })

      box.append(label)

      this._list = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
        valign: Gtk.Align.START,
        show_separators: true
      })

      box.append(this._list)

      const cssProvider = new Gtk.CssProvider()
      cssProvider.load_from_data('list { min-width: 30em; }')

      const context = this._list.get_style_context()
      context.add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
      context.add_class('frame')

      this._list.append(new NewAppRow())
      this._list.connect('row-activated', this._onAddActivated.bind(this))

      this._settings = ExtensionUtils.getSettings()
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

      this._settings.block_signal_handler(this._changeId)

      newApps.forEach((id, index) => {
        if (!oldApps.some(row => row.id === id)) {
          const appInfo = Gio.DesktopAppInfo.new(id)
          this._list.insert(new AppRow(appInfo), index)
        }
      })

      oldApps.forEach((row, index) => {
        if (!newApps.some(id => row.id === id)) {
          this._list.remove(row)
        }
      })

      this._settings.unblock_signal_handler(this._changeId)
    }
  }
)

const AppRow = GObject.registerClass(
  class AppRow extends Gtk.ListBoxRow {
    _init(appInfo) {
      const box = new Gtk.Box({
        spacing: 6,
        margin_top: 6,
        margin_bottom: 6,
        margin_start: 6,
        margin_end: 6
      })

      super._init({
        activatable: false,
        child: box
      })

      this._appInfo  = appInfo
      this._settings = ExtensionUtils.getSettings()

      const icon = new Gtk.Image({
        gicon: appInfo.get_icon(),
        pixel_size: 32
      })

      const context = icon.get_style_context()
      context.add_class('icon-dropshadow')

      box.append(icon)

      const label = new Gtk.Label({
        label: appInfo.get_display_name(),
        halign: Gtk.Align.START,
        hexpand: true,
        max_width_chars: 20,
        ellipsize: Pango.EllipsizeMode.END
      })

      box.append(label)

      const button = new Gtk.Button({
        icon_name: 'edit-delete-symbolic'
      })

      button.connect('clicked', this._onRemoveClicked.bind(this))
      box.append(button)
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
)

const NewAppRow = GObject.registerClass(
class NewAppRow extends Gtk.ListBoxRow {
  _init() {
    const icon = new Gtk.Image({
      icon_name: 'list-add-symbolic',
      pixel_size: 16,
      margin_top: 12,
      margin_bottom: 12,
      margin_start: 12,
      margin_end: 12
    })

    super._init({
      child: icon
    })
  }
})

const NewAppDialog = GObject.registerClass(
class NewAppDialog extends Gtk.AppChooserDialog {
  _init(parent) {
    super._init({
      transient_for: parent,
      modal: true
    })

    this._widget   = this.get_widget()
    this._settings = ExtensionUtils.getSettings()

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
})

function init() {
  ExtensionUtils.initTranslations()
}

function buildPrefsWidget() {
  return new DarkVariantSettings()
}
