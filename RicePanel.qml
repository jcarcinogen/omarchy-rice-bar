pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as Controls
import Quickshell.Io
import qs.Commons
import qs.Ui
import "RiceModel.js" as RiceModel
import "LooksModel.js" as LooksModel

Panel {
  id:root
  moduleName:"io.github.jcarcinogen.rice-bar"
  ipcTarget:"rice-bar"
  manageIpc:false
  property var anchorItem:null
  property var hostWidget:null
  property var service:null
  property int page:0
  property string selectedLook:""
  property string notice:""
  property string diagnosticText:""
  readonly property var barIdentity:hostWidget||root
  readonly property var live:service?service.live:RiceModel.snapshot(settings)
  readonly property bool appearanceControlsEnabled:live.preset!=="omarchy"
  readonly property color foreground:Color.popups.text
  readonly property string fontFamily:Style.font.family
  readonly property var looks:service?service.savedLooks:[]
  readonly property var styles:[
    {value:"omarchy",label:"Default",detail:"The unmodified stock bar"},
    {value:"islands",label:"Islands",detail:"Rounded section cards"},
    {value:"pills",label:"Pills",detail:"Individual widget capsules"},
    {value:"material",label:"Material",detail:"Soft tonal section cards"},
    {value:"outline",label:"Outline",detail:"Crisp double-weight edges"},
    {value:"rail",label:"Rail",detail:"Continuous inner-edge line"},
    {value:"bracket",label:"Bracket",detail:"Technical corner accents"},
    {value:"glow",label:"Glow",detail:"Layered accent rings"},
    {value:"powerline",label:"Powerline",detail:"Classic angular sections"},
    {value:"mono",label:"Mono",detail:"Restrained, squared cards"},
    {value:"minimal",label:"Minimal",detail:"Quiet section underlines"},
    {value:"glass",label:"Glass",detail:"Translucency and a fine rim"},
    {value:"pixel",label:"Pixel",detail:"Stepped retro double edges"},
    {value:"bevel",label:"Bevel",detail:"Raised, theme-colored edges"},
    {value:"ribbon",label:"Ribbon",detail:"Notched sections and trim"}
  ]
  onLooksChanged: {
    if(!selectedAppearance())selectedLook=""
    // Host Dropdown writes its own value on selection; resync after CRUD.
    if(lookPicker)lookPicker.value=selectedLook||(looks.length?"Choose a saved look":"No saved looks yet")
  }
  function styleLabel(value){for(var i=0;i<styles.length;i++)if(styles[i].value===value)return styles[i].label;return value}
  function selectPreset(value){if(service)service.selectPreset(value)}
  function persistAppearance(values){if(service)service.appearance(values)}
  function selectedAppearance(){for(var i=0;i<looks.length;i++)if(looks[i].id===selectedLook)return looks[i].appearance;return null}
  function report(ok,message){notice=ok?message:(service?service.lastError:"Service unavailable")}
  function uiState(){
    var cards=[],tabs=[]
    for(var i=0;i<galleryRepeater.count;i++){var c=galleryRepeater.itemAt(i);if(c){var p=c.mapToItem(null,c.width/2,c.height/2);cards.push({style:c.modelData.value,x:p.x,y:p.y,width:c.width,height:c.height})}}
    for(var j=0;j<tabRepeater.count;j++){var t=tabRepeater.itemAt(j);if(t){var q=t.mapToItem(null,t.width/2,t.height/2);tabs.push({page:j,x:q.x,y:q.y})}}
    var controls=[]
    function visit(item,depth){
      if(!item||!item.visible||depth>12)return
      if((typeof item.clicked==="function"&&typeof item.text==="string")||String(item.objectName||"").indexOf("rice-")===0){
        var point=item.mapToItem(null,item.width/2,item.height/2)
        controls.push({name:String(item.objectName||item.text||""),x:point.x,y:point.y,width:item.width,height:item.height,enabled:item.enabled,focused:item.activeFocus})
      }
      var kids=item.children||[];for(var k=0;k<kids.length;k++)visit(kids[k],depth+1)
    }
    visit(body,0)
    return {opened:opened,page:page,x:panel.cardOrigin.x,y:panel.cardOrigin.y,width:panel.contentWidth,height:panel.contentHeight,cards:cards,tabs:tabs,controls:controls}
  }
  function refreshDiagnostics(){
    if(!service){diagnosticText="Service unavailable";return}
    var state=service.statusObject()
    diagnosticText="Status: "+state.reason+"\nAdapter: "+state.adapter+"\nPainted surfaces: "+state.surfaceCount
    state.displays.forEach(function(d){diagnosticText+="\n"+d.screen+" · "+d.position+" · "+d.geometryCount+" widgets · contrast "+Number(d.contrast||0).toFixed(2)+":1"})
    if(state.error)diagnosticText+="\n"+state.error
  }
  function open(){root.controller.show();refreshDiagnostics()}
  function close(){root.controller.hide()}
  function toggle(){opened?close():open()}
  function menuAction(action){
    if(menuProcess.running)return
    menuProcess.command=["python3",decodeURIComponent(Qt.resolvedUrl("scripts/menu-access.py").toString().replace(/^file:\/\//,"")),action]
    menuProcess.running=true
  }
  Process {
    id:menuProcess
    stdout:StdioCollector {onStreamFinished:if(text.trim())root.notice=text.trim()}
    stderr:StdioCollector {onStreamFinished:if(text.trim())root.notice=text.trim()}
  }
  KeyboardPanel {
    id:panel
    anchorItem:root.anchorItem;owner:root.barIdentity;bar:root.bar;open:root.opened
    focusTarget:keyCatcher
    contentWidth:panel.fittedContentWidth(Style.space(650))
    contentHeight:panel.fittedContentHeight(body.implicitHeight)
    FocusScope {
      id:keyCatcher
      Shortcut { sequence:"Escape";enabled:root.opened;onActivated:root.close() }
      anchors.fill:parent
      focus:true
      Keys.onEscapePressed:root.close()
      // Standard controls keep native Tab, Space, arrows, and text editing.
      Flickable {
        id:scroll
        anchors.fill:parent;contentWidth:width;contentHeight:body.implicitHeight
        clip:true;interactive:contentHeight>height;boundsBehavior:Flickable.StopAtBounds
        Column {
          id:body
          width:parent.width;spacing:12
          RowLayout {
            width:parent.width
            Text{text:"󰟪  Rice Bar";color:root.foreground;font.family:root.fontFamily;font.pixelSize:Style.font.title;font.bold:true;Layout.fillWidth:true}
            RiceButton{text:"Undo";enabled:root.service&&root.service.undoStack.length>0;onClicked:root.service.undo()}
            RiceButton{text:"Redo";enabled:root.service&&root.service.redoStack.length>0;onClicked:root.service.redo()}
          }
          Text{width:parent.width;text:"Your Omarchy theme. Your stock widgets. A different finish.";wrapMode:Text.WordWrap;color:root.foreground;font.family:root.fontFamily;font.pixelSize:Style.font.caption}
          RowLayout {
            width:parent.width;spacing:6
            Repeater {
              id:tabRepeater
              model:["Styles","Customize","Saved & share","Settings"]
              RiceButton{required property string modelData;required property int index;text:modelData;selected:root.page===index;Layout.fillWidth:true;onClicked:{root.page=index;scroll.contentY=0}}
            }
          }
          Text{width:parent.width;visible:text.length>0;text:root.service&&root.service.lastError?root.service.lastError:root.notice;textFormat:Text.PlainText;wrapMode:Text.WordWrap;color:root.foreground;font.family:root.fontFamily;font.pixelSize:Style.font.caption}
          Column {
            width:parent.width;spacing:10;visible:root.page===0
            Text{width:parent.width;text:"Choose a look to apply it instantly. Undo restores the previous look.";wrapMode:Text.WordWrap;color:root.foreground;font.pixelSize:Style.font.caption}
            Grid {
              id:gallery
              width:parent.width;columns:width<480?2:3;spacing:8
              Repeater {
                id:galleryRepeater
                model:root.styles
                Controls.AbstractButton {
                  id:card
                  required property var modelData
                  readonly property var profile:RiceModel.snapshot(RiceModel.switchPreset(root.service?root.service.pluginEntry:root.settings,modelData.value))
                  width:(gallery.width-gallery.spacing*(gallery.columns-1))/gallery.columns;height:104
                  hoverEnabled:true
                  Accessible.name:modelData.label+" style. "+modelData.detail
                  Accessible.role:Accessible.Button
                  onClicked:root.selectPreset(modelData.value)
                  background:Rectangle{radius:8;color:card.hovered?Qt.alpha(Color.accent,0.08):"transparent";border.width:card.activeFocus||root.live.preset===card.modelData.value?2:1;border.color:card.activeFocus||root.live.preset===card.modelData.value?Color.accent:Qt.alpha(root.foreground,0.2)}
                  contentItem:Column {
                    spacing:2
                    RiceStylePreview{width:parent.width;height:54;preset:card.modelData.value;opacityValue:card.profile.opacity;radiusValue:card.profile.radius;gapValue:card.profile.gap;borderEnabled:card.profile.border;reducedMotion:!root.service||root.service.reducedMotion}
                    Text{width:parent.width;text:(root.live.preset===card.modelData.value?"✓ ":"")+card.modelData.label;color:root.foreground;font.family:root.fontFamily;font.bold:true;font.pixelSize:Style.font.bodySmall;horizontalAlignment:Text.AlignHCenter}
                    Text{width:parent.width;text:card.modelData.detail;color:root.foreground;font.family:root.fontFamily;font.pixelSize:Style.font.caption;horizontalAlignment:Text.AlignHCenter;elide:Text.ElideRight}
                  }
                  Controls.ToolTip.visible:hovered
                  Controls.ToolTip.text:modelData.detail
                }
              }
            }
            Text{width:parent.width;text:"Previews follow your live theme. Glass is translucency, not blur. Readability may raise the effective opacity.";wrapMode:Text.WordWrap;color:root.foreground;font.pixelSize:Style.font.caption}
          }
          Column {
            width:parent.width;spacing:12;visible:root.page===1
            Text{text:root.styleLabel(root.live.preset);color:root.foreground;font.pixelSize:Style.font.title;font.bold:true}
            RiceStylePreview{width:parent.width;height:80;preset:root.live.preset;opacityValue:root.live.opacity;radiusValue:root.live.radius;gapValue:root.live.gap;borderEnabled:root.live.border}
            Repeater {
              model:[{key:"opacity",label:"Surface opacity",min:20,max:100,suffix:"%"},{key:"radius",label:"Corner radius",min:0,max:24,suffix:" px"},{key:"gap",label:"Breathing room",min:0,max:24,suffix:" px"}]
              Column {
                id:settingRow
                required property var modelData
                width:parent.width;spacing:5
                Text{text:settingRow.modelData.label+"  "+root.live[settingRow.modelData.key]+settingRow.modelData.suffix;color:root.foreground;font.pixelSize:Style.font.bodySmall}
                Controls.Slider {
                  id:slider
                  objectName:"rice-slider-"+settingRow.modelData.key
                  width:parent.width;height:32;implicitHeight:32;from:settingRow.modelData.min;to:settingRow.modelData.max;stepSize:1
                  value:root.live[settingRow.modelData.key];enabled:root.appearanceControlsEnabled
                  Accessible.name:settingRow.modelData.label
                  onMoved:{var values={};values[settingRow.modelData.key]=Math.round(value);root.persistAppearance(values)}
                  background:Rectangle{x:slider.leftPadding;y:slider.topPadding+slider.availableHeight/2-2;width:slider.availableWidth;height:4;radius:2;color:Qt.alpha(root.foreground,0.2);Rectangle{width:slider.visualPosition*parent.width;height:parent.height;color:Color.accent;radius:2}}
                  handle:Rectangle{x:slider.leftPadding+slider.visualPosition*(slider.availableWidth-width);y:slider.topPadding+slider.availableHeight/2-height/2;width:18;height:18;radius:9;color:Color.accent;border.width:slider.activeFocus?2:0;border.color:root.foreground}
                }
              }
            }
            RiceButton{width:parent.width;text:root.live.border?"✓ Accent borders on":"Accent borders off";enabled:root.appearanceControlsEnabled;onClicked:root.persistAppearance({border:!root.live.border})}
            RiceButton{width:parent.width;text:"Restore "+root.styleLabel(root.live.preset)+" defaults";enabled:root.appearanceControlsEnabled;onClicked:root.service.resetStyle()}
            Text{width:parent.width;text:"Values are remembered separately for each style. Geometry changes are immediate so chrome stays aligned with the stock widgets. Default leaves the stock bar untouched.";wrapMode:Text.WordWrap;color:root.foreground;font.pixelSize:Style.font.caption}
          }
          Column {
            width:parent.width;spacing:10;visible:root.page===2
            Dropdown {
              id:lookPicker;objectName:"rice-look-picker"
              enabled:root.looks.length>0
              width:parent.width;label:"Saved looks";fontFamily:root.fontFamily
              options:root.looks.map(function(look){return {value:look.id,label:look.name}})
              value:root.selectedLook||(root.looks.length?"Choose a saved look":"No saved looks yet")
              onChanged:function(value){root.selectedLook=value;for(var i=0;i<root.looks.length;i++)if(root.looks[i].id===value)nameField.text=root.looks[i].name}
            }
            RiceTextEditor {
              id:nameField;objectName:"rice-look-name";width:parent.width;height:38
              placeholderText:"Name this look";maximumLength:48;accessibleName:"Look name"
              pasteAllowed:root.opened&&root.page===2
              onPasteFailed:function(message){root.notice=message}
            }
            RowLayout {
              width:parent.width
              RiceButton{text:"Save new";Layout.fillWidth:true;onClicked:root.report(root.service.saveLook(nameField.text,""),"Saved a new look")}
              RiceButton{text:"Apply";Layout.fillWidth:true;enabled:!!root.selectedAppearance();onClicked:root.report(root.service.applyLook(root.selectedAppearance()),"Applied saved look")}
              RiceButton{text:"Update";Layout.fillWidth:true;enabled:!!root.selectedAppearance();onClicked:root.report(root.service.saveLook(nameField.text,root.selectedLook),"Updated saved look")}
            }
            RowLayout {
              width:parent.width
              RiceButton{text:"Rename";Layout.fillWidth:true;enabled:!!root.selectedAppearance();onClicked:root.report(root.service.renameLook(root.selectedLook,nameField.text),"Renamed saved look")}
              RiceButton{text:"Delete";Layout.fillWidth:true;enabled:!!root.selectedAppearance();onClicked:root.report(root.service.removeLook(root.selectedLook),"Deleted saved look — Undo is available")}
            }
            Text{width:parent.width;text:"Share portable JSON, not executable theme code. Import saves a new look without applying it. Save new also duplicates your current look.";wrapMode:Text.WordWrap;color:root.foreground;font.pixelSize:Style.font.caption}
            RiceTextEditor {
              id:shareText;objectName:"rice-share-json";width:parent.width;height:150
              multiline:true;maximumLength:32768
              placeholderText:"Paste a Rice Bar look here (32 KiB maximum)";accessibleName:"Import or export look JSON"
              pasteAllowed:root.opened&&root.page===2
              onPasteFailed:function(message){root.notice=message}
            }
            RowLayout {
              width:parent.width
              RiceButton{text:"Copy current look";Layout.fillWidth:true;onClicked:{shareText.text=root.service.exportLook(nameField.text||"My Rice Bar look");shareText.selectAll();shareText.copy();shareText.deselect();root.notice="Look JSON copied"}}
              RiceButton{text:"Import look";Layout.fillWidth:true;onClicked:root.report(root.service.importLook(shareText.text),"Imported into Saved looks")}
            }
          }
          Column {
            width:parent.width;spacing:10;visible:root.page===3
            RiceButton{width:parent.width;text:root.service&&root.service.reducedMotion?"✓ Reduced motion":"Decorative transitions enabled";onClicked:root.service.preference("reducedMotion",!root.service.reducedMotion)}
            RiceButton{width:parent.width;text:root.service&&root.service.showIcon?"✓ Rice bowl icon visible":"Rice bowl icon hidden";onClicked:root.service.preference("showIcon",!root.service.showIcon)}
            Text{width:parent.width;text:"The bar entry stays installed even with its icon hidden. Add the menu shortcut below, or reopen with: omarchy-shell rice-bar open";textFormat:Text.PlainText;wrapMode:Text.WordWrap;color:root.foreground;font.pixelSize:Style.font.caption}
            RowLayout {
              width:parent.width
              RiceButton{text:"Add menu shortcut";Layout.fillWidth:true;enabled:!menuProcess.running;onClicked:root.menuAction("install")}
              RiceButton{text:"Remove shortcut";Layout.fillWidth:true;enabled:!menuProcess.running;onClicked:root.menuAction("remove")}
            }
            RiceButton{width:parent.width;text:root.service&&root.service.pluginEntry.themeFollow===true?"✓ Follow linked theme palettes":"Theme-linked looks off";onClicked:root.service.preference("themeFollow",root.service.pluginEntry.themeFollow!==true)}
            RowLayout {
              width:parent.width
              RiceButton{text:"Link current look";Layout.fillWidth:true;onClicked:root.report(root.service.linkTheme(),"Current look linked to this theme palette")}
              RiceButton{text:"Unlink palette";Layout.fillWidth:true;onClicked:root.report(root.service.unlinkTheme(),"Removed this palette link")}
            }
            Text{width:parent.width;text:"Links use the theme's colors, not its name. Themes with identical palettes share a link. Unlinked palettes keep your current style. Omarchy's transparency toggle pauses Rice Bar chrome instead of fighting your choice.";wrapMode:Text.WordWrap;color:root.foreground;font.pixelSize:Style.font.caption}
            RiceButton{width:parent.width;text:"Refresh diagnostics";onClicked:root.refreshDiagnostics()}
            Text{width:parent.width;text:root.diagnosticText;textFormat:Text.PlainText;wrapMode:Text.WrapAnywhere;color:root.foreground;font.family:root.fontFamily;font.pixelSize:Style.font.caption}
          }
        }
      }
    }
  }
}
