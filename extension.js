/**
  AUTHORS: Mario Wenzel, Raphaël Rochet
  LICENSE: GPL3.0
  COMPILING SCHEMAS: glib-compile-schemas schemas/
**/
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const Panel = imports.ui.main.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const MessageTray = imports.ui.messageTray;
const Config = imports.misc.config;

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Topbar = Extension.imports.topbar;
const MenuItems = Extension.imports.menu_items;
const Icons = Extension.imports.icons;
const Games = Extension.imports.games;
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
let HIDEPLAYLISTS = false;
let NOTIFICATIONS_ENABLED = false;
let NOTIFICATIONS_GAME_CHANGE = false;
let HIDEEMPTY = false;
let SORTKEY = 'COUNT';
let HIDESTATUS = false;
let SHOWUPTIME = false;
let TOPBARMODE = 'all-icons';

let button;

var SeparatorMenuItem = GObject.registerClass(
class SeparatorMenuItem extends PopupMenu.PopupBaseMenuItem {
  _init() {
      super._init({ reactive: false, can_focus: false});
      this._separator = new St.Widget({ style_class: 'popup-separator-menu-item',
                                        y_expand: true,
                                        y_align: Clutter.ActorAlign.CENTER });
      this.add_actor(this._separator); // this.actor.add(this._separator, { expand: true }); // this.add_child(this._separator, { expand: true }) is deprecated
  }
});

