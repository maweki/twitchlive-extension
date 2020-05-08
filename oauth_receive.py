# This script is used to create tiny webserver that receives an OAuth callback
# as GNOME does not provide a way for extensions to do that.
# gnome-online-accounts has no interface for that, neither does the shell.
# This is minimal implementation for what is needed to do OpenAuth without a client secret.
# We need the browser as the token is passed in the url fragment.
# AUTHOR: Mario Wenzel
# LICENSE: GPL3.0

from http.server import *;
from urllib.parse import *;
import sys;
import os.path;

page = """<html>
<head><title>Twitchlive GNOME Shell extension OAuth</title></head>
<body><script>var tokens=document.location.hash.substring(1);
document.write("<a href=\\"/tokens?" + tokens + "\\"> To finish OAuth-Process click here</a>");
</script></body>
"""

class handler(BaseHTTPRequestHandler):
    def log_requests(self):
        pass

    def do_GET(self):
        print(self.path)
        if self.path == '/':
            # initial call from twitch
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()

            self.wfile.write(page.encode())
        elif self.path.startswith('/tokens'):
            # our own call
            code = parse_qs(urlparse(self.path).query)['access_token'][0]
            open(sys.argv[1], 'w').write(code)

            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()

            self.wfile.write(b"Thank You. You can close this page.")
            sys.exit(0)

HTTPServer(('', 8877), handler).serve_forever()
