/*https://gist.github.com/buzztaiki/1487781/74ea93d3a30f20c7f094327db9cb263a6286f6d6
https://github.com/optimisme/gjs-examples/blob/master/egSpawn.js
https://developer.gnome.org/pygobject/stable/class-giofile.html
*/

/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const GLib = imports.gi.GLib;

const Api = Extension.imports.api;

const receiver = imports.misc.extensionUtils.getCurrentExtension().path + "/receive.py"
const oauth_token_path = GLib.get_user_cache_dir() + '/twitchlive-extension/oauth_token';
const client_id = "1zat8h7je94boq5t88of6j09p41hg0";

function trigger_oauth() {
  const url = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=" + client_id + "&redirect_uri=http://localhost:8877&scope=";
  GLib.spawn_command_line_async("xdg-open " + url);
  GLib.spawn_command_line_async("python3 " + receiver + " " + oauth_token_path);
}

function read_token() {
  var tokenfile = Gio.File.new_for_path(oauth_token_path);
  if (tokenfile.query_exists(null)) {
    [success, content, tag] = tokenfile.load_contents(null);
    log("read token");
    log(content);
    return content;
  }
  return '';
}

function check_token(token) {

}

function token_valid() {
  var token = read_token();
  if (token) {
    return check_token(token);
  }
  return false;
}
