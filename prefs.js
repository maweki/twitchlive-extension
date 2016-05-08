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
        this.main = new Gtk.Grid({row_spacing: 10, column_spacing: 20, column_homogeneous: false, row_homogeneous: true});
        this.main.attach (new Gtk.Label({label: _("Streamers to follow (comma seperated)")}), 1, 1, 1, 1);
        this.main.attach (new Gtk.Label({label: _("Update Interval (min)")}), 1, 2, 1, 1);
        this.main.attach (new Gtk.Label({label: _("Command to execute")}), 1, 3, 1, 1);
        this.main.attach (new Gtk.Label({label: _("Show streamer count instead")}), 1, 4, 1, 1);

        this.interval = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 30,
                step_increment: 1
            })
        });
        this.streamers = new Gtk.Entry();
        this.cmd = new Gtk.Entry();
        this.hide_streamers = new Gtk.Switch();

        this.main.attach(this.streamers, 2, 1, 1, 1);
        this.main.attach(this.interval, 2, 2, 1, 1);
        this.main.attach(this.cmd, 2, 3, 1, 1);
        this.main.attach(this.hide_streamers, 2, 4, 1, 1);

        Schema.bind('interval', this.interval, 'value', Gio.SettingsBindFlags.DEFAULT);
        Schema.bind('streamers', this.streamers, 'text', Gio.SettingsBindFlags.DEFAULT);
        Schema.bind('opencmd', this.cmd, 'text', Gio.SettingsBindFlags.DEFAULT);
        Schema.bind('hidestreamers', this.hide_streamers, 'active', Gio.SettingsBindFlags.DEFAULT);

        this.main.show_all();
    }
});

function buildPrefsWidget()
{
    let widget = new App();
    return widget.main;
};

function init() {}
