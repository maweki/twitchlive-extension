/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gdk = imports.gi.Gdk;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Api = Extension.imports.api;

const icons_path = GLib.get_user_cache_dir() + '/twitchlive-extension';

/* exported init_icons, trigger_download_by_name, trigger_download_by_url, get_streamericon, has_icon */

function init_icons() {
  // TODO: everything needs to be disabled if the creation fails or if it isn't a writable directory
  GLib.mkdir_with_parents(icons_path, 448);
  if (Gtk.IconTheme.get_default) { // before 40
    Gtk.IconTheme.get_default().append_search_path(icons_path);
  }
  else { // after 40
    Gtk.IconTheme.get_for_display(Gdk.Display.get_default()).add_search_path(icons_path);
  }
}

function mogrify_available() { // TODO: cache this result
  return GLib.find_program_in_path('mogrify'); // this is null if it isnt available
}

function curl_available() { // TODO: cache this result
  return GLib.find_program_in_path('curl'); // this is null if it isnt available
}

function get_final_icon_path(streamername) {
  let filename = icons_path + '/' + get_icon_name(streamername) + '.png';
  return filename;
}

function has_icon(streamername) {
  // check whether any icon is already available
  return GLib.file_test(get_final_icon_path(streamername), GLib.FileTest.EXISTS);
}

function trigger_download_by_names(names, session) {
  Api.users(session, names).then((data) => {
    data.forEach((streamer) => {
      if (streamer.profile_image_url) trigger_download_by_url(streamer.login, streamer.profile_image_url);
    });
  });
}

function trigger_download_by_url(streamername, imageurl) {
  // TODO: this should return immediately
  if (!curl_available()) {
    return; // we can't download anything
  }

  let download_filename = imageurl.split('/').pop();
  let unique_path = icons_path + '/' + download_filename;
  let source_extension = imageurl.split('.').pop();
  let target_name = icons_path + '/' + get_icon_name(streamername) + '.' + source_extension;
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

function get_icon_name(streamername) {
  return 'twitchlive-' + streamername.toLowerCase();
}

function get_streamericon(streamername, style_class) {
  // St is not imported globally since it's not available in the preferences context
  let icon = new imports.gi.St.Icon({ gicon: Gio.icon_new_for_string(get_final_icon_path(streamername)), style_class: style_class });
  if (icon.set_fallback_icon_name) { // this isnt available before 3.16
    icon.set_fallback_icon_name('twitchlive');
  }
  return icon;
}
