/**
	AUTHOR: Mario Wenzel
	COMPILING SCHEMAS: glib-compile-schemas schemas/
**/
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Mainloop = imports.mainloop;
const Soup = imports.gi.Soup;
const Json = imports.gi.Json;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const _httpSession = new Soup.SessionAsync();

const viewUpdateInterval = 5000;

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

function _execCmd() {
    let cmd = setting.get_string('opencmd').replace('%streamer%', online[0]);
		GLib.spawn_command_line_async(cmd);
}

function load_json_async(url, fun) {
    let here = this;

    let message = Soup.Message.new('GET', url);
    _httpSession.queue_message(message, function(session, message) {
        let data = JSON.parse(message.response_body.data);
        fun(data);
    });
}

function updateData() {
  disable_view_update();
  streamers = setting.get_string('streamers').split(',');
  online = [];
  for (let i = 0; i < streamers.length; i++) {
      let streamer = streamers[i].trim();
      if (streamer == "") continue;
      let url = 'https://api.twitch.tv/kraken/streams/' + streamer;
      let f = function(streamer){
        load_json_async(url, function(data){
          if (data.stream) online.push(streamer);
        });};
      f(streamer);
  }
  enable_view_update();
  return true;
}

function interval() {
  if (online.length > 0) {
    icon.set_icon_name('media-record-symbolic');
    online.push(online.shift()); // rotate with race condition
    streamertext.set_text(online[0]);
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
  timer.view = Mainloop.timeout_add(viewUpdateInterval, interval);
}

function init() {
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    let layout = new St.BoxLayout();

    icon = new St.Icon({ icon_name: 'media-record-symbolic',
                             style_class: 'system-status-icon' });
    streamertext = new St.Label({text: "Twitch Streamers"});

    layout.add_child(icon);
    layout.add_child(streamertext);
    button.set_child(layout);

    button.connect('button-press-event', _execCmd);
}

function reload() {
  disable();
  enable();
}
setting.connect('changed', reload);

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
    interval();
    updateData();
    timer.update = Mainloop.timeout_add(setting.get_int('interval')*1000*60, updateData);
}
function disable() {
    Main.panel._rightBox.remove_child(button);
    if (timer.update != 0) Mainloop.source_remove(timer.update);
    timer.update = 0;
    disable_view_update();
}
