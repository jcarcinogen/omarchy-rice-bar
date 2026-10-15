import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/menu-access.py'
spec=importlib.util.spec_from_file_location('menu_access',SCRIPT)
assert spec is not None and spec.loader is not None
menu=importlib.util.module_from_spec(spec);spec.loader.exec_module(menu)

class MenuTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.path=self.root/'omarchy/extensions/omarchy-menu.jsonc'
        self.path.parent.mkdir(parents=True)
    def seed(self,text):self.path.write_text(text);return text
    def test_new_install_remove(self):
        menu.operate(self.path,'install');self.assertEqual(menu.operate(self.path,'status'),'Installed')
        menu.operate(self.path,'remove');self.assertEqual(self.path.read_text(),'{}\n')
    def test_preserve_comments_strings_and_trailing_commas(self):
        original=self.seed('/* { misleading root */\n{\n// keep exactly\n"other": {"label":"commas , } and \\\" and \\\\" ,},\n}\n')
        menu.operate(self.path,'install');self.assertEqual(menu.parse(self.path.read_text())[0]['other'],menu.parse(original)[0]['other'])
        menu.operate(self.path,'remove');self.assertEqual(self.path.read_text(),original)
    def test_idempotent(self):
        menu.operate(self.path,'install');before=self.path.read_bytes()
        menu.operate(self.path,'install');self.assertEqual(self.path.read_bytes(),before)
    def test_unmarked_owned_key(self):
        original=self.seed('{"rice-bar":{"label":"Mine"}}')
        for action in ['install','remove']:
            with self.assertRaises(ValueError):menu.operate(self.path,action)
            self.assertEqual(self.path.read_text(),original)
    def test_edited_marked_block(self):
        menu.operate(self.path,'install');original=self.seed(self.path.read_text().replace('Style gallery','My gallery'))
        with self.assertRaises(ValueError):menu.operate(self.path,'remove')
        self.assertEqual(self.path.read_text(),original)
    def test_malformed_inputs_unchanged(self):
        for text in ['{','{"x":1 /* missing','[]','{"x":NaN}','{"x":Infinity}','{"x":1,"x":2}','{"x":"unclosed}']:
            self.seed(text)
            with self.assertRaises(ValueError):menu.operate(self.path,'install')
            self.assertEqual(self.path.read_text(),text)
    def test_symlink(self):
        target=self.root/'target';target.write_text('{}');self.path.symlink_to(target)
        for action in ['install','remove','status']:
            with self.assertRaises(ValueError):menu.operate(self.path,action)
        self.assertEqual(target.read_text(),'{}')
    def test_fifo(self):
        os.mkfifo(self.path)
        with self.assertRaises(ValueError):menu.operate(self.path,'install')
    def test_byte_cap(self):
        self.seed(' '* (menu.LIMIT+1))
        with self.assertRaises(ValueError):menu.operate(self.path,'install')
    def test_backup_and_mode_preserved(self):
        original=self.seed('{"mine":true}\n');self.path.chmod(0o640)
        menu.operate(self.path,'install');backup=self.path.with_name(self.path.name+'.rice-bar.bak')
        self.assertEqual(backup.read_text(),original);self.assertEqual(self.path.stat().st_mode&0o777,0o640)
        menu.operate(self.path,'remove');self.assertFalse(backup.exists());self.assertEqual(self.path.read_text(),original)
    def test_unrelated_backup_and_new_rows_preserved(self):
        self.seed('{}\n');backup=self.path.with_name(self.path.name+'.rice-bar.bak');backup.write_text('mine')
        menu.operate(self.path,'install');self.seed(self.path.read_text().replace('\n}', '\n"new":true\n}'))
        menu.operate(self.path,'remove');self.assertTrue(menu.parse(self.path.read_text())[0]['new']);self.assertEqual(backup.read_text(),'mine')
    def test_change_detection(self):
        self.seed('{"new":true}')
        with self.assertRaises(ValueError):menu.write(self.path,'{}','{"old":true}')
    def test_empty_xdg_fallback_and_cli_failure(self):
        env=dict(os.environ,HOME=str(self.root),XDG_CONFIG_HOME='',PYTHONDONTWRITEBYTECODE='1')
        result=subprocess.run([sys.executable,str(SCRIPT),'install'],env=env,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr);self.assertTrue((self.root/'.config/omarchy/extensions/omarchy-menu.jsonc').exists())
        self.seed('{')
        result=subprocess.run([sys.executable,str(SCRIPT),'install','--config-root',str(self.root)],env=env,capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0);self.assertEqual(self.path.read_text(),'{')

if __name__=='__main__':unittest.main()
