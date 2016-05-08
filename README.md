# TwitchLive-Panel Gnome Shell Extension

This extension to gnome-shell adds a small panel that shows whether
your favorite streamers are online. Clicking the panel will open a
list of streamers with the ability to launch the streamer's twitch
page or execute an arbitrary command to open that stream.

Install it from here (using Firefox with the gnome-integration plugin): https://extensions.gnome.org/extension/1078/twitchlive-panel/

I use livestreamer (https://github.com/chrippa/livestreamer) with
`livestreamer twitch.tv/%streamer% high,best` as the opening command instead
of the default `xdg-open http://twitch.tv/%streamer%`.


## License: GPL 3.0

Promises library by https://github.com/satya164/gjs-helpers

## TODO (pull requests welcome):

* Give feedback when streamer page is being opened (livestreamer takes some seconds to start)
* nicely reload settings when they are changed
* Translations
