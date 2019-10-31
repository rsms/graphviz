#!/usr/bin/env python
from __future__ import print_function, absolute_import
import os, sys
import signal
import socket
import http.server
from os.path import dirname, abspath, join as pjoin

def sighandler(signum, frame):
  sys.stdout.write('\n')
  sys.stdout.flush()
  sys.exit(1)


class HTTPServer(http.server.HTTPServer):
  def __init__(self, addr):
    http.server.HTTPServer.__init__(
      self, addr, http.server.SimpleHTTPRequestHandler)

  def server_bind(self):
    self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    http.server.HTTPServer.server_bind(self)

addr = ("127.0.0.1", 3009)

if len(sys.argv) > 1:
  if sys.argv[1] == '-h':
    print('usage: %s [-h | --bind-any]' % sys.argv[0], file=sys.stdout)
    sys.exit(0)
  elif sys.argv[1] == '--bind-any':
    addr = ("0.0.0.0", addr[1])

# make ^C instantly exit program
signal.signal(signal.SIGINT, sighandler)

os.chdir(os.path.dirname(os.path.abspath(__file__)))

httpd = HTTPServer(addr)
print("serving %s at http://%s:%d/" % (os.getcwd(), addr[0], addr[1]))
httpd.serve_forever()
