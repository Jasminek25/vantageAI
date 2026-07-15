"""Back-compat entry point. `python main.py` behaves as it always did.

The routing loop moved to assistant.Assistant (importable by a UI) and the I/O
moved to cli.py. This file only forwards, so any existing script or shortcut
that calls `python main.py` keeps working.
"""

import sys

from cli import main

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or None))
