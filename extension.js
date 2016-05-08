/**
	AUTHOR: Mario Wenzel
	COMPILING SCHEMAS: glib-compile-schemas schemas/
**/
const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const Panel = imports.ui.main.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const MenuItems = Extension.imports.menu_items;
const Promise = Extension.imports.promise.Promise;

const _httpSession = new Soup.SessionAsync();

const viewUpdateInterval = 10*1000;

let schemaDir = Extension.dir.get_child('schemas').get_path();
let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
    schemaDir,
    Gio.SettingsSchemaSource.get_default(),
    false
);
let schema = schemaSource.lookup('org.gnome.shell.extensions.twitchlive', false);
let setting = new Gio.Settings({ settings_schema: schema });


let streamers = [];
let online = [];
let timer = { view: 0, update: 0 };

let streamertext, text, button, icon;

const ExtensionLayout = new Lang.Class({
  Name: 'ExtensionLayout',
  Extends: PanelMenu.Button,

  _init: function() {
    this.parent(0.0);
    this._box = new St.BoxLayout();
    this.actor.add_actor(this._box);
    icon = new St.Icon({ icon_name: 'media-record-symbolic',
                             style_class: 'system-status-icon' });
    streamertext = new St.Label({text: "Twitch Streamers",
                                y_align: Clutter.ActorAlign.CENTER});
    this._box.add_child(icon);
    this._box.add_child(streamertext);

    //button.connect('button-release-event', _execCmd);
  }

});

function _execCmd(sender, event, streamer) {
  let cmd = setting.get_string('opencmd').replace('%streamer%', streamer);
  GLib.spawn_command_line_async(cmd);
}

function max_size_info(size_info1, size_info2) {
  return [Math.max(size_info1[0], size_info2[0]), Math.max(size_info1[1], size_info2[1]), Math.max(size_info1[2], size_info2[2])]
}

function load_json_async(url, fun) {
    let message = Soup.Message.new('GET', url);
    _httpSession.queue_message(message, function(session, message) {
        let data = JSON.parse(message.response_body.data);
        fun(data);
    });
}

function updateData() {
  disable_view_update();
  let menu = button.menu;
  let menu_items = [];
  menu.removeAll();

  streamers = setting.get_string('streamers').split(',');
  online = [];

  // make requests
  let requests = [];
  for (let i = 0; i < streamers.length; i++) {
      let streamer = streamers[i].trim();
      if (streamer == "") continue;

      let f = function(streamer){
        let http_prom = new Promise((resolve, reject) => {
          let url = 'https://api.twitch.tv/kraken/streams/' + streamer;
          load_json_async(url, resolve)
        }).then((data) => {
          if (data.stream) {
            online.push(streamer);
            let item = new MenuItems.StreamerMenuItem(streamer, data.stream.game, data.stream.viewers);
            menu.addMenuItem(item);
            item.connect("activate", Lang.bind(this, _execCmd, streamer));
            menu_items.push(item);
          }
        });
        requests.push(http_prom);
      };
      f(streamer);
  }

  new Promise.all(requests).then(() => {
    if (menu_items.length == 0) {
      menu.addMenuItem(new MenuItems.NobodyMenuItem());
    }
    else {
      // gather sizes
      let sizes = [0,0,0];
      for (let i = 0; i < menu_items.length; i++) {
        sizes = max_size_info(sizes, menu_items[i].get_size_info());
      };

      // set sizes
      for (let i = 0; i < menu_items.length; i++) {
        menu_items[i].apply_size_info(sizes);
      };
    }
    enable_view_update();
  });
  return true;
}

function interval() {
  let _online = online;
  if (_online.length > 0) {
    icon.set_icon_name('media-record-symbolic');
    _online.push(_online.shift()); // rotate
    streamertext.set_text(_online[0]);
  }
  else {
    icon.set_icon_name('media-playback-stop-symbolic');
    streamertext.set_text("");
  }
  return true;
}

function disable_view_update() {
  if (timer.view != 0) Mainloop.source_remove(timer.view);
  timer.view = 0;
}
function enable_view_update() {
  interval();
  timer.view = Mainloop.timeout_add(viewUpdateInterval, interval);
}

function init() {
}

function enable() {
    button = new ExtensionLayout();
    Panel.addToStatusArea('twitchlive', button, 0);
    updateData();
    timer.update = Mainloop.timeout_add(setting.get_int('interval')*1000*60, updateData);
}
function disable() {
    button.destroy();
    if (timer.update != 0) Mainloop.source_remove(timer.update);
    timer.update = 0;
    disable_view_update();
}
