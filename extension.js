/**
  AUTHORS: Mario Wenzel, Raphaël Rochet
  LICENSE: GPL3.0
  COMPILING SCHEMAS: glib-compile-schemas schemas/
**/
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const Panel = imports.ui.main.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const MenuItems = Extension.imports.menu_items;
const Promise = Extension.imports.promise.Promise;
const Icons = Extension.imports.icons;
const Api = Extension.imports.api;

const domain = Extension.metadata['gettext-domain']; // Get gettext domain from metadata.json
const localeDir = Extension.dir.get_child('locale');
const Gettext = imports.gettext;
const _ = Gettext.domain(domain).gettext;
Gettext.bindtextdomain(domain, localeDir.get_path());

const viewUpdateInterval = 10*1000;

let schemaDir = Extension.dir.get_child('schemas').get_path();
let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
    schemaDir,
    Gio.SettingsSchemaSource.get_default(),
    false
);
let schema = schemaSource.lookup('org.gnome.shell.extensions.twitchlive', false);

let STREAMERS = [];
let OPENCMD = "";
let INTERVAL = 5*1000*60;
let HIDESTREAMERS = false;

let button;

const SeparatorMenuItem = new Lang.Class({
    Name: 'SeparatorMenuItem',
    // Looks like a SeparatorMenuItem, but never hides
    Extends: PopupMenu.PopupBaseMenuItem,
    _init: function (text) {
        this.parent({ reactive: false, can_focus: false});
        this._separator = new St.Widget({ style_class: 'popup-separator-menu-item',
                                          y_expand: true,
                                          y_align: Clutter.ActorAlign.CENTER });
        this.actor.add(this._separator, { expand: true });
    },
});

