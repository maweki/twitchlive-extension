/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GObject = imports.gi.GObject;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Icons = Extension.imports.icons;

var StreamerMenuItem = class extends PopupMenu.PopupBaseMenuItem {

  constructor(streamername, game, viewer_count, title, is_playlist=false, HIDESTATUS=false) {
    super();
    this._streamer = streamername;

    this._layout = {};
    this._wrapBox = new St.BoxLayout({ vertical: true });
    this._firstLine = new St.BoxLayout();

    this._layout.streamer_icon = Icons.get_streamericon(streamername, "streamer-icon streamer-menuitem");
    this._layout.name = new St.Label({ text: streamername, style_class : "name streamer-menuitem"});
    this._layout.game = new St.Label({ text: game, style_class : "game streamer-menuitem"});
    this._layout.viewer_count = new St.Label({ text: viewer_count.toString(), style_class : "viewer-count streamer-menuitem"});

    let info_icon = 'avatar-default-symbolic';
    if (is_playlist) {
      info_icon = 'media-playlist-repeat-symbolic';
    }
    this._layout.viewer_icon = new St.Icon({ icon_name: info_icon, style_class: 'viewer-icon streamer-menuitem' });

    this._firstLine.add(this._layout.streamer_icon);
    this._firstLine.add(this._layout.name);
    this._firstLine.add(this._layout.game);
    this._firstLine.add(this._layout.viewer_count);
    this._firstLine.add(this._layout.viewer_icon);
    this._wrapBox.add(this._firstLine);

    if (!HIDESTATUS) { 
          this._layout.title = new St.Label({ text: title, style_class : "title streamer-menuitem"});
          this._wrapBox.add(this._layout.title); 
    }

    this.actor.add(this._wrapBox);
  };

  get_streamer() {
    return this._streamer;
  };

  get_size_info() {
    return [this._layout.name.get_allocation_box().get_width(), this._layout.game.get_allocation_box().get_width(), this._layout.viewer_count.get_allocation_box().get_width()];
  };

  apply_size_info(size_info) {
    let viewer_count_size_diff = size_info[2] - this._layout.viewer_count.get_allocation_box().get_width();
    this._layout.name.set_width(size_info[0]);
    this._layout.game.set_width(size_info[1] + viewer_count_size_diff);
    this._layout.viewer_count.set_width(size_info[2] - viewer_count_size_diff);
    if ( this._layout.title ) {
      this._layout.title.set_width(size_info[0] + size_info[1] + size_info[2] );
    }
  }
}

class NobodyMenuItem extends PopupMenu.PopupBaseMenuItem {

  constructor(nobodytext) {
    super({ reactive: false, can_focus: false });
    this.actor.add(new St.Label({ text: nobodytext, style_class : "nobody-menuitem"}));
  }
}