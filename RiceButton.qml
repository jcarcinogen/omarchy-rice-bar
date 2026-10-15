import QtQuick
import QtQuick.Controls as Controls
import qs.Commons

Controls.Button {
  id:root
  property bool selected:false
  implicitHeight:36
  implicitWidth:Math.max(80,label.implicitWidth+24)
  hoverEnabled:true
  Accessible.name:text
  contentItem:Text {
    id:label;text:root.text;textFormat:Text.PlainText
    font.family:Style.font.family;font.pixelSize:Style.font.bodySmall;font.bold:root.selected
    color:Color.popups.text;horizontalAlignment:Text.AlignHCenter;verticalAlignment:Text.AlignVCenter
    elide:Text.ElideRight
  }
  background:Rectangle {
    radius:6;color:root.down?Qt.alpha(Color.accent,0.24):root.hovered||root.selected?Qt.alpha(Color.accent,0.12):"transparent"
    border.width:root.activeFocus?2:1;border.color:root.activeFocus||root.selected?Color.accent:Qt.alpha(Color.popups.text,0.25)
  }
  opacity:enabled?1:0.4
}
