#!/usr/bin/env python3
"""Explicit, reversible Rice Bar row in Omarchy's watched JSONC menu overlay."""
from __future__ import annotations
import argparse
import json
import os
import re
import stat
import sys
import tempfile
from pathlib import Path

LIMIT = 1024 * 1024
KEY = 'rice-bar'
BEGIN = '// rice-bar:menu-begin'
END = '// rice-bar:menu-end'
ENTRY = {'icon': '󰟪', 'label': 'Rice Bar', 'description': 'Style gallery for the stock bar',
         'action': 'omarchy-shell rice-bar toggle'}
BLOCK = '\n  '+BEGIN+'\n  "rice-bar": '+json.dumps(ENTRY, ensure_ascii=False, indent=2).replace('\n', '\n  ')+',\n  '+END+'\n'


def read(path):
    """Bounded no-follow read, including descriptor checks against FIFO races."""
    try:
        info = path.lstat()
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(info.st_mode):
        raise ValueError('Refusing a symlink or non-regular menu file')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > LIMIT:
            raise ValueError('Menu must be a regular file smaller than 1 MiB')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(LIMIT + 1)
        if len(data) > LIMIT:
            raise ValueError('Menu exceeds 1 MiB')
        return data.decode('utf-8')
    finally:
        os.close(fd)


def parse(text):
    """Validate JSONC while retaining source offsets; never serialize user content."""
    clean, syntax = list(text), list(text)
    i = 0
    while i < len(text):
        if text[i] == '"':
            start = i
            i += 1
            while i < len(text):
                if text[i] == '\\':
                    i += 2
                elif text[i] == '"':
                    i += 1
                    break
                else:
                    i += 1
            syntax[start:i] = ' ' * (i-start)
        elif text.startswith('//', i) or text.startswith('/*', i):
            start = i
            if text.startswith('//', i):
                end = text.find('\n', i)
                i = len(text) if end < 0 else end
            else:
                end = text.find('*/', i+2)
                if end < 0:
                    raise ValueError('Unclosed JSONC comment')
                i = end+2
            clean[start:i] = syntax[start:i] = ' ' * (i-start)
        else:
            i += 1
    masked = ''.join(syntax)
    for match in re.finditer(r',\s*[}\]]', masked):
        clean[match.start()] = ' '
    def unique(pairs):
        obj = {}
        for key, value in pairs:
            if key in obj:
                raise ValueError('Duplicate JSONC key: '+key)
            obj[key] = value
        return obj
    def reject_constant(value):
        raise ValueError('Invalid JSON constant: '+value)
    obj = json.loads(''.join(clean), object_pairs_hook=unique, parse_constant=reject_constant)
    if not isinstance(obj, dict):
        raise ValueError('Menu extension must be a JSONC object')
    return obj, masked.index('{')+1


def write(path, text, previous):
    path.parent.mkdir(parents=True, exist_ok=True)
    if read(path) != previous:
        raise ValueError('Menu changed during this operation; please retry')
    fd, name = tempfile.mkstemp(prefix='.rice-bar-', dir=path.parent)
    try:
        if previous is not None:
            os.fchmod(fd, stat.S_IMODE(path.lstat().st_mode))
        with os.fdopen(fd, 'w', encoding='utf-8', newline='') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def operate(path, action):
    original = read(path)
    text = original if original is not None else '{}\n'
    obj, opening = parse(text)
    owned = text.count(BLOCK) == 1 and obj.get(KEY) == ENTRY
    if action == 'status':
        return 'Installed' if owned else 'User-owned or edited entry' if KEY in obj else 'Not installed'
    if action == 'install' and owned:
        return 'Already installed'
    if not owned and (KEY in obj or BEGIN in text or END in text):
        raise ValueError('Preserving user-owned or edited Rice Bar entry; no changes made')
    if action == 'remove' and not owned:
        return 'Not installed'
    updated = text[:opening]+BLOCK+text[opening:] if action == 'install' else text.replace(BLOCK, '', 1)
    parse(updated)
    backup = path.with_name(path.name+'.rice-bar.bak')
    if action == 'install' and original is not None:
        try:
            fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        except FileExistsError:
            pass  # Existing backups (including user-owned ones) are never overwritten.
        else:
            with os.fdopen(fd, 'w', encoding='utf-8', newline='') as stream:
                stream.write(original)
                stream.flush()
                os.fsync(stream.fileno())
    write(path, updated, original)
    if action == 'remove':
        try:
            if read(backup) == updated:
                backup.unlink()
        except (OSError, ValueError):
            pass  # Preserve unsafe, edited, or unrelated backups.
    return 'Installed — Super+Space → Rice Bar' if action == 'install' else 'Removed Rice Bar menu shortcut'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['install', 'remove', 'status'])
    parser.add_argument('--config-root', type=Path, help='XDG config root (for isolated fixtures)')
    args = parser.parse_args()
    root = args.config_root or Path(os.environ.get('XDG_CONFIG_HOME') or Path.home()/'.config')
    try:
        print(operate(root/'omarchy/extensions/omarchy-menu.jsonc', args.action))
        return 0
    except (OSError, ValueError, RecursionError) as exc:
        print('Rice Bar menu: '+str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
