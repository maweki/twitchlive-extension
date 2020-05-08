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
            print(self.path)

            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()

            self.wfile.write(page.encode())
        elif self.path.startswith('/tokens'):
            code = parse_qs(urlparse(self.path).query)['access_token'][0]
            open(sys.argv[1], 'w').write(code)

            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()

            self.wfile.write(b"Thank You. You can close this page.")
            sys.exit(0)

HTTPServer(('', 8877), handler).serve_forever()
