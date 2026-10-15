// Bounded read-only adapter for the Omarchy 4.0.4 visual slot tree.
// Never returns host services, changes widget ownership, or mutates a slot.
function childrenOf(item) {
  var result = []
  if (!item) return result
  var children = item.children
  if (children) for (var i = 0; i < children.length; i++) result.push(children[i])
  return result
}
function collectSlots(content) {
  var result = [], remaining = 2048
  function visit(item, depth) {
    if (!item || depth > 16 || --remaining < 0 || item.objectName === "rice-bar-chrome") return
    if (typeof item.moduleName === "string" && typeof item.region === "string"
        && item.activeItem !== undefined) { result.push(item); return }
    var children = childrenOf(item)
    for (var i = 0; i < children.length; i++) visit(children[i], depth + 1)
  }
  visit(content, 0)
  return result
}
function record(slot, content) {
  if (!slot || !slot.activeItem || !slot.visible || !slot.activeItem.visible) return null
  var w = Number(slot.width), h = Number(slot.height)
  if (!(w > 0 && h > 0) || !isFinite(w + h)) return null
  var point
  try { point = slot.mapToItem(content, 0, 0) } catch (error) { return null }
  if (!point || !isFinite(point.x + point.y)) return null
  return { id: String(slot.moduleName), section: String(slot.region),
    x: Math.round(point.x), y: Math.round(point.y), width: Math.round(w), height: Math.round(h),
    visible: true, itemVisible: true, leaves: [] }
}
function trayLeaves(slot, content, vertical) {
  var result = [], budget = 256
  function visit(item, depth) {
    if (!item || depth > 10 || --budget < 0 || item.visible === false) return
    var w = Number(item.width), h = Number(item.height)
    if (w >= 20 && h >= 20 && Math.max(w,h) / Math.min(w,h) <= 1.65) {
      try {
        var p = item.mapToItem(content,0,0)
        var near = result.some(function(r) { return Math.abs((r.x+r.width/2)-(p.x+w/2)) < 14
          && Math.abs((r.y+r.height/2)-(p.y+h/2)) < 14 })
        if (!near) result.push({id:'omarchy.tray.'+result.length,section:slot.region,x:Math.round(p.x),y:Math.round(p.y),width:Math.round(w),height:Math.round(h),visible:true,itemVisible:true})
      } catch (error) {}
    }
    var kids = childrenOf(item)
    for(var i=0;i<kids.length;i++) visit(kids[i],depth+1)
  }
  visit(slot.activeItem,0)
  var parent = record(slot,content)
  if (!parent) return []
  return result.filter(function(r) {
    var overlapX=Math.min(r.x+r.width,parent.x+parent.width)-Math.max(r.x,parent.x)
    var overlapY=Math.min(r.y+r.height,parent.y+parent.height)-Math.max(r.y,parent.y)
    return overlapX>r.width*.4 && overlapY>r.height*.4
  })
}
function snapshot(content, vertical) {
  var slots=collectSlots(content), result=[]
  for(var i=0;i<slots.length;i++) {
    var r=record(slots[i],content)
    if (!r) continue
    if(r.id==='omarchy.tray') r.leaves=trayLeaves(slots[i],content,vertical)
    result.push(r)
  }
  return result
}
if(typeof module!=='undefined' && module.exports) module.exports={childrenOf:childrenOf,collectSlots:collectSlots,record:record,trayLeaves:trayLeaves,snapshot:snapshot}
