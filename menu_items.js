const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

const StreamerMenuItem = new Lang.Class({

  Name: 'StreamerMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(streamername, game, viewer_count) {
    this.parent();
    this._streamer = streamername;

    this._layout = {};
    this._layout.name = new St.Label({ text: streamername, style_class : "name streamer-menuitem"});
    this._layout.game = new St.Label({ text: game, style_class : "game streamer-menuitem"});
    this._layout.viewer_count = new St.Label({ text: viewer_count.toString(), style_class : "viewer-count streamer-menuitem"});
    this._layout.viewer_icon = new St.Icon({ icon_name: 'avatar-default-symbolic', style_class: 'viewer-icon streamer-menuitem' });
    this.actor.add(this._layout.name);
    this.actor.add(this._layout.game);
    this.actor.add(this._layout.viewer_count);
    this.actor.add(this._layout.viewer_icon);

    //this._layout.name.set_width(80);
  },

  get_streamer: function() {
    return this._streamer;
  },

  get_size_info: function() {
    return [this._layout.name.get_width(), this._layout.game.get_width(), this._layout.viewer_count.get_width()];
  },

  apply_size_info: function(size_info) {
    this._layout.name.set_width(size_info[0]);
    this._layout.game.set_width(size_info[1]);
    this._layout.viewer_count.set_width(size_info[2]);
  }
});

const NobodyMenuItem = new Lang.Class({

  Name: 'NobodyMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function() {
    this.parent();
    this.actor.add(new St.Label({ text: "Nobody is streaming", style_class : "nobody-menuitem"}));
  }
});
