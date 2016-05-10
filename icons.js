/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;

const icons_path = GLib.get_user_cache_dir() + '/twitchlive-extension';

function init_icons() {
  // everything needs to be disabled if the creation fails or if it isn't a writable directory
  GLib.mkdir_with_parents(icons_path, 448);
  Gtk.IconTheme.get_default().append_search_path(icons_path);
}

function trigger_download(streamername, imageurl) {
  // some cache clearing mechanism needs to be added
  let extension = imageurl.split('.').pop();
  let filename = icons_path + '/twitchlive-' + streamername + '.' + extension;

  if (!GLib.file_test(filename, GLib.FileTest.EXISTS)) {
    // this might be done with soup but works fine this way
    let cmd = "curl -s %url% -o %output%".replace('%url%', imageurl).replace('%output%', filename);
    GLib.spawn_command_line_sync(cmd); // download should probably be async

    if (extension != 'png') { // we should actually check for the png-file
      cmd = "mogrify -format png " + filename;
      GLib.spawn_command_line_async(cmd);
    }
  }
}

function get_streamericon(streamername, style_class) {
  // a nicer fallback - maybe some default twitch icon - needs to be added
  return new St.Icon({ icon_name: 'twitchlive-' + streamername, style_class: style_class, fallback_icon_name: 'emblem-videos-symbolic' });
}
