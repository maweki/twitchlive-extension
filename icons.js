/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Api = Extension.imports.api;

const icons_path = GLib.get_user_cache_dir() + '/twitchlive-extension';

function init_icons() {
  // everything needs to be disabled if the creation fails or if it isn't a writable directory
  GLib.mkdir_with_parents(icons_path, 448);
  Gtk.IconTheme.get_default().append_search_path(icons_path);
}

function has_icon(streamername) {
  // check whether an icon is already available
}

function trigger_download_by_name(streamername) {
  if (has_icon(streamername)) {
    return;
  }
  Api.channel(undefined, streamername).then((channel) => { // where do we get a session from?
    if (channel.logo) trigger_download_by_url(streamername, channel.logo);
  });
}

function trigger_download_by_url(streamername, imageurl) {
  // basically what trigger_download does now but should return immediately
  trigger_download(streamername, imageurl);
}

/*
  New download/cache mechanism: We check against the actual filename twitch tells us and check whether this icon is available
  if it is, we don't do anything. This name is both available from trigger_download_by_name (via api) and trigger_download_by_url.
  alternatively, a zero-length file of the same name withouth extension could be saved.

  If it is not available, download the file, post-process it (to png), if neccessary and symlink it to the name the icons recognize.
*/

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
  return new St.Icon({ icon_name: 'twitchlive-' + streamername, style_class: style_class, fallback_icon_name: 'twitchlive' });
}
