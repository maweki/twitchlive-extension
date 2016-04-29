# TwitchLive-Panel Gnome Shell Extension

This extension to gnome-shell adds a small panel that shows whether
your favorite streamers are online. Clicking the panel will open the
streamer's twitch page or execute an arbitrary command to open
that stream.

I use livestreamer (https://github.com/chrippa/livestreamer) with
`livestreamer twitch.tv/%streamer% high` as the opening command instead
of the default `xdg-open http://twitch.tv/%streamer%`.


## License: GPL 2.0

## TODO (pull requests welcome):

* Remove race condition on streamer display rotation
* Open streamer page on double-click
* Give feedback when streamer page is being opened (livestreamer takes some seconds to start)
* make the layout of the settings panel nicer
* nicely reload settings when they are changed
