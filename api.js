const Soup = imports.gi.Soup;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Promise = Extension.imports.promise.Promise;

const api_base = 'https://api.twitch.tv/kraken/';

function load_json_async(httpSession, url, fun) {
  let message = Soup.Message.new('GET', url);
  httpSession.queue_message(message, function(session, message) {
      let data = JSON.parse(message.response_body.data);
      fun(data);
  });
}

// https://github.com/justintv/Twitch-API/blob/master/v3_resources/channels.md#get-channelschannel
function channel(session, streamer, icon_download=true) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'channels/' + streamer;
    load_json_async(session, url, resolve);
  }).then((data) => {
    // trigger icon download here
    return data;
  });
}

// https://github.com/justintv/Twitch-API/blob/master/v3_resources/streams.md#get-streamschannel
function stream(session, streamer, icon_download=true) {
  return new Promise((resolve, reject) => {
    let url = api_base + 'streams/' + streamer;
    load_json_async(session, url, resolve);
  }).then((data) => {
    // trigger icon download here
    return data;
  });
}
