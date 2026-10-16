#!/usr/bin/env python3
"""No-install native Qt/Quickshell component regression (isolated offscreen).

Uses installed Omarchy Commons only. Helper doubles cover UI routing; real
Wayland offer transport is a separate isolated-compositor acceptance check.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
cache = Path(os.environ.get('XDG_CACHE_HOME', Path.home() / '.cache'))
cache.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='rice-clipboard-native-', dir=cache) as temp:
    base = Path(temp)
    (base / 'Commons').symlink_to('/usr/share/omarchy/shell/Commons', target_is_directory=True)
    (base / 'plugin').mkdir()
    shutil.copy2(root / 'RiceTextEditor.qml', base / 'plugin/RiceTextEditor.qml')
    shutil.copy2(root / 'tests/native_clipboard.qml', base / 'shell.qml')
    for filename, text, delay in [
        ('paste-ok.py', 'QA', 0), ('paste-slow.py', 'QA', 0.25),
        ('paste-large-name.py', 'a' * 49, 0),
        ('paste-json.py', '{\n  "name": "two  spaces 日本語"\n}', 0),
        ('paste-large-json.py', 'é' * 16385, 0),
    ]:
        reply = json.dumps({'ok': True, 'text': text})
        (base / filename).write_text(f'import time;time.sleep({delay});print({reply!r})\n')
    runtime = base / 'runtime'
    runtime.mkdir(mode=0o700)
    env = dict(os.environ, XDG_RUNTIME_DIR=str(runtime), QT_QPA_PLATFORM='offscreen',
               QT_QUICK_BACKEND='software', QT_QPA_PLATFORMTHEME='', RICE_TEST_OUTPUT=str(base))
    for key in ['WAYLAND_DISPLAY', 'DISPLAY', 'DBUS_SESSION_BUS_ADDRESS', 'HYPRLAND_INSTANCE_SIGNATURE']:
        env.pop(key, None)
    result = subprocess.run(['quickshell', '-p', str(base)], env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=25)
    print(result.stdout)
    if result.returncode or 'RICE_CLIPBOARD_NATIVE_PASS' not in result.stdout or 'RICE_CLIPBOARD_NATIVE_FAIL' in result.stdout:
        raise SystemExit(1)
