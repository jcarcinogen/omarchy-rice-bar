import QtQuick
import qs.Commons
import "RiceModel.js" as RiceModel

Item {
  id:root
  property string preset:"islands"
  property real opacityValue:92
  property real radiusValue:12
  property real gapValue:4
  property bool borderEnabled:true
  property bool reducedMotion:true
  readonly property var plan:RiceModel.fixedForegroundPlan(RiceModel.styleSurface(Color.bar.background,Color.accent,preset),Color.bar.text,RiceModel.visibleAlpha(opacityValue,0.32))
  readonly property color base:plan.surface
  readonly property color fill:Qt.rgba(base.r,base.g,base.b,plan.alpha)
  readonly property color edge:Color.flatColor(Color.pick("hyprland.active-border",Color.accent),Color.accent)
  implicitWidth:280
  implicitHeight:58
  Accessible.name:"Rice Bar "+preset+" preview"
  clip:true
  Rectangle{anchors.fill:parent;color:Color.bar.background;opacity:root.preset==="omarchy"?1:0.2}
  Repeater {
    model:root.preset==="pills"?7:3
    delegate:Item {
      id:group
      required property int index
      readonly property int count:root.preset==="pills"?7:3
      readonly property real gap:Math.min(10,root.gapValue/2+3)
      x:4+index*((root.width-8+gap)/count)
      y:Math.max(6,(root.height-30)/2)
      width:Math.max(0,(root.width-8-gap*(count-1))/count)
      height:Math.min(30,root.height-12)
      RiceSurface {
        anchors.fill:parent;preset:root.preset
        surfaceColor:root.fill;themeBorderColor:root.edge;accentColor:Color.accent;foregroundColor:Color.bar.text
        cornerRadius:root.radiusValue;borderEnabled:root.borderEnabled;reducedMotion:root.reducedMotion;sectionIndex:group.index
      }
      Row {
        anchors.centerIn:parent;spacing:3
        Repeater {
          model:group.count===7?1:3
          Rectangle {required property int index;width:index===1?Math.min(13,group.width/5):3;height:4;radius:1;color:Color.bar.text}
        }
      }
    }
  }
}
