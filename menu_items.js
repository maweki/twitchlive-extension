/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Icons = Extension.imports.icons;

const StreamerMenuItem = new Lang.Class({

  Name: 'StreamerMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(streamername, game, viewer_count, title, is_playlist=false) {
    this.parent();
    this._streamer = streamername;

    this._layout = {};
    this._wrapBox = new St.BoxLayout();
    this._textLayout = new St.BoxLayout({ vertical: true });
    this._textFirstLine = new St.BoxLayout();

    this._layout.streamer_icon = Icons.get_streamericon(streamername, "streamer-icon streamer-menuitem");
    this._layout.name = new St.Label({ text: streamername, style_class : "name streamer-menuitem"});
    this._layout.game = new St.Label({ text: game, style_class : "game streamer-menuitem"});
    this._layout.viewer_count = new St.Label({ text: viewer_count.toString(), style_class : "viewer-count streamer-menuitem"});

    let info_icon = 'avatar-default-symbolic';
    if (is_playlist) {
      info_icon = 'media-playlist-repeat-symbolic';
    }
    this._layout.viewer_icon = new St.Icon({ icon_name: info_icon, style_class: 'viewer-icon streamer-menuitem' });

    this._layout.title = new St.Label({ text: title, style_class : "title streamer-menuitem"});

    this._textFirstLine.add(this._layout.name);
    this._textFirstLine.add(this._layout.game, {expand: true, fill:true});
    this._textFirstLine.add(this._layout.viewer_count);
    this._textFirstLine.add(this._layout.viewer_icon);

    this._textLayout.add(this._textFirstLine);
    this._textLayout.add(this._layout.title);

    this._wrapBox.add(this._layout.streamer_icon);
    this._wrapBox.add(this._textLayout);

    this.actor.add(this._wrapBox);

    //this._layout.name.set_width(80);
  },

  get_streamer: function() {
    return this._streamer;
  },

  get_size_info: function() {
    return [this._layout.name.get_allocation_box().get_width(), this._layout.game.get_allocation_box().get_width(), 
      this._layout.viewer_count.get_allocation_box().get_width(), this._layout.title.get_allocation_box().get_width()];
  },

  apply_size_info: function(size_info) {
    let viewer_count_size_diff = size_info[2] - this._layout.viewer_count.get_allocation_box().get_width();
    this._layout.name.set_width(size_info[0]);
    this._layout.game.set_width(size_info[1] + viewer_count_size_diff);
    this._layout.viewer_count.set_width(size_info[2] - viewer_count_size_diff);
    this._layout.title.set_width(size_info[3]);
  }
});

const NobodyMenuItem = new Lang.Class({

  Name: 'NobodyMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(nobodytext) {
    this.parent({ reactive: false, can_focus: false });
    this.actor.add(new St.Label({ text: nobodytext, style_class : "nobody-menuitem"}));
  }
});
