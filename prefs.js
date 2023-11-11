/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup?version=3.0';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

import * as Icons from './icons.js';
import * as Api from './api.js';

const App = class {
  constructor(extensionDir, path, settings) {
    this.settings = settings;
    this.path = path;
    this._httpSession = Soup.Session.new();
    // Make soup use default system proxy if configured
    // Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.ProxyResolverDefault());

    Icons.init_icons();

    // Build widgets, bind simple fields to settings and connect buttons clicked signals
    let buildable = new Gtk.Builder();
    buildable.add_from_file( extensionDir.get_path() + '/prefs.xml' );

    this._buildable = buildable;
    this.main = buildable.get_object('prefs-widget');
    this.settings.bind('interval', buildable.get_object('field_interval'), 'value', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('opencmd', buildable.get_object('field_opencmd'), 'text', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('hideplaylists', buildable.get_object('field_hideplaylists'), 'active', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('notifications-enabled', buildable.get_object('field_notifications-enabled'), 'active', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('notifications-game-change', buildable.get_object('field_notifications-game-change'), 'active', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('notifications-streamer-icon', buildable.get_object('field_notifications-streamer-icon'), 'active', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('hideempty', buildable.get_object('field_hideempty'), 'active', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('hidestatus', buildable.get_object('field_hidestatus'), 'active', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('showuptime', buildable.get_object('field_showuptime'), 'active', Gio.SettingsBindFlags.DEFAULT);
    
    const updateNotificationOptions = () => {
      var notificationsEnabled = this.settings.get_boolean('notifications-enabled');
      buildable.get_object('obj_notifications-game-change').sensitive = notificationsEnabled;
      buildable.get_object('obj_notifications-streamer-icon').sensitive = notificationsEnabled;
    };

    updateNotificationOptions();

    buildable.get_object('field_notifications-enabled').connect('notify::active', () => updateNotificationOptions());
    buildable.get_object('add_streamer').connect('clicked', this._addStreamer.bind(this));
    buildable.get_object('del_streamer').connect('clicked', this._delStreamer.bind(this));
    buildable.get_object('del_all_streamers').connect('clicked', this._delAllStreamers.bind(this));
    buildable.get_object('import_from_twitch').connect('clicked', this._importFromTwitch.bind(this));
    buildable.get_object('authenticate_oauth').connect('clicked', this._authenticateOauth.bind(this));

    // Name some widgets for future reference
    this.newStreamerEntry = buildable.get_object('field_addstreamer');
    this.streamersList = buildable.get_object('field_streamerslist');
    this.sortkeyStore = buildable.get_object('StreamSort_ListStore');
    this.topbardisplayStore = buildable.get_object('TopBarDisplay_ListStore');

    // Fill the topbar display combobox
    [
      ['empty', _('Only indicator')] ,['text-only', _('Streamers names')] , ['count-only', _('Number of live streams')] ,
      ['icon-only', _('Streamers icons')] , ['all-icons', _('Streamers icons (all)')]
    ].forEach( function(element) {
      let iter = this.topbardisplayStore.append();
      this.topbardisplayStore.set(iter, [0, 1], element);
    }, this);
    this.settings.bind('topbarmode', buildable.get_object('field_topbarmode'), 'active-id', Gio.SettingsBindFlags.DEFAULT);

    // Fill the sort key combobox
    [ ['NAME', _('Streamer name')] , ['GAME', _('Game title')] , ['COUNT', _('Viewers count')], ['UPTIME', _('Stream uptime')] ].forEach( function(element) {
      let iter = this.sortkeyStore.append();
      this.sortkeyStore.set(iter, [0, 1], element);
    }, this);
    this.settings.bind('sortkey', buildable.get_object('field_sortkey'), 'active-id', Gio.SettingsBindFlags.DEFAULT);

    // Create the list's store and columns
    this.store = new Gtk.ListStore();
    this.store.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
    this.streamersList.model = this.store;

    // let's create a single column
    this.nameCol = new Gtk.TreeViewColumn( { expand: true, sort_column_id: 0, title: _("Streamer name") });

    // render user icon at first
    this.iconColRenderer = new Gtk.CellRendererPixbuf( {icon_name: 'avatar-default-symbolic'} );
    this.nameCol.pack_start(this.iconColRenderer, false);
    // render streamer name next
    this.nameColRenderer = new Gtk.CellRendererText( {editable: true} );
    this.nameColRenderer.connect('edited', this._cellEdited.bind(this));
    this.nameCol.pack_start(this.nameColRenderer, true);
    this.nameCol.add_attribute(this.nameColRenderer, "text", 0);
    this.nameCol.add_attribute(this.iconColRenderer, "icon-name", 1);

    this.streamersList.append_column(this.nameCol);

    // populate the list
    this._reloadStreamersList();

    if (this.main.show_all) this.main.show_all();
  };

  _importFromTwitch() {
    //Open the dialog with the text prompt
    this._showUserPromptDialog( (textbox, messagedialog, response_id) => {
      //Extract the text
      let username = textbox.get_text();
      messagedialog.hide();
      if(response_id === Gtk.ResponseType.OK){
        Api.users(this._httpSession, [username]).then((data) => {
          if (data.length > 0) {
            const user = data[0];
            if (user.id) {
              Api.follows(this._httpSession, user.id).then((follows) => {
                var followsIDs = follows.map(x => x.broadcaster_id);
                Api.usersID(this._httpSession, followsIDs).then((userdata) => {
                    userdata.forEach(follow => this._appendStreamer(follow.login));
                    this._saveStreamersList();
                    this._reloadStreamersList();
                    this._retrieveStreamerIcons();
                 });
              });
            }
          }
        });
      }
    });
  };

  _authenticateOauth() {
    // Triger Oauth Authentication
    Api.trigger_oauth(this.path);
  };

  _showUserPromptDialog(callback) {
    if( !this._messageDialog ) {
      this._messageDialog = this._buildable.get_object("UserPromptDialog");
      this._messageDialog.connect ('response', callback.bind(null, this._buildable.get_object("UserPromptDialog-entry")).bind(this));
    }
    if (this._messageDialog.show_all) {
      this._messageDialog.show_all();
    } else {
      this._messageDialog.show();
    }
  };

  _cellEdited(renderer, path, new_text, whatelse) {
    let [ok, iter] = this.store.get_iter_from_string(path);
    if ( ok ) {
      let old_name = this.store.get_value(iter, 0);
      if (new_text) {
        this.store.set(iter, [0, 1], [new_text, Icons.get_icon_name(new_text)]);
        this.streamers.push(new_text);
        let index = this.streamers.indexOf(old_name);
        if (index >= 0) this.streamers.splice(index, 1);
        this._retrieveStreamerIcons(new_text);
      } else {
        // Cell has been emptied : remove old name
        this._removeStreamer(iter);
      }
      // And save !
      this._saveStreamersList();
    }
  };

  _removeStreamer(iter) {
    let name = this.store.get_value(iter, 0);
    this.store.remove(iter);
    let index = this.streamers.indexOf(name);
    if (index < 0) return;
    this.streamers.splice(index, 1);
  };

  _appendStreamer(name) {
    this.streamers.push(name);
    let iter = this.store.append();
    this.store.set(iter, [0, 1], [name, Icons.get_icon_name(name)]);
    return iter;
  };

  _addStreamer() {
    let iter = this._appendStreamer("");
    this.streamersList.get_selection().select_iter(iter);
    let path = this.store.get_path(iter);
    this.streamersList.set_cursor_on_cell( path, this.nameCol, this.nameColRenderer, true );
  };

  _delStreamer() {
    let [selection, model, iter] = this.streamersList.get_selection().get_selected();
    if (selection) {
      this._removeStreamer(iter);
      this._saveStreamersList();
    }
  };

  _delAllStreamers() {
    this.streamers = [];
    this.store.clear();
    this._saveStreamersList();
  };

  _saveStreamersList() {
    let toSave = this.streamers.reduce((prev, username) => {
      return prev.some(u => u.toLowerCase() === username.toLowerCase()) ?
        prev : prev.concat(username);
    },[]);
    this.settings.set_string('streamers', toSave.join(','));
  };

  _reloadStreamersList() {
    let old_streamers = this.settings.get_string('streamers').split(',').sort((a,b) => a.toUpperCase() < b.toUpperCase() ? -1 : 1);
    this.streamers = [];
    this.store.clear();
    for (let i = 0; i < old_streamers.length; i++) {
          let name = old_streamers[i].trim();
          if (!name) continue;
          this._appendStreamer(name);
      }
    this._retrieveStreamerIcons();
  };

  _retrieveStreamerIcons(streamer) {
    if (streamer === undefined) {
      const streamersWithoutIcons = this.streamers.filter((streamer) => !Icons.has_icon(streamer));
      if (streamersWithoutIcons.length > 0) {
        Icons.trigger_download_by_names(streamersWithoutIcons, this._httpSession);
      }
    }
    else {
      if (!Icons.has_icon(streamer)) Icons.trigger_download_by_names([streamer], this._httpSession);
    }
  }
}

export default class TwitchLivePreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage();
    window.add(page);

    const group = new Adw.PreferencesGroup();
    page.add(group);
    
    const widget = new App(this.dir, this.path, this.getSettings());
    group.add(widget.main);
  }
}
