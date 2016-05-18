/**
  AUTHOR: Mario Wenzel
  LICENSE: GPL3.0
**/
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

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

      // Prepare static controls
      let buildable = new Gtk.Builder();
      buildable.add_from_file( Extension.dir.get_path() + '/prefs.xml' );

      Schema.bind('interval', buildable.get_object('field_interval'), 'value', Gio.SettingsBindFlags.DEFAULT);
      Schema.bind('streamers', buildable.get_object('field_streamers'), 'text', Gio.SettingsBindFlags.DEFAULT);
      Schema.bind('opencmd', buildable.get_object('field_opencmd'), 'text', Gio.SettingsBindFlags.DEFAULT);
      Schema.bind('hidestreamers', buildable.get_object('field_hidestreamers'), 'active', Gio.SettingsBindFlags.DEFAULT);

      this.main = buildable.get_object('prefs-widget');
      this.main.show_all();
      return this.main;
    }

});

function buildPrefsWidget()
{
    let widget = new App();
    return widget.main;
};

function init() {}
