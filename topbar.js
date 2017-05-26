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
      online = [];
  return {
    box: Icons.get_streamericon("", "streamer-icon system-status-icon"),
    update: function(_online) { online = _online; },
    interval: function() {
      this.box.set_icon_name(Icons.get_icon_name(online[rotation++ % online.length].streamer));
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
      actors = online.map((streamer) => Icons.get_streamericon(streamer.streamer, "streamer-icon system-status-icon"));
      actors.forEach((icon) => this.box.add_actor(icon));
    },
    interval: function() { }
  }
}
