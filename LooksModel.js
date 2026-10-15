// Portable data only: no paths, commands, colors, or executable theme code.
var STYLES=["omarchy","islands","pills","material","outline","rail","bracket","glow","powerline","mono","minimal","glass","pixel","bevel","ribbon"]
var serial=0
function safeKey(key){return typeof key==="string"&&key.length>0&&key.length<=96&&["__proto__","prototype","constructor"].indexOf(key)<0}
function object(value){return value!==null&&typeof value==="object"&&!Array.isArray(value)}
function own(value,key){return object(value)&&Object.prototype.hasOwnProperty.call(value,key)}
function clone(value,depth){
  depth=depth||0
  if(depth>32)throw new Error("Settings nesting is too deep")
  if(value===null||typeof value!=="object")return value
  var out=Array.isArray(value)?[]:{}
  Object.keys(value).forEach(function(key){if(safeKey(key))out[key]=clone(value[key],depth+1)})
  return out
}
function nameValue(value){
  if(typeof value!=="string"||/[\x00-\x1f\x7f-\x9f]/.test(value))return null
  var name=value.trim();return name.length>0&&name.length<=48?name:null
}
function appearanceValue(value){
  if(!object(value)||!own(value,"preset")||STYLES.indexOf(value.preset)<0)return null
  var ranges={opacity:[20,100],radius:[0,24],gap:[0,24]}
  for(var key in ranges){var n=value[key];if(!own(value,key)||typeof n!=="number"||!isFinite(n)||n%1!==0||n<ranges[key][0]||n>ranges[key][1])return null}
  if(!own(value,"border")||typeof value.border!=="boolean")return null
  return {preset:value.preset,opacity:value.opacity,radius:value.radius,gap:value.gap,border:value.border}
}
function normalizeLooks(settings){
  var source=object(settings)&&object(settings.looks)?settings.looks:{}, result=[]
  Object.keys(source).slice(0,32).forEach(function(id){
    var row=source[id],name=object(row)?nameValue(row.name):null,appearance=object(row)?appearanceValue(row.appearance):null
    if(safeKey(id)&&name&&appearance)result.push({id:id,name:name,appearance:appearance})
  });return result
}
function lookMap(settings){var map={};normalizeLooks(settings).forEach(function(row){map[row.id]={name:row.name,appearance:row.appearance}});return map}
function failure(message){return {ok:false,error:message}}
function uniqueId(map){var id;do{id="look-"+Date.now().toString(36)+"-"+(++serial).toString(36)}while(own(map,id));return id}
function saveLook(settings,name,appearance,id){
  name=nameValue(name);appearance=appearanceValue(appearance)
  if(!name)return failure("Use a name of 1–48 characters, without control characters")
  if(!appearance)return failure("Invalid style or appearance values")
  var map=lookMap(settings),target=id||uniqueId(map)
  if(!safeKey(target))return failure("Invalid look identifier")
  if(id&&!own(map,id))return failure("Saved look no longer exists")
  if(!own(map,target)&&Object.keys(map).length>=32)return failure("The 32-look limit has been reached")
  map[target]={name:name,appearance:appearance}
  var next=clone(settings||{});next.looks=map
  return {ok:true,settings:next,id:target,name:name,appearance:appearance}
}
function deleteLook(settings,id){
  var map=lookMap(settings);if(!safeKey(id)||!own(map,id))return failure("Saved look no longer exists")
  delete map[id];var next=clone(settings||{});next.looks=map;return {ok:true,settings:next,id:id}
}
function renameLook(settings,id,name){var map=lookMap(settings);if(!safeKey(id)||!own(map,id))return failure("Saved look no longer exists");return saveLook(settings,name,map[id].appearance,id)}
function exportLook(appearance,name){
  var a=appearanceValue(appearance),n=nameValue(name)
  if(!a||!n)return ""
  return JSON.stringify({format:"rice-bar-look",version:1,name:n,appearance:a},null,2)
}
function importLook(settings,text){
  if(typeof text!=="string"||text.length>32768)return failure("Look must be JSON no larger than 32 KiB")
  // UTF-8 size, not UTF-16 code units. Bound before parsing or cloning settings.
  var bytes=0;for(var i=0;i<text.length;i++){var c=text.charCodeAt(i);bytes+=c<128?1:c<2048?2:3;if(c>=0xd800&&c<=0xdbff&&i+1<text.length){var low=text.charCodeAt(i+1);if(low>=0xdc00&&low<=0xdfff){bytes++;i++}}}
  if(bytes>32768)return failure("Look must be JSON no larger than 32 KiB")
  var value;try{value=JSON.parse(text)}catch(error){return failure("Invalid JSON — nothing was changed")}
  if(!object(value)||value.format!=="rice-bar-look"||value.version!==1)return failure("Unsupported look format or version")
  return saveLook(settings,value.name,value.appearance,"")
}
function themeKey(colors){
  if(!Array.isArray(colors)||!colors.length)return ""
  var values=[]
  for(var i=0;i<Math.min(colors.length,4);i++){
    var color=String(colors[i]).toLowerCase()
    if(!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(color))return ""
    values.push(color.slice(1))
  }return "palette-"+values.join("-")
}
function validThemeKey(key){return typeof key==="string"&&/^palette-[0-9a-f]{6,8}(-[0-9a-f]{6,8}){0,3}$/.test(key)}
function themeMap(settings){
  var map={},source=object(settings)&&object(settings.themeLooks)?settings.themeLooks:{}
  Object.keys(source).slice(0,32).forEach(function(key){var app=appearanceValue(source[key]);if(validThemeKey(key)&&app)map[key]=app});return map
}
function linkTheme(settings,key,appearance){
  var app=appearanceValue(appearance);if(!validThemeKey(key)||!app)return failure("Current palette is unavailable")
  var map=themeMap(settings)
  if(!own(map,key)&&Object.keys(map).length>=32)return failure("The 32-palette limit has been reached")
  map[key]=app;var next=clone(settings||{});next.themeLooks=map;return {ok:true,settings:next}
}
function unlinkTheme(settings,key){
  var map=themeMap(settings);if(!validThemeKey(key)||!own(map,key))return failure("No look is linked to this palette")
  delete map[key];var next=clone(settings||{});next.themeLooks=map;return {ok:true,settings:next}
}
function linkedAppearance(settings,key){var map=themeMap(settings);return validThemeKey(key)&&own(map,key)?map[key]:null}
if(typeof module!=="undefined"&&module.exports)module.exports={STYLES:STYLES,clone:clone,appearanceValue:appearanceValue,normalizeLooks:normalizeLooks,saveLook:saveLook,deleteLook:deleteLook,renameLook:renameLook,exportLook:exportLook,importLook:importLook,themeKey:themeKey,linkTheme:linkTheme,unlinkTheme:unlinkTheme,linkedAppearance:linkedAppearance}
