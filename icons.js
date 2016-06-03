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

/* exported init_icons, trigger_download_by_name, trigger_download_by_url, get_streamericon, has_icon */

function init_icons() {
  // everything needs to be disabled if the creation fails or if it isn't a writable directory
  GLib.mkdir_with_parents(icons_path, 448);
  Gtk.IconTheme.get_default().append_search_path(icons_path);
}

function mogrify_available() { // this result can surely be cached
  let res = GLib.spawn_command_line_sync('mogrify -version');
  return res[0];
}

function get_final_icon_path(streamername) {
  let filename = icons_path + '/twitchlive-' + streamername + '.png';
  return filename;
}

function has_icon(streamername) {
  // check whether any icon is already available
  return GLib.file_test(get_final_icon_path(streamername), GLib.FileTest.EXISTS);
}

function trigger_download_by_name(streamername) {
  Api.channel(undefined, streamername).then((channel) => { // where do we get a session from?
    if (channel.logo) trigger_download_by_url(streamername, channel.logo);
  });
}

function trigger_download_by_url(streamername, imageurl) {
  // this should return immediately
  let download_filename = imageurl.split('/').pop();
  let unique_path = icons_path + '/' + download_filename;
  let source_extension = imageurl.split('.').pop();
  let target_name = icons_path + '/twitchlive-' + streamername + '.' + source_extension;
  if (GLib.file_test(unique_path, GLib.FileTest.EXISTS)) {
    return; // these icon names appear to be unique. We don't need to download it again.
  }

  if (source_extension !== 'png' && !mogrify_available()) {
    return; // we can't convert the file anyways so we don't even download it
  }

  // download the file
  let cmd = "curl -s %url% -o %output%".replace('%url%', imageurl).replace('%output%', unique_path);
  GLib.spawn_command_line_sync(cmd);

  // symlink the dowloaded file to the proper name (overwrite if existing)
  cmd = "ln -sf %linksource% %linktarget%".replace('%linksource%', unique_path).replace('%linktarget%', target_name);
  GLib.spawn_command_line_sync(cmd);

  if (source_extension !== 'png') {
    // convert the linked file (this overwrites previously converted files)
    cmd = "mogrify -format png " + target_name;
    GLib.spawn_command_line_async(cmd);
  }

}

function get_streamericon(streamername, style_class) {
  return new St.Icon({ icon_name: 'twitchlive-' + streamername, style_class: style_class, fallback_icon_name: 'twitchlive' });
}
