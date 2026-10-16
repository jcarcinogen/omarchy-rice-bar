import QtQuick
import Quickshell.Io
import qs.Commons

// Plain TextEdit avoids TextInput's eager clipboard payload retrieval on Qt
// 6.11.2. All supported paste requests go through a bounded external helper.
FocusScope {
    id: field
    property alias text: editor.text
    property alias cursorPosition: editor.cursorPosition
    readonly property int selectionStart: editor.selectionStart
    readonly property int selectionEnd: editor.selectionEnd
    property string placeholderText: ""
    property string accessibleName: ""
    property bool multiline: false
    property bool pasteAllowed: true
    property int maximumLength: 48
    readonly property int maximumBytes: multiline ? 32768 : 4096
    property string helperPath: decodeURIComponent(String(Qt.resolvedUrl("scripts/clipboard_safe_paste.py")).replace(/^file:\/\//, ""))
    readonly property bool pastePending: pasteProcess.running
    property int revision: 0
    property int requestedRevision: -1
    property int requestedStart: 0
    property int requestedEnd: 0
    signal pasteFailed(string message)
    implicitHeight: multiline ? 150 : 38
    activeFocusOnTab: true

    function selectAll() { editor.selectAll() }
    function deselect() { editor.deselect() }
    function copy() { editor.copy() }
    function clear() { editor.clear() }
    function boundedText(value) {
        if (!multiline) value = value.replace(/[\r\n\t\u2028\u2029]/g, " ").replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
        var result = "", bytes = 0
        for (var i = 0; i < value.length && result.length < maximumLength; i++) {
            var code = value.charCodeAt(i), part = value.charAt(i), size
            if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xDC00 && value.charCodeAt(i + 1) <= 0xDFFF) {
                part += value.charAt(++i); size = 4
            } else if (code >= 0xD800 && code <= 0xDFFF) continue
            else size = code < 0x80 ? 1 : code < 0x800 ? 2 : 3
            if (bytes + size > maximumBytes || result.length + part.length > maximumLength) break
            result += part; bytes += size
        }
        return result
    }
    onTextChanged: {
        revision++
        var clean = boundedText(text)
        if (clean !== text) {
            var position = cursorPosition
            text = clean
            cursorPosition = Math.min(position, text.length)
        }
    }
    onCursorPositionChanged: revision++
    onSelectionStartChanged: revision++
    onSelectionEndChanged: revision++
    onActiveFocusChanged: revision++
    onPasteAllowedChanged: revision++
    onEnabledChanged: revision++
    onVisibleChanged: revision++

    function requestPaste() {
        if (!pasteAllowed || !activeFocus || !enabled || !visible || pastePending) return
        requestedRevision = revision
        requestedStart = selectionStart
        requestedEnd = selectionEnd
        pasteProcess.running = true
    }
    function acceptPaste(reply, exitCode) {
        if (requestedRevision !== revision || !pasteAllowed || !activeFocus || !enabled || !visible) return
        var value
        try { value = JSON.parse(reply) } catch (_) { value = null }
        if (exitCode !== 0 || !value || value.ok !== true || typeof value.text !== "string") {
            pasteFailed("Paste skipped: clipboard unavailable, too large, or too slow.")
            return
        }
        var inserted = boundedText(value.text)
        var combined = text.slice(0, requestedStart) + inserted + text.slice(requestedEnd)
        // Reject overflow rather than silently altering a pasted JSON document.
        if (inserted !== (multiline ? value.text : value.text.replace(/[\r\n\t\u2028\u2029]/g, " ").replace(/[\u0000-\u001f\u007f-\u009f]/g, "")) || boundedText(combined) !== combined) {
            pasteFailed(multiline ? "Paste skipped: JSON is limited to 32 KiB." : "Paste skipped: look names are limited to 48 characters.")
            return
        }
        if (requestedEnd > requestedStart) editor.remove(requestedStart, requestedEnd)
        editor.insert(requestedStart, inserted)
        cursorPosition = requestedStart + inserted.length
    }
    Rectangle {
        anchors.fill: parent
        radius: 6
        color: Qt.alpha(Color.popups.text, 0.05)
        border.width: 1
        border.color: field.activeFocus ? Color.accent : Qt.alpha(Color.popups.text, 0.3)
    }
    Flickable {
        id: viewport
        objectName: "rice-editor-viewport"
        anchors.fill: parent
        anchors.margins: 9
        contentWidth: editor.width
        contentHeight: Math.max(height, editor.contentHeight)
        interactive: field.multiline && contentHeight > height
        clip: true
        function ensureCursorVisible() {
            var rect = editor.cursorRectangle
            if (field.multiline) {
                var y = contentY
                if (rect.y < y) y = rect.y
                if (rect.y + rect.height > y + height) y = rect.y + rect.height - height
                contentY = Math.max(0, Math.min(y, contentHeight - height))
            } else {
                var x = contentX
                if (rect.x < x) x = rect.x
                if (rect.x + rect.width > x + width) x = rect.x + rect.width - width
                contentX = Math.max(0, Math.min(x, contentWidth - width))
            }
        }
        onWidthChanged: ensureCursorVisible()
        TextEdit {
            id: editor
            objectName: "rice-native-editor"
            focus: true
            width: field.multiline ? viewport.width : Math.max(viewport.width, contentWidth + 2)
            height: Math.max(viewport.height, contentHeight)
            textFormat: TextEdit.PlainText
            wrapMode: field.multiline ? TextEdit.WrapAnywhere : TextEdit.NoWrap
            selectByMouse: true
            color: Color.popups.text
            selectionColor: Color.accent
            selectedTextColor: Color.popups.background
            font.family: Style.font.family
            font.pixelSize: field.multiline ? Style.font.caption : Style.font.bodySmall
            Accessible.name: field.accessibleName
            Accessible.description: field.multiline ? "Plain text JSON. Paste limited to 32 KiB and 1.5 seconds." : "Look name. Paste limited to 4 KiB, 48 characters and 1.5 seconds."
            onCursorRectangleChanged: viewport.ensureCursorVisible()
            onContentWidthChanged: viewport.ensureCursorVisible()
            onContentHeightChanged: viewport.ensureCursorVisible()
            Keys.priority: Keys.BeforeItem
            Keys.onPressed: function(event) {
                if (event.matches(StandardKey.Paste) || (event.key === Qt.Key_Insert && (event.modifiers & Qt.ShiftModifier))) {
                    event.accepted = true
                    field.requestPaste()
                } else if (!field.multiline && (event.key === Qt.Key_Return || event.key === Qt.Key_Enter)) event.accepted = true
            }
        }
    }
    Text {
        x: 9; y: 9
        visible: field.text.length === 0 && !editor.inputMethodComposing
        text: field.placeholderText
        textFormat: Text.PlainText
        color: Qt.alpha(Color.popups.text, 0.6)
        font: editor.font
    }
    // Plain TextEdit has no Controls context menu. Block native primary-selection
    // paste and external drops; normal left-button selection is unchanged.
    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.MiddleButton | Qt.RightButton
        onPressed: function(mouse) { mouse.accepted = true }
        onReleased: function(mouse) { mouse.accepted = true }
    }
    DropArea {
        anchors.fill: parent
        onEntered: function(drag) { drag.accepted = false }
        onDropped: function(drop) { drop.accepted = false }
    }
    Process {
        id: pasteProcess
        objectName: "rice-safe-paste-process"
        command: ["python3", field.helperPath, "--max-bytes", String(field.maximumBytes)]
        stdout: StdioCollector { id: pasteOutput; waitForEnd: true }
        stderr: StdioCollector { waitForEnd: true }
        onExited: function(exitCode) { field.acceptPaste(pasteOutput.text, exitCode) }
    }
}
