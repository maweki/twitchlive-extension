/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Soup = imports.gi.Soup;

const Extension = imports.misc.extensionUtils.getCurrentExtension();

const api_base = 'https://api.twitch.tv/helix/';

/* exported channel, stream */

function load_json_async(httpSession, url, fun) {
  let message = Soup.Message.new('GET', url);
  message.requestHeaders.append('Client-ID', '4yzkpoa13a9zqepwguxejohaqulrgbu');
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
      reject(error.error);
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
