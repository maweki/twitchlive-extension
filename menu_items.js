/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GObject = imports.gi.GObject;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Icons = Extension.imports.icons;

var StreamerMenuItem = GObject.registerClass(
{GTypeName: 'StreamerMenuItem'},
class StreamerMenuItem extends PopupMenu.PopupBaseMenuItem {
  _init(streamername, login, game, viewer_count, title, is_playlist=false, HIDESTATUS=false, uptime) {
    super._init();
    this._streamer = streamername;

    this._layout = {};
    this._wrapBox = new St.BoxLayout({ vertical: true });
    this._firstLine = new St.BoxLayout();

    this._layout.streamer_icon = Icons.get_streamericon(login, "streamer-icon streamer-menuitem");
    this._layout.name = new St.Label({ text: streamername, style_class : "name streamer-menuitem"});
    this._layout.game = new St.Label({ text: game, style_class : "game streamer-menuitem"});
    this._layout.viewer_count = new St.Label({ text: viewer_count.toString(), style_class : "viewer-count streamer-menuitem"});

    if (uptime) {
      this._layout.uptime = new St.Label({ text: uptime, style_class : "uptime streamer-menuitem"});
    }

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

    if (uptime) {
      this._firstLine.add(this._layout.uptime);
    }

    this._wrapBox.add(this._firstLine);

    if (!HIDESTATUS) {
          this._layout.title = new St.Label({ text: title, style_class : "title streamer-menuitem"});
          this._wrapBox.add(this._layout.title);
    }

    this.add_actor(this._wrapBox); // this.actor.add(this._wrapBox) seems deprecated
  };
});

const NobodyMenuItem = GObject.registerClass(
class NobodyMenuItem extends PopupMenu.PopupBaseMenuItem {

  _init(nobodytext) {
    super._init({ reactive: false, can_focus: false });
    this.actor.add(new St.Label({ text: nobodytext, style_class : "nobody-menuitem"}));
  }
});
