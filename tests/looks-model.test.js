const test=require('node:test');const assert=require('node:assert/strict');
const M=require('../LooksModel.js');const R=require('../RiceModel.js');
const appearance={preset:'glass',opacity:72,radius:12,gap:6,border:true};
const input=()=>({format:'rice-bar-look',version:1,name:'Test',appearance:{...appearance}});

test('portable look round trip is data-only and does not apply the saved style',()=>{
 const original={preset:'pills',unrelated:{a:1}};const result=M.importLook(original,M.exportLook(appearance,'Test'));
 assert.equal(result.ok,true);assert.deepEqual(result.appearance,appearance);assert.equal(result.settings.preset,'pills');assert.deepEqual(original,{preset:'pills',unrelated:{a:1}});
 assert.equal(M.normalizeLooks(result.settings).length,1);
});
for(const field of ['opacity','radius','gap'])for(const bad of [NaN,Infinity,-1,101,'22',null,true,{},2.5])test(`reject ${field} = ${String(bad)}`,()=>{
 const value={...appearance,[field]:bad};assert.equal(M.saveLook({},'Test',value).ok,false);
});
test('rejects unknown styles, non-boolean borders, missing fields and malformed formats',()=>{
 for(const bad of ['bad','GLASS','__proto__'])assert.equal(M.saveLook({},'Test',{...appearance,preset:bad}).ok,false);
 for(const bad of [1,'true',null])assert.equal(M.saveLook({},'Test',{...appearance,border:bad}).ok,false);
 for(const bad of ['',null,'{','[]','null',JSON.stringify({...input(),version:2}),JSON.stringify({...input(),appearance:{preset:'glass'}})])assert.equal(M.importLook({},bad).ok,false);
});
test('names are bounded plain text; invalid names never silently become Imported',()=>{
 for(const bad of ['', '   ','x'.repeat(49),'bad\nname','\tTest',34,'x\u0085y'])assert.equal(M.importLook({},JSON.stringify({...input(),name:bad})).ok,false);
 assert.equal(M.saveLook({},' <b>Mine</b> ',appearance).name,'<b>Mine</b>');
});
test('32 KiB import byte cap applies to Unicode too',()=>{
 assert.equal(M.importLook({},' '.repeat(32769)).ok,false);
 assert.equal(M.importLook({},JSON.stringify({...input(),unused:'界'.repeat(11000)})).ok,false);
 assert.equal(M.importLook({},JSON.stringify({...input(),unused:'😀'.repeat(8200)})).ok,false);
});
test('prototype keys never enter saved settings; IDs cannot pollute prototypes',()=>{
 const malicious=JSON.parse('{"__proto__":{"polluted":true},"constructor":{},"other":{"__proto__":{"p":true},"ok":7}}');
 const result=M.saveLook(malicious,'Safe',appearance);assert.equal(result.ok,true);assert.equal(Object.hasOwn(result.settings,'__proto__'),false);assert.deepEqual(result.settings.other,{ok:7});assert.equal({}.polluted,undefined);
 for(const id of ['__proto__','constructor','prototype'])assert.equal(M.saveLook({},'Bad',appearance,id).ok,false);
 assert.equal(M.linkTheme({},'__proto__',appearance).ok,false);
});
test('extra executable or path fields are discarded on import',()=>{
 const value=input();value.command='sh -c bad';value.appearance.path='/tmp/bad';value.appearance.preset='pixel';
 const result=M.importLook({},JSON.stringify(value));assert.equal(result.ok,true);assert.deepEqual(Object.keys(result.appearance).sort(),['border','gap','opacity','preset','radius']);
 assert.equal(JSON.stringify(result.settings).includes('sh -c'),false);
});
test('stable rename/update/delete, duplicates and limits preserve unrelated preferences',()=>{
 let s={showIcon:false,unknown:{v:1}};const ids=[];
 for(let i=0;i<32;i++){const r=M.saveLook(s,'Same name',appearance);assert.equal(r.ok,true);s=r.settings;ids.push(r.id)}
 assert.equal(new Set(ids).size,32);assert.equal(M.saveLook(s,'Excess',appearance).ok,false);
 const updated=M.saveLook(s,'Updated',{...appearance,radius:3},ids[0]);assert.equal(updated.ok,true);assert.equal(updated.id,ids[0]);
 const renamed=M.renameLook(updated.settings,ids[0],'Renamed');assert.equal(renamed.ok,true);assert.equal(M.normalizeLooks(renamed.settings)[0].name,'Renamed');
 const deleted=M.deleteLook(renamed.settings,ids[0]);assert.equal(M.normalizeLooks(deleted.settings).length,31);assert.deepEqual(deleted.settings.unknown,{v:1});assert.equal(deleted.settings.showIcon,false);
 assert.equal(M.renameLook(s,'missing','Name').ok,false);assert.equal(M.deleteLook(s,'missing').ok,false);
});
test('theme links are palette-based, bounded and allow replacement at capacity',()=>{
 let s={other:42};for(let i=0;i<32;i++){const key=M.themeKey(['#'+i.toString(16).padStart(6,'0')]);const r=M.linkTheme(s,key,appearance);assert.equal(r.ok,true);s=r.settings}
 const key=M.themeKey(['#000000']);assert.equal(M.linkTheme(s,key,{...appearance,gap:1}).ok,true);
 assert.equal(M.linkTheme(s,M.themeKey(['#abcdef']),appearance).ok,false);
 assert.deepEqual(M.linkedAppearance(s,key),appearance);const r=M.unlinkTheme(s,key);assert.equal(r.ok,true);assert.equal(M.linkedAppearance(r.settings,key),null);assert.equal(r.settings.other,42);
 assert.equal(M.themeKey(['#AABBCC','#000000']),M.themeKey(['#aabbcc','#000000']));assert.equal(M.themeKey(['not a color']),'');
});
test('style switching and reset preserve saved looks, flags and future fields',()=>{
 let s=M.saveLook({future:'keep',showIcon:false},'Saved',appearance).settings;
 s=R.switchPreset(s,'bevel');s=R.updateAppearance(s,{gap:9});s=R.resetPreset(s);
 assert.equal(s.future,'keep');assert.equal(s.showIcon,false);assert.equal(M.normalizeLooks(s).length,1);
});
test('normalizers handle malformed stored collections and do not mutate input',()=>{
 for(const value of [null,[],false,'bad',12]){assert.deepEqual(M.normalizeLooks({looks:value}),[]);assert.equal(M.saveLook({looks:value},'Safe',appearance).ok,true)}
 const source={looks:{bad:null,good:{name:'Good',appearance}}};const before=JSON.stringify(source);assert.equal(M.normalizeLooks(source).length,1);assert.equal(JSON.stringify(source),before);
});
