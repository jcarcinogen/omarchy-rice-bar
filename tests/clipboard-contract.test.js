const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('all Rice Bar editors use bounded paste, never editable TextInput', () => {
  const files = fs.readdirSync(root).filter(f => f.endsWith('.qml'));
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(text, /(?:TextField|TextInput|TextArea)\s*\{/, file);
    assert.doesNotMatch(text, /\.paste\s*\(/, file);
  }
  const panel = fs.readFileSync(path.join(root, 'RicePanel.qml'), 'utf8');
  assert.equal((panel.match(/RiceTextEditor\s*\{/g) || []).length, 2);
  assert.equal((panel.match(/pasteAllowed:root.opened&&root.page===2/g) || []).length, 2);
  const editor = fs.readFileSync(path.join(root, 'RiceTextEditor.qml'), 'utf8');
  for (const contract of ['TextEdit.PlainText', 'Keys.BeforeItem', 'StandardKey.Paste', 'Qt.ShiftModifier', 'Qt.MiddleButton | Qt.RightButton', 'requestedRevision !== revision', 'DropArea {', '32768', '4096']) assert.ok(editor.includes(contract), contract);
});
