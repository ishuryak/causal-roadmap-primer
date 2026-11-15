"""Serve the static site locally with module MIME types, including on Windows."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / 'docs'
    SimpleHTTPRequestHandler.extensions_map.update({'.mjs': 'text/javascript', '.js': 'text/javascript'})
    print(f'Preview: http://127.0.0.1:{args.port}/preview/', flush=True)
    with ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(root))) as server:
        server.serve_forever()