const ExtensionLayout = GObject.registerClass(
  class ExtensionLayout extends PanelMenu.Button {

    _init() {
      super._init(0.0);

      this.streamertext = null;
      this.topbar_mode = '';
      this.text = null;
      this.icon = null;
      this.online = [];
      this.firstRun = true, // Avoids notifications on first run
      this.timer = { view: 0, update: 0, settings: 0 };
      this.settings = new Gio.Settings({ settings_schema: schema });
      this._httpSession = Soup.Session.new();
      this.layoutChanged = false;
      this.streamer_rotation = 0;


      // Make soup use default system proxy if configured
      // Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.ProxyResolverDefault());

      this._box = new St.BoxLayout();
      this.add_child(this._box);
      this.icon = new St.Icon({ gicon: Gio.icon_new_for_string(Extension.path + "/livestreamer-icons/twitchlive.svg"),
                              style_class: 'system-status-icon' });
      this._box.add_child(this.icon);

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
      settingsMenuItem.connect('activate', this._openSettings.bind(this));

      this.updateMenuItem = new PopupMenu.PopupMenuItem(_('Update now'));
      this.updateMenuContainer = new PopupMenu.PopupMenuSection();
      this.updateMenuContainer.actor.add_actor(this.updateMenuItem.actor);
      this.menu.addMenuItem(this.updateMenuContainer);
      this.updateMenuItem.connect('activate', this.updateData.bind(this));
      this._applySettings();
      this.settings.connect('changed', this._applySettings.bind(this));
      this.menu.connect('open-state-changed', this._onMenuOpened.bind(this));

      // Set up notifications area
      this.messageTray = new MessageTray.MessageTray();
      this.notification_source = new MessageTray.Source('TwitchLive', 'twitchlive');
      this.messageTray.add(this.notification_source);
    };

    _applySettings() {
      STREAMERS = this.settings.get_string('streamers').split(',');
      OPENCMD = this.settings.get_string('opencmd');
      INTERVAL = this.settings.get_int('interval')*1000*60;
      HIDEPLAYLISTS = this.settings.get_boolean('hideplaylists');
      NOTIFICATIONS_ENABLED = this.settings.get_boolean('notifications-enabled');
      NOTIFICATIONS_GAME_CHANGE = this.settings.get_boolean('notifications-game-change');
      HIDEEMPTY = this.settings.get_boolean('hideempty');
      SORTKEY = this.settings.get_string('sortkey');
      HIDESTATUS = this.settings.get_boolean('hidestatus');
      SHOWUPTIME = this.settings.get_boolean('showuptime');
      TOPBARMODE = this.settings.get_string('topbarmode');

      if (this.topbar_mode != TOPBARMODE) {
          if (this.streamertext) this._box.remove_child(this.streamertext.box);
          this.streamertext = {
            "empty": Topbar.empty,
            "text-only": Topbar.text_only,
            "count-only": Topbar.count_only,
            "all-icons": Topbar.all_icons,
            "icon-only": Topbar.icon_only
          }[TOPBARMODE]();
          this._box.add_child(this.streamertext.box);
      }

      if (this.timer.settings != 0) Mainloop.source_remove(this.timer.settings);
      this.timer.settings = Mainloop.timeout_add(1000, () => {
        this.timer.settings = 0;
        this.updateData();
        return false;
      });

    };

    destroy() {
      if (this.timer.settings != 0) Mainloop.source_remove(this.timer.settings);
      this.timer.settings = 0;
      if (this.timer.update != 0) Mainloop.source_remove(this.timer.update);
      this.timer.update = 0;
      this.disable_view_update();
      super.destroy();
    };

    _openSettings() {
        Util.spawn([
            "gnome-extensions", "prefs",
            Extension.uuid
        ]);
    };

    _execCmd(streamer) {
      this.menu.close();
      let cmd = OPENCMD.replace(/%streamer%/g, streamer);
      GLib.spawn_command_line_async(cmd);
    };

    _findNewStreamerEntries(lastList, currentList, detectGameChange) {
      detectGameChange = detectGameChange || false;
      if ( lastList.length == 0 )
        return currentList;

      let streamers = new Map();
      lastList.forEach( ({streamer, game}) => streamers.set(streamer, game) );

      return currentList.filter( ({streamer, game}) => {
          if (!streamers.has(streamer))
              return true;

          if (detectGameChange &&
              game != streamers.get(streamer))
              return true;

          return false;
      });
    };

    _streamerOnlineNotification(streamer) {
      let notification = new MessageTray.Notification(
        this.notification_source,
        _("%streamer% is live!").replace(/%streamer%/, streamer.streamer),
        _("Playing %game%").replace(/%game%/, streamer.game));

      notification.addAction(_("Watch!"), function(){
        // FIXME duplicate code from _execCmd
        let cmd = OPENCMD.replace(/%streamer%/g, streamer.streamer);
        GLib.spawn_command_line_async(cmd);
      });

      if (shellVersion < 40) {
        this.notification_source.notify(notification);
      } else {
        this.notification_source.showNotification(notification);
      }
    };

    updateData() {
      // disable timer and disable "update now" menu
      if (this.timer.update != 0) Mainloop.source_remove(this.timer.update);
      this.updateMenuItem.actor.reactive = false;
      this.updateMenuItem.label.set_text(_("Updating ..."));

      this.disable_view_update();
      let menu = this.streamersMenu;

      let new_online = [];

      const streamersList = STREAMERS.map((d) => d.trim()).filter((d) => d != "");
      Api.streams(this._httpSession, streamersList).then((streams) => {
        Games.getFromStreams(this._httpSession, streams).then((games) => {
          streams.forEach((stream) => {
            if (stream.type !== 'live' && HIDEPLAYLISTS) {
              // zikeji: I've no idea if type !== 'live' designates playlists - the documentation doesn't mention playlists
              return;
            }
            // The login name is stupidly not part of the response but weg get
            // thumbnail_url:"https://static-cdn.jtvnw.net/previews-ttv/live_user_USERNAME-{width}x{height}.jpg
            const loginName = stream.thumbnail_url.slice(52, -21);
            const game = games.find(game => game.id === stream.game_id);
            const gameName = game ? game.name : 'n/a'; // zikeji: may want to display something other than n/a if the game doesn't exist? not sure if this case would ever get hit
            const uptime = SHOWUPTIME ? format_uptime((new Date() - new Date(stream.started_at)) / 1000) : false;
            const item = new MenuItems.StreamerMenuItem(stream.user_name, loginName, gameName, stream.viewer_count, stream.title, stream.type !== 'live', HIDESTATUS, uptime);
            item.connect("activate", () => this._execCmd(loginName));
            new_online.push({
              item: item, streamer: stream.user_name, login: loginName, game: gameName, viewers: stream.viewer_count, started_at: stream.started_at
            });
          });

          // Send the user a notification when new streamer(s) come online, if enabled
          if ( NOTIFICATIONS_ENABLED ) {
            if ( !this.firstRun )
              this._findNewStreamerEntries(this.online, new_online, NOTIFICATIONS_GAME_CHANGE).forEach(
                (newStreamer) => this._streamerOnlineNotification(newStreamer)
              );
            else
              this.firstRun = !this.firstRun;
          }
          // switch updated streamers
          this.online = new_online;
          // notify topbar actor
          this.streamertext.update(new_online);
          // clear menu
          menu.removeAll();
          this.spacer.actor.hide();
          // store items for late menu draw
          this.layoutChanged = true;
          if (this.menu.isOpen) this.updateMenuLayout();
          // make update now menu reactive again
          this.updateMenuItem.actor.reactive = true;
          this.updateMenuItem.label.set_text(_("Update now"));
          this.enable_view_update();

          // update indicator visibility if needed
          if (!HIDEEMPTY || this.online.length) { this.show(); } else { this.hide(); } // visibility property seems deprecated
        }).catch((d) => this.errorHandler(d));
      }).catch((d) => this.errorHandler(d));

      //schedule next check
      this.timer.update = Mainloop.timeout_add(INTERVAL, this.updateData.bind(this));
      return false;
    };

    errorHandler(data) {
      this.updateMenuItem.actor.reactive = true;
      this.updateMenuItem.label.set_text(data.error + " (" + data.message + ")");
    };

    updateMenuLayout() {
      this.streamersMenu.removeAll();

      let online = this.online.slice();
      //select sort
      let sortfunc;
      if ( SORTKEY == 'NAME' ) {
        sortfunc = (a,b) => a.streamer.toUpperCase() > b.streamer.toUpperCase() ? 1 : -1;
      } else if ( SORTKEY == 'GAME' ) {
        sortfunc = (a,b) => a.game.toUpperCase() > b.game.toUpperCase() ? 1 : -1;
      } else if ( SORTKEY == 'UPTIME' ) {
        sortfunc = (a,b) => a.started_at < b.started_at ? 1 : -1;
      } else {
        sortfunc = (a,b) => a.viewers < b.viewers ? 1 : -1;
      }
      //apply sort
      online.sort(sortfunc);

      let menuItems = online.map((d) => d.item);
      menuItems.map((d) => this.streamersMenu.addMenuItem(d));
      if (menuItems.length == 0) {
        this.streamersMenu.addMenuItem(new MenuItems.NobodyMenuItem(_("Nobody is streaming")));
      }
      else {
        this.spacer.actor.show();
        // gather sizes
        let sizes = menuItems.map(get_size_info).reduce(max_size_info, [0,0,0,0]);
        // set sizes
        menuItems.map((item) => apply_size_info(item, sizes));
      }
      this.layoutChanged = false;
    };

    _onMenuOpened() {
      // This event is fired when menu is shown or hidden
      if (this.menu.isOpen && this.layoutChanged == true) {
        this.updateMenuLayout();
      }
    };

    disable_view_update() {
      if (this.timer.view != 0) Mainloop.source_remove(this.timer.view);
      this.timer.view = 0;
    };

    enable_view_update() {
      this.interval();
      this.timer.view = Mainloop.timeout_add(viewUpdateInterval, this.interval.bind(this));
    };

    interval() {
      let _online = this.online;
      if (_online.length > 0) {
        this.icon.set_gicon(Gio.icon_new_for_string(Extension.path + "/livestreamer-icons/twitchlive_on.svg"));
        this.streamertext.interval();
        this.streamertext.box.show();
      }
      else {
        this.icon.set_gicon(Gio.icon_new_for_string(Extension.path + "/livestreamer-icons/twitchlive_off.svg"));
        this.streamertext.box.hide();
      }
      return true;
    };
  }
);

