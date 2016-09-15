/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Soup = imports.gi.Soup;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Promise = Extension.imports.promise.Promise;

const api_base = 'https://api.twitch.tv/kraken/';

/* exported channel, stream */

function load_json_async(httpSession, url, fun) {
  let message = Soup.Message.new('GET', url);
  message.requestHeaders.append('Client-ID', '4yzkpoa13a9zqepwguxejohaqulrgbu');
  httpSession.queue_message(message, function(session, message) {
      let data = JSON.parse(message.response_body.data);
      fun(data);
  });
}

// https://github.com/justintv/Twitch-API/blob/master/v3_resources/channels.md#get-channelschannel
function channel(session, streamer) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'channels/' + streamer;
    load_json_async(session, url, resolve);
  });
}

// https://github.com/justintv/Twitch-API/blob/master/v3_resources/streams.md#get-streamschannel
function stream(session, streamer) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'streams/' + streamer;
    load_json_async(session, url, resolve);
  });
}

// https://github.com/justintv/Twitch-API/blob/master/v3_resources/follows.md#get-usersuserfollowschannels
function follows(session, username) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'users/' + username + '/follows/channels?limit=100';
    load_json_async(session, url, resolve);
  });
}
