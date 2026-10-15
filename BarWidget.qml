import QtQuick
import Quickshell
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.jcarcinogen.rice-bar"
  property var service: null
  property var chrome: null
  property var panelItem: null
  property bool pendingOpen: false
  readonly property bool opened: panelItem ? panelItem.opened === true : false
  readonly property bool popoutSwitchClosing: panelItem ? panelItem.popoutSwitchClosing === true : false
  readonly property bool showIcon: !service || service.showIcon

  function open() { pendingOpen=true;panelLoader.active=true;if(panelItem){panelItem.open();pendingOpen=false} }
  function close() { pendingOpen=false;if(panelItem)panelItem.close() }
  function togglePanel() { if(opened||pendingOpen)close();else open() }
  function closeForPopoutSwitch() { if(panelItem)panelItem.closeForPopoutSwitch() }
  function injectPanel() {
    if(!panelLoader.item)return
    panelItem=panelLoader.item
    panelItem.bar=root.bar;panelItem.settings=root.settings;panelItem.anchorItem=root
    panelItem.hostWidget=root;panelItem.service=root.service
    if(pendingOpen){pendingOpen=false;Qt.callLater(panelItem.open)}
  }
  function attach() {
    if(!bar || !bar.shell)return
    var next=bar.shell.serviceFor(moduleName)
    if(next!==service) {
      if(service)service.detach(root)
      service=next
      if(service)service.attach(root)
      injectPanel()
    }
    var window=root.QsWindow.window
    if(window&&window.contentItem&&service&&!chrome)
      chrome=chromeComponent.createObject(window.contentItem,{hostWindow:window,facade:bar,service:service})
    if(chrome){chrome.facade=bar;chrome.service=service}
  }
  function uiState(){return panelItem?panelItem.uiState():{opened:false}}
  function diagnostics(){return chrome?chrome.diagnostics():{screen:"",position:bar?bar.position:"",supported:false,hidden:false,stockTransparent:false,geometryCount:0,surfaceCount:0}}
  implicitWidth:showIcon?button.implicitWidth:0
  implicitHeight:showIcon?button.implicitHeight:0
  onBarChanged: { injectPanel();Qt.callLater(root.attach) }
  onSettingsChanged: { if(service)service.receiveSettings(root.settings);injectPanel() }
  Component.onCompleted:Qt.callLater(root.attach)
  Component.onDestruction: { if(chrome)chrome.destroy();if(service)service.detach(root) }
  Timer { interval:1000;running:true;repeat:true;onTriggered:root.attach() }
  Component { id:chromeComponent;RiceChrome{} }
  Loader { id:panelLoader;active:false;source:Qt.resolvedUrl("RicePanel.qml");visible:false;onLoaded:root.injectPanel() }
  BarIconButton {
    id:button
    anchors.fill:parent
    visible:root.showIcon
    bar:root.bar
    text:"󰟪"
    tooltipText:root.opened?"Close Rice Bar styles":"Rice Bar — style gallery"
    onPressed:function(mouseButton){if(mouseButton===Qt.LeftButton)root.togglePanel()}
  }
}
