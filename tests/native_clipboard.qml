import QtQuick
import QtTest
import Quickshell
import "plugin"

// Run via the private harness documented in REVIEW.md; helper doubles test
// routing/stale-result rejection, not real Wayland clipboard transport.
ShellRoot {
    Window {
        width: 600; height: 360; visible: true
        RiceTextEditor { id: name; x:10; y:10; width:260; accessibleName:"Look name" }
        RiceTextEditor { id: json; x:10; y:70; width:560; height:160; multiline:true; maximumLength:32768 }
        TestCase {
            id: tests
            when: false
            property int passed: 0
            function check(value, message) { if (!value) throw new Error(message); passed++; console.log("PASS",message) }
            function equal(a,b,m) { check(a===b,m+": "+String(a).slice(0,80)) }
            function helper(field, filename) { field.helperPath=Quickshell.env("RICE_TEST_OUTPUT")+"/"+filename;field.forceActiveFocus();wait(20) }
            function finishPaste(field) { tryCompare(field,"pastePending",false,2200);wait(30);check(!field.pastePending,"helper completed") }
            function run() {
                try {
                    helper(name,"paste-ok.py")
                    keyClick(Qt.Key_A);keyClick(Qt.Key_B);keyClick(Qt.Key_Left);keyClick(Qt.Key_Delete)
                    equal(name.text,"a","Native typing and delete")
                    keyClick(Qt.Key_A,Qt.ControlModifier);keyClick(Qt.Key_C)
                    equal(name.text,"c","Select-all replacement")
                    name.text="café 日本語 <b>x</b>";equal(name.text,"café 日本語 <b>x</b>","Unicode and plain markup retained")
                    name.text="a\nb\tc";equal(name.text,"a b c","Name stays single-line")
                    name.text="w".repeat(49);equal(name.text.length,48,"Name cap")
                    name.cursorPosition=48;wait(40)
                    var editor=findChild(name,"rice-native-editor"), viewport=findChild(name,"rice-editor-viewport")
                    var caret=editor.mapToItem(viewport,editor.cursorRectangle.x,0)
                    check(caret.x>=0 && caret.x<=viewport.width,"Name caret scrolls into view")
                    name.text="replace";name.selectAll();keyClick(Qt.Key_V,Qt.ControlModifier)
                    check(name.pastePending,"Ctrl+V intercepted");finishPaste(name);equal(name.text,"QA","Bounded paste replaces selection")
                    name.clear();keyClick(Qt.Key_Insert,Qt.ShiftModifier);finishPaste(name);equal(name.text,"QA","Shift+Insert intercepted")
                    name.text="keep";mouseClick(name,20,15,Qt.MiddleButton);wait(40);equal(name.text,"keep","Middle click cannot native paste")
                    helper(name,"paste-slow.py");name.clear();keyClick(Qt.Key_V,Qt.ControlModifier);keyClick(Qt.Key_Z);finishPaste(name);equal(name.text,"z","Typing rejects stale paste")
                    name.text="abc";name.cursorPosition=3;keyClick(Qt.Key_V,Qt.ControlModifier);keyClick(Qt.Key_Left);finishPaste(name);equal(name.text,"abc","Cursor rejects stale paste")
                    name.clear();keyClick(Qt.Key_V,Qt.ControlModifier);name.pasteAllowed=false;name.pasteAllowed=true;finishPaste(name);equal(name.text,"","Close/reopen rejects paste")
                    keyClick(Qt.Key_V,Qt.ControlModifier);json.forceActiveFocus();finishPaste(name);equal(name.text,"","Focus loss rejects paste")
                    helper(name,"paste-large-name.py");keyClick(Qt.Key_V,Qt.ControlModifier);finishPaste(name);equal(name.text,"","Oversized name rejected")
                    helper(json,"paste-json.py");keyClick(Qt.Key_V,Qt.ControlModifier);finishPaste(json)
                    equal(json.text,'{\n  "name": "two  spaces 日本語"\n}',"JSON whitespace retained")
                    json.selectAll();json.copy();json.deselect();check(json.text.length>0,"Copy API preserved")
                    helper(json,"paste-large-json.py");json.clear();keyClick(Qt.Key_V,Qt.ControlModifier);finishPaste(json);equal(json.text,"","Oversized JSON rejected")
                    json.text="é".repeat(17000);equal(json.text.length,16384,"JSON cap counts UTF-8 bytes")
                    json.text="line\n".repeat(40);json.cursorPosition=json.text.length;wait(40)
                    editor=findChild(json,"rice-native-editor");viewport=findChild(json,"rice-editor-viewport")
                    caret=editor.mapToItem(viewport,0,editor.cursorRectangle.y)
                    check(caret.y>=0 && caret.y+editor.cursorRectangle.height<=viewport.height+1,"Multiline caret scrolls into view")
                    helper(json,"paste-slow.py");json.clear();keyClick(Qt.Key_V,Qt.ControlModifier);json.visible=false;json.visible=true;finishPaste(json);equal(json.text,"","Hide rejects paste")
                    console.log("RICE_CLIPBOARD_NATIVE_PASS",passed);Qt.quit()
                } catch(e) { console.error("RICE_CLIPBOARD_NATIVE_FAIL",String(e),e.stack);Qt.quit() }
            }
        }
        Timer { interval:400;running:true;onTriggered:tests.run() }
    }
}
