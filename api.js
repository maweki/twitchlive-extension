/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ByteArray = imports.byteArray;

const Extension = imports.misc.extensionUtils.getCurrentExtension();

const api_base = 'https://api.twitch.tv/helix/';
const client_id = "1zat8h7je94boq5t88of6j09p41hg0";
const oauth_receiver = imports.misc.extensionUtils.getCurrentExtension().path + "/oauth_receive.py"
const oauth_token_path = GLib.get_user_cache_dir() + '/twitchlive-extension/oauth_token';

/* OAuth */

function trigger_oauth() {
  const url = "https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=" + client_id + "&redirect_uri=http://localhost:8877&scope=";
  GLib.spawn_command_line_async("xdg-open " + url);
  GLib.spawn_sync(null, ["python3", oauth_receiver,  oauth_token_path], null, GLib.SpawnFlags.SEARCH_PATH, null);
}

function get_token() {
  var tokenfile = Gio.File.new_for_path(oauth_token_path);
  if (tokenfile.query_exists(null)) {
    let success, content, tag;
    [success, content, tag] = tokenfile.load_contents(null);
    return ByteArray.toString(content);
  }
  return undefined;
}

/* exported channel, stream */

function load_json_async(httpSession, url, fun) {
  let message = Soup.Message.new('GET', url);
  let oauth_token = get_token();
  message.requestHeaders.append('Client-ID', client_id);
  if (oauth_token) {
    message.requestHeaders.append('Authorization', "Bearer " + oauth_token);
  }
  httpSession.queue_message(message, function(session, message) {
      let data = JSON.parse(message.response_body.data);
      fun(data);
  });
}

// "chunk" an array into multiple chunks (for 100-per-request limit)
function chunk(arr, len) {
  var chunks = [],
      i = 0,
      n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }

  return chunks;
}

// gets a list of promises, waits on them, then resolves with the data - merged
function promiseAllMerge(promises) {
  return new Promise((resolve, reject) => {
    Promise.all(promises).then(data => {
      resolve([].concat.apply([], data));
    }).catch(error => {
      reject(error);
    });
  });
}

// https://dev.twitch.tv/docs/api/reference/#get-users
function users(session, userLogins) {
    return usersLogin(session, userLogins);
}

function usersLogin(session, userLogins) {
  const chunks = chunk(userLogins, 100);
  const promises = [];
  chunks.forEach((chunk) => {
    promises.push(_users(session, chunk, "login"));
  });
  return promiseAllMerge(promises);
}

function usersID(session, userLogins) {
  const chunks = chunk(userLogins, 100);
  const promises = [];
  chunks.forEach((chunk) => {
    promises.push(_users(session, chunk, "id"));
  });
  return promiseAllMerge(promises);
}

function _users(session, userLogins, key) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'users?' + key + '=' + userLogins.join('&' + key + '=');
    load_json_async(session, url, (data) => {
      if (!data.error) {
        resolve(data.data);
      } else {
        reject(data);
      }
    });
  });
}


// https://dev.twitch.tv/docs/api/reference/#get-users-follows
function follows(session, userId) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'users/follows?from_id=' + encodeURI(userId) + '&first=100';
    load_json_async(session, url, (data) => {
      if (!data.error) {
        resolve(data.data);
      } else {
        reject(data);
      }
    });
  });
}

// https://dev.twitch.tv/docs/api/reference/#get-streams
function streams(session, userLogins) {
  const chunks = chunk(userLogins, 100);
  const promises = [];
  chunks.forEach((chunk) => {
    promises.push(_streams(session, chunk));
  });
  return promiseAllMerge(promises);
}

function _streams(session, userLogins) {
  // TODO: split > 100 into groups and resolve as a promiseAll in this function
  return new Promise((resolve, reject) => {
    let url = api_base + 'streams?user_login=' + userLogins.map(encodeURI).join('&user_login=');
    load_json_async(session, url, (data) => {
      if (!data.error) {
        resolve(data.data);
      } else {
        reject(data);
      }
    });
  });
}

// https://dev.twitch.tv/docs/api/reference/#get-games
function games(session, gameIds) {
  const chunks = chunk(gameIds, 100);
  const promises = [];
  chunks.forEach((chunk) => {
    promises.push(_games(session, chunk));
  });
  return promiseAllMerge(promises);
}

function _games(session, gameIds) {
  // TODO: split > 100 into groups and resolve as a promiseAll in this function
  return new Promise((resolve, reject) => {
    if (gameIds.length === 0) {
      // zikeji: I'm lazy and don't want to properly handle 0 gameIds in extension.js so I'm handling it here
      resolve([]);
    } else {
      let url = api_base + 'games?id=' + gameIds.join('&id=');
      load_json_async(session, url, (data) => {
        if (!data.error) {
          resolve(data.data);
        } else {
          reject(data);
        }
      });
    }
  });
}
