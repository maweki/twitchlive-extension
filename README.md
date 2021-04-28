# TwitchLive-Panel Gnome Shell Extension

This extension to gnome-shell adds a small panel that shows whether
your favorite streamers are online. Clicking the panel will open a
list of streamers with the ability to launch the streamer's twitch
page or execute an arbitrary command to open that stream.

Needs `curl` and `mogrify` to fully support streamer logos.

Install it from here (using Firefox with the gnome-integration plugin): https://extensions.gnome.org/extension/1078/twitchlive-panel/

I use streamlink (https://github.com/streamlink/streamlink) with
`streamlink twitch.tv/%streamer% high,best` as the opening command instead
of the default `xdg-open http://twitch.tv/%streamer%`.

## Manual auth

If the settings-dialogue is broken - like now - but you still need to authenticate against twitch,
you can enter the following into the terminal:

```
xdg-open "https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=1zat8h7je94boq5t88of6j09p41hg0&redirect_uri=http://localhost:8877&scope=" ; python3 ~/.local/share/gnome-shell/extensions/TwitchLive_Panel@extensions.maweki.de/oauth_receive.py ~/.cache/twitchlive-extension/oauth_token
```


## Compatibility with older shell versions

Gnome 3.32 broke compatibility the interface for extensions.
For a version that is compatible with gnome shell previous to version 3.32 check out the `3.30-helix` branch.

## License: GPL 3.0

Icons by https://github.com/RaphaelRochet

Twitch and the Twitch icon is owned by Twitch Interactive, Inc., no rights infringement intended

## TODO (pull requests welcome):

* Give feedback when streamer page is being opened (livestreamer takes some seconds to start)
* nicely reload settings when they are changed
* Translations

## Settings Layouting

In gtk4 settings layout can be tested using `gtk4-builder-tool preview --id=prefs-widget prefs.xml`
