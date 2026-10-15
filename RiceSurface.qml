import QtQuick
import QtQuick.Shapes

// Identical, input-free chrome in the live bar and gallery. Interior paint is
// supplied contrast-safe; decorative edges never recolor the text area.
Item {
  id: root
  property string preset: "islands"
  property color surfaceColor: "transparent"
  property color themeBorderColor: "transparent"
  property color accentColor: "transparent"
  property color foregroundColor: "transparent"
  property real cornerRadius: 12
  property bool borderEnabled: true
  property bool vertical: false
  property bool reducedMotion: true
  property int sectionIndex: 0
  readonly property bool angular: preset==="powerline"||preset==="pixel"||preset==="ribbon"
  readonly property bool sparse: preset==="rail"||preset==="minimal"||preset==="bracket"
  readonly property real curve: Math.max(0,Math.min(cornerRadius,width/2,height/2))
  readonly property real edge: borderEnabled?(preset==="outline"?2:1):0
  property real decorationOpacity: borderEnabled?1:0
  Behavior on decorationOpacity {enabled:!root.reducedMotion;NumberAnimation{duration:120}}
  clip:true
  visible:preset!=="omarchy"

  function polygon(inset) {
    var x=inset,y=inset,w=Math.max(0,width-inset*2),h=Math.max(0,height-inset*2)
    var cut=Math.max(1,Math.min(w/5,h/3,3+cornerRadius/3))
    var points=[]
    if(preset==="pixel") {
      var step=Math.floor(cut)
      points=[[step,0],[w-step,0],[w-step,step],[w,step],[w,h-step],[w-step,h-step],[w-step,h],[step,h],[step,h-step],[0,h-step],[0,step],[step,step],[step,0]]
    } else if(preset==="ribbon") {
      points=vertical?[[0,0],[w/2,cut],[w,0],[w,h],[w/2,h-cut],[0,h],[0,0]]
        :[[0,0],[w,0],[w-cut,h/2],[w,h],[0,h],[cut,h/2],[0,0]]
    } else {
      points=vertical?[[0,cut],[w/2,0],[w,cut],[w,h-cut],[w/2,h],[0,h-cut],[0,cut]]
        :[[cut,0],[w-cut,0],[w,h/2],[w-cut,h],[cut,h],[0,h/2],[cut,0]]
    }
    return points.map(function(p){return Qt.point(p[0]+x,p[1]+y)})
  }
  Rectangle {
    id:baseSurface
    anchors.fill:parent
    visible:!root.angular
    color:"transparent"
    radius:root.sparse?Math.min(root.curve,6):root.curve
    border.width:root.sparse?0:root.edge
    border.color:root.themeBorderColor
    Rectangle {
      anchors.fill:parent
      anchors.margins:baseSurface.border.width
      color:root.surfaceColor
      radius:Math.max(0,baseSurface.radius-baseSurface.border.width)
    }
  }
  Shape {
    anchors.fill:parent
    visible:root.angular
    antialiasing:root.preset!=="pixel"
    ShapePath {
      strokeColor:root.themeBorderColor
      strokeWidth:root.edge
      fillColor:root.surfaceColor
      joinStyle:ShapePath.MiterJoin
      PathPolyline {path:root.polygon(Math.max(0.5,root.edge/2))}
    }
  }
  Shape {
    anchors.fill:parent
    visible:root.preset==="pixel"&&root.borderEnabled
    ShapePath {strokeWidth:1;strokeColor:root.themeBorderColor;fillColor:"transparent";joinStyle:ShapePath.MiterJoin
      PathPolyline {path:root.polygon(3)}
    }
  }
  Repeater {
    model:root.preset==="glow"&&root.borderEnabled?2:0
    delegate:Rectangle {
      required property int index
      anchors.fill:parent;anchors.margins:2+index*2
      color:"transparent";radius:Math.max(0,root.curve-anchors.margins)
      border.width:1;border.color:root.themeBorderColor
      opacity:(index===0?0.38:0.17)*root.decorationOpacity
    }
  }
  Rectangle {
    visible:root.preset==="glass"&&root.borderEnabled
    x:Math.max(4,root.curve/2);y:2;width:Math.max(0,parent.width-x*2);height:1
    color:root.themeBorderColor;opacity:0.55*root.decorationOpacity
  }
  Item {
    anchors.fill:parent;anchors.margins:2
    visible:root.preset==="bevel"&&root.borderEnabled
    opacity:root.decorationOpacity
    Rectangle{x:0;y:0;width:parent.width;height:2;color:Qt.lighter(root.themeBorderColor,1.35)}
    Rectangle{x:0;y:0;width:2;height:parent.height;color:Qt.lighter(root.themeBorderColor,1.35)}
    Rectangle{x:0;y:parent.height-2;width:parent.width;height:2;color:Qt.darker(root.themeBorderColor,1.7)}
    Rectangle{x:parent.width-2;y:0;width:2;height:parent.height;color:Qt.darker(root.themeBorderColor,1.7)}
  }
  Rectangle {
    visible:root.preset==="ribbon"&&root.borderEnabled
    x:root.vertical?2:8;y:root.vertical?8:2
    width:root.vertical?2:Math.max(0,parent.width-16)
    height:root.vertical?Math.max(0,parent.height-16):2
    color:root.themeBorderColor;opacity:(0.5+0.2*(root.sectionIndex%3))*root.decorationOpacity
  }
  Rectangle {
    visible:(root.preset==="rail"||root.preset==="minimal")&&root.borderEnabled
    x:root.vertical?parent.width-2:0;y:root.vertical?0:parent.height-2
    width:root.vertical?2:parent.width;height:root.vertical?parent.height:2
    radius:Math.min(root.curve,1);color:root.themeBorderColor
  }
  Repeater {
    model:root.preset==="bracket"&&root.borderEnabled?4:0
    delegate:Item {
      required property int index
      readonly property real length:Math.min(9,root.width/4,root.height/3)
      x:index%2===0?0:root.width-length;y:index<2?0:root.height-length
      width:length;height:length
      Rectangle{x:0;y:parent.index<2?0:parent.height-2;width:parent.width;height:2;radius:Math.min(root.curve,1);color:root.themeBorderColor}
      Rectangle{x:parent.index%2===0?0:parent.width-2;y:0;width:2;height:parent.height;radius:Math.min(root.curve,1);color:root.themeBorderColor}
    }
  }
}