const ExtensionLayout = new Lang.Class({
  Name: 'ExtensionLayout',
  Extends: PanelMenu.Button,

  streamertext : null,
  text: null,
  icon: null,
  online: [],
  timer: { view: 0, update: 0, settings: 0 },
  settings: new Gio.Settings({ settings_schema: schema }),
  _httpSession: new Soup.SessionAsync(),
  layoutChanged: false,

  _init: function() {
    this.parent(0.0);
    this._box = new St.BoxLayout();
    this.actor.add_actor(this._box);
    this.icon = new St.Icon({ icon_name: 'twitchlive',
                             style_class: 'system-status-icon' });
    this.streamertext = new St.Label({text: "Twitch Streamers",
                                y_align: Clutter.ActorAlign.CENTER});
    this._box.add_child(this.icon);
    this._box.add_child(this.streamertext);

    // Create menu section for streamers
    this.streamersMenu = new PopupMenu.PopupMenuSection();
    this.streamersMenuContainer = new PopupMenu.PopupMenuSection();
    let scrollView = new St.ScrollView({ overlay_scrollbars: true , hscrollbar_policy: Gtk.PolicyType.NEVER });
    scrollView.add_actor(this.streamersMenu.actor);
    this.streamersMenuContainer.actor.add_actor(scrollView);
    this.menu.addMenuItem(this.streamersMenuContainer);

    // Add separator
    this.spacer = new SeparatorMenuItem();
    this.menu.addMenuItem(this.spacer);

    // Add 'Settings' menu item to open settings
    let settingsMenuItem = new PopupMenu.PopupMenuItem(_('Settings'));
    this.menu.addMenuItem(settingsMenuItem);
    settingsMenuItem.connect('activate', Lang.bind(this, this._openSettings));

    this.updateMenuItem = new PopupMenu.PopupMenuItem(_('Update now'));
    this.updateMenuContainer = new PopupMenu.PopupMenuSection();
    this.updateMenuContainer.actor.add_actor(this.updateMenuItem.actor);
    this.menu.addMenuItem(this.updateMenuContainer);
    this.updateMenuItem.connect('activate', Lang.bind(this, this.updateData));
    this._applySettings();
    this.settings.connect('changed', Lang.bind(this, this._applySettings));
    this.menu.connect('open-state-changed', Lang.bind(this, this._onMenuOpened));
  },

  _applySettings: function() {
    STREAMERS = this.settings.get_string('streamers').split(',');
    OPENCMD = this.settings.get_string('opencmd');
    INTERVAL = this.settings.get_int('interval')*1000*60;
    HIDESTREAMERS = this.settings.get_boolean('hidestreamers');

    if (this.timer.settings != 0) Mainloop.source_remove(this.timer.settings);
    this.timer.settings = Mainloop.timeout_add(1000, Lang.bind(this, function(){
      this.updateData();
      return false;
    }));

  },

  destroy: function() {
    if (this.timer.settings != 0) Mainloop.source_remove(this.timer.settings);
    this.timer.settings = 0;
    if (this.timer.update != 0) Mainloop.source_remove(this.timer.update);
    this.timer.update = 0;
    this.disable_view_update();
    this.parent();
  },

  _openSettings: function () {
      Util.spawn([
          "gnome-shell-extension-prefs",
          Extension.uuid
      ]);
  },

  _execCmd:function(sender, event, streamer) {
    this.menu.close();
    let cmd = OPENCMD.replace('%streamer%', streamer);
    GLib.spawn_command_line_async(cmd);
  },

  updateData: function() {
    // disable timer and disable "update now" menu
    if (this.timer.update != 0) Mainloop.source_remove(this.timer.update);
    this.updateMenuItem.actor.reactive = false;
    this.updateMenuItem.label.set_text(_("Updating ..."));

    this.disable_view_update();
    let menu = this.streamersMenu;
    let menu_items = [];

    this.online = [];
    let that = this; // this will be overwritten in promise calls

    // make requests
    let req = function(streamer){
      let http_prom = Api.stream(that._httpSession, streamer).then((data) => {
        if (data.stream) {
          that.online.push(streamer);
          let item = new MenuItems.StreamerMenuItem(streamer, data.stream.game, data.stream.viewers);
          item.connect("activate", Lang.bind(that, that._execCmd, streamer));
          menu_items.push(item);
        }
      });
      return http_prom;
    };

    let requests = STREAMERS.map((d) => d.trim()).filter((d) => d != "").map(req);

    new Promise.all(requests).then(
        //sucess
        function(){
            // clear menu
            menu.removeAll();
            that.spacer.actor.hide();
            // store items for late menu draw
            that.menuItems = menu_items;
            that.layoutChanged = true;
            if (that.menu.isOpen) that.updateMenuLayout();
            // make update now menu reactive again
            that.updateMenuItem.actor.reactive = true;
            that.updateMenuItem.label.set_text(_("Update now"));
            that.enable_view_update();
          },
      //failed
      function(why){
        log("An error occured : " + why );
      }
    );

    //schedule next check
    this.timer.update = Mainloop.timeout_add(INTERVAL, Lang.bind(this, this.updateData));
    return false;
  },

  updateMenuLayout: function() {
    this.streamersMenu.removeAll();
    this.menuItems.map((d) => this.streamersMenu.addMenuItem(d));
    if (this.menuItems.length == 0) {
      this.streamersMenu.addMenuItem(new MenuItems.NobodyMenuItem(_("Nobody is streaming")));
    }
    else {
      this.spacer.actor.show();
      // gather sizes
      let sizes = this.menuItems.map((item) => item.get_size_info()).reduce(max_size_info, [0,0,0]);
      // set sizes
      this.menuItems.map((item) => item.apply_size_info(sizes));
    }
    this.layoutChanged = false;
  },

  _onMenuOpened: function() {
    // This event is fired when menu is shown or hidden
    if (this.menu.isOpen && this.layoutChanged == true) {
      this.updateMenuLayout();
    }
  },

  disable_view_update: function() {
    if (this.timer.view != 0) Mainloop.source_remove(this.timer.view);
    this.timer.view = 0;
  },

  enable_view_update: function() {
    this.interval();
    this.timer.view = Mainloop.timeout_add(viewUpdateInterval,  Lang.bind(this, this.interval));
  },

  interval: function() {
    let _online = this.online;
    if (_online.length > 0) {
      this.icon.set_icon_name('twitchlive_on');
      if (HIDESTREAMERS) {
        this.streamertext.set_text(_online.length.toString());
      }
      else {
        _online.push(_online.shift()); // rotate
        this.streamertext.set_text(_online[0]);
      }
    }
    else {
      this.icon.set_icon_name('twitchlive_off');
      this.streamertext.set_text("");
    }
    return true;
  },

});

function max_size_info(size_info1, size_info2) {
  return [Math.max(size_info1[0], size_info2[0]), Math.max(size_info1[1], size_info2[1]), Math.max(size_info1[2], size_info2[2])]
}

function init() {
  Gtk.IconTheme.get_default().append_search_path(Extension.dir.get_child('livestreamer-icons').get_path());
  Icons.init_icons();
}

function enable() {
    button = new ExtensionLayout();
    Panel.addToStatusArea('twitchlive', button, 0);
}
function disable() {
    button.destroy();
}