function max_size_info(size_info1, size_info2) {
  return [
    Math.max(size_info1[0], size_info2[0]),
    Math.max(size_info1[1], size_info2[1]),
    Math.max(size_info1[2], size_info2[2]),
    Math.max(size_info1[3], size_info2[3])
  ];
}

function get_size_info(item) {
  return [
    item._layout.name.get_allocation_box().get_width(),
    item._layout.game.get_allocation_box().get_width(),
    item._layout.viewer_count.get_allocation_box().get_width(),
    item._layout.uptime ? item._layout.uptime.get_allocation_box().get_width() : 0
  ];
}

function apply_size_info(item, size_info) {
  let viewer_count_size_diff = size_info[2] - item._layout.viewer_count.get_allocation_box().get_width();
  item._layout.name.set_width(size_info[0]);
  item._layout.game.set_width(size_info[1] + viewer_count_size_diff);
  item._layout.viewer_count.set_width(size_info[2] - viewer_count_size_diff);
  if (item._layout.uptime) {
    item._layout.uptime.set_width(size_info[3]);
  }
  if ( item._layout.title ) {
    item._layout.title.set_width(size_info[0] + size_info[1] + size_info[2] + size_info[3]);
  }
}

function format_uptime(seconds) {
  const hours   = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return [hours, minutes > 9 ? minutes : '0' + minutes].join(':');
}

function init() {
  var icon_theme = Gtk.IconTheme.get_default();
  if (icon_theme === null) {
    // how do we recover? Do we need to?
    // This sometimes happens right after reboot
  }
  else {
    Gtk.IconTheme.get_default().append_search_path(Extension.dir.get_child('livestreamer-icons').get_path());
    Icons.init_icons();
  }
}

function enable() {
    button = new ExtensionLayout();
    Panel.addToStatusArea('twitchlive', button, 0);
}
function disable() {
    button.destroy();
}
