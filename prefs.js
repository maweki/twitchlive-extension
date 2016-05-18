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
      this.store.set_column_types([GObject.TYPE_STRING]);
      this.streamersList.model = this.store;

      // let's create a simple text column, that renders as ... text !
      let nameCol = new Gtk.TreeViewColumn( { expand: true, sort_column_id: 0, title: _("Streamer name") });
      let nameColRenderer = new Gtk.CellRendererText;
      nameCol.pack_start(nameColRenderer, true);
      nameCol.add_attribute(nameColRenderer, "text", 0);
      this.streamersList.append_column(nameCol);

      // populate the list
      this._refreshStreamersList();

      this.main.show_all();
      return this.main;
    },

    _addStreamer: function() {
      let name = this.newStreamerEntry.text;
      if (!name) return;
      this.streamers.push(name);
      this.newStreamerEntry.text = "";
      Schema.set_string('streamers', this.streamers.join(','));
      this._refreshStreamersList();
    },

    _delStreamer: function() {
      let [selection, model, iter] = this.streamersList.get_selection().get_selected();
      if (selection) {
          let name = this.store.get_value(iter, 0);
          this.store.remove(iter);
          let index = this.streamers.indexOf(name);
          if (index < 0) return;
          this.streamers.splice(index, 1);
          Schema.set_string('streamers', this.streamers.join(','));
      }
    },

    _refreshStreamersList: function() {
      this.streamers = Schema.get_string('streamers').split(',').sort();
      this.store.clear();
      for (let i = 0; i < this.streamers.length; i++) {
            let name = this.streamers[i].trim();
            if (!name) continue;
            let iter = this.store.append();
            this.store.set(iter, [0], [name]);
        }
    },

});

function buildPrefsWidget()
{
    let widget = new App();
    return widget.main;
};

function init() {}
