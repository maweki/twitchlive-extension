const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Icons = Extension.imports.icons;

function empty() {
  return {
    box: new St.Label({text: "", y_align: Clutter.ActorAlign.CENTER}),
    update: function() { },
    interval: function() { }
  };
}

function text_only() {
  let rotation = 0,
      online = [];
  return {
    box: new St.Label({text: "", y_align: Clutter.ActorAlign.CENTER}),
    update: function(_online) { online = _online; },
    interval: function() { this.box.set_text(online[rotation++ % online.length].streamer); }
  };
}

function icon_only() {
  let rotation = 0,
      icon,
      online = [];
  return {
    box: new St.BoxLayout(),
    update: function(_online) { online = _online; },
    interval: function() {
      if (icon) {
        icon.destroy();
        icon = undefined;
      }
      if (online.length > 0) {
        icon = Icons.get_streamericon(online[rotation++ % online.length].login, "streamer-icon system-status-icon"),
        this.box.add_actor(icon);
      }
    }
  };
}

function count_only() {
  return {
    box: new St.Label({text: "", y_align: Clutter.ActorAlign.CENTER}),
    update: function(online) { this.box.set_text(online.length.toString()); },
    interval: function() { }
  };
}

function all_icons() {
  let actors = [];
  return {
    box: new St.BoxLayout(),
    update: function(online) {
      actors.forEach((actor) => actor.destroy());
      actors = online.map((streamer) => Icons.get_streamericon(streamer.login, "streamer-icon system-status-icon"));
      actors.forEach((icon) => this.box.add_actor(icon));
    },
    interval: function() { }
  }
}
