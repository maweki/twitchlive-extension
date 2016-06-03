/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const GObject = imports.gi.GObject;

const Icons = Extension.imports.icons;

let schemaDir = Extension.dir.get_child('schemas').get_path();
let schemaSource = Gio.SettingsSchemaSource.new_from_directory(schemaDir, Gio.SettingsSchemaSource.get_default(), false);
let schema = schemaSource.lookup('org.gnome.shell.extensions.twitchlive', false);
let Schema = new Gio.Settings({ settings_schema: schema });

const domain = Extension.metadata['gettext-domain']; // Get gettext domain from metadata.json
const localeDir = Extension.dir.get_child('locale');
const _ = Gettext.domain(domain).gettext;
Gettext.bindtextdomain(domain, localeDir.get_path());

const App = new Lang.Class(
{
    Name: 'TwitchLive.App',

    _init: function()
    {
      Icons.init_icons();

      // Build widgets, bind simple fields to settings and connect buttons clicked signals
      let buildable = new Gtk.Builder();
      buildable.add_from_file( Extension.dir.get_path() + '/prefs.xml' );
      this.main = buildable.get_object('prefs-widget');
      Schema.bind('interval', buildable.get_object('field_interval'), 'value', Gio.SettingsBindFlags.DEFAULT);
      Schema.bind('opencmd', buildable.get_object('field_opencmd'), 'text', Gio.SettingsBindFlags.DEFAULT);
      Schema.bind('hidestreamers', buildable.get_object('field_hidestreamers'), 'active', Gio.SettingsBindFlags.DEFAULT);
      buildable.get_object('add_streamer').connect('clicked', Lang.bind(this, this._addStreamer));
      buildable.get_object('del_streamer').connect('clicked', Lang.bind(this, this._delStreamer));

      // Name some widgets for future reference
      this.newStreamerEntry = buildable.get_object('field_addstreamer');
      this.streamersList = buildable.get_object('field_streamerslist');

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
      this.nameColRenderer.connect('edited', Lang.bind(this, this._cellEdited));
      this.nameCol.pack_start(this.nameColRenderer, true);
      this.nameCol.add_attribute(this.nameColRenderer, "text", 0);


      this.nameCol.add_attribute(this.iconColRenderer, "icon-name", 1);

      this.streamersList.append_column(this.nameCol);

      // populate the list
      this._reloadStreamersList();

      this.main.show_all();
      return this.main;
    },

    _cellEdited: function(renderer, path, new_text, whatelse) {
      let [ok, iter] = this.store.get_iter_from_string(path);
      if ( ok ) {
        let old_name = this.store.get_value(iter, 0);
        if (new_text) {
          this.store.set(iter, [0, 1], [new_text, 'twitchlive-' + new_text]);
          this.streamers.push(new_text);
          let index = this.streamers.indexOf(old_name);
          if (index >= 0) this.streamers.splice(index, 1);
        } else {
          // Cell has been emptied : remove old name
          this._removeStreamer(iter);
        }
        // And save !
        this._saveStreamersList();
      }
    },

    _removeStreamer: function(iter) {
      let name = this.store.get_value(iter, 0);
      this.store.remove(iter);
      let index = this.streamers.indexOf(name);
      if (index < 0) return;
      this.streamers.splice(index, 1);
    },

    _appendStreamer: function(name) {
      this.streamers.push(name);
      let iter = this.store.append();
      this.store.set(iter, [0, 1], [name, 'twitchlive-' + name]);
      return iter;
    },

    _addStreamer: function() {
      let iter = this._appendStreamer("");
      this.streamersList.get_selection().select_iter(iter);
      let path = this.store.get_path(iter);
      this.streamersList.set_cursor_on_cell( path, this.nameCol, this.nameColRenderer, true );
    },

    _delStreamer: function() {
      let [selection, model, iter] = this.streamersList.get_selection().get_selected();
      if (selection) {
        this._removeStreamer(iter);
        this._saveStreamersList();
      }
    },

    _saveStreamersList: function() {
      Schema.set_string('streamers', this.streamers.join(','));
    },

    _reloadStreamersList: function() {
      let old_streamers = Schema.get_string('streamers').split(',').sort((a,b) => a.toUpperCase() < b.toUpperCase() ? -1 : 1);
      this.streamers = [];
      this.store.clear();
      for (let i = 0; i < old_streamers.length; i++) {
            let name = old_streamers[i].trim();
            if (!name) continue;
            this._appendStreamer(name);
        }
    },

    _retrieveStreamerIcons: function(streamer) { // when do we trigger this?
      if (streamer === undefined) {
        this.streamers.map((streamer) => {
          if (!Icons.has_icon(streamer)) Icons.trigger_download_by_name(streamer);
        });
      }
      else {
        if (!Icons.has_icon(streamer)) Icons.trigger_download_by_name(streamer);
      }
    }

});

function buildPrefsWidget()
{
    let widget = new App();
    return widget.main;
};

function init() {}
