const test=require('node:test');const assert=require('node:assert/strict');
const G=require('../HostGeometry.js');const R=require('../RiceModel.js');
function slot(id,region,x,y,width=26,height=26){return {moduleName:id,region,x,y,width,height,visible:true,activeItem:{visible:true,children:[]},children:[],mapToItem(){return {x:this.x,y:this.y}}}}
test('current 4.0.4 visual slot tree works without root moduleSlots or debug APIs',()=>{
 const a=slot('omarchy.menu','left',8,0),b=slot('omarchy.clock','center',650,0);const tree={children:[{children:[a,b]}]};
 const result=G.snapshot(tree,false);assert.equal(result.length,2);assert.equal(result[0].id,'omarchy.menu');assert.equal(result[1].x,650);
});
test('adapter ignores own chrome, missing/hidden/zero geometry and traversal cycles',()=>{
 const a=slot('valid','left',0,0),hidden=slot('hidden','left',0,0);hidden.visible=false;
 const zero=slot('zero','left',0,0,0),cycle={children:[]};cycle.children=[cycle];
 const tree={children:[{objectName:'rice-bar-chrome',children:[a]},hidden,zero,cycle]};assert.deepEqual(G.snapshot(tree,false),[]);
});
test('tray drawer leaves outside the real tray do not paint over adjacent widgets',()=>{
 const tray=slot('omarchy.tray','right',100,0,81,26);
 tray.activeItem.children=[slot('a','right',100,0),slot('b','right',127,0),slot('c','right',181,0),slot('d','right',100,40)];
 const leaves=G.snapshot({children:[tray]},false)[0].leaves;assert.deepEqual(leaves.map(x=>x.x),[100,127]);
});
test('vertical tray overlap is bounded on both axes',()=>{
 const tray=slot('omarchy.tray','right',0,100,26,81);tray.activeItem.children=[slot('a','right',0,100),slot('b','right',0,127),slot('outside','right',40,127)];
 assert.equal(G.snapshot({children:[tray]},true)[0].leaves.length,2);
});
test('direct scoped barConfig resolves persisted settings without shellConfig',()=>{
 const id='io.github.jcarcinogen.rice-bar';assert.equal(R.findEntry({layout:{right:[{id,preset:'pixel'}]}},id).preset,'pixel');
});
test('fixed-foreground contrast protects arbitrary wallpapers without recoloring stock text',()=>{
 let seed=123456;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}function color(){return {r:random(),g:random(),b:random()}}
 for(let i=0;i<600;i++){
  const bg=color(),fg=color(),plan=R.fixedForegroundPlan(bg,fg,random());assert.equal(plan.foreground,fg);assert.ok(plan.contrast>=4.5-1e-9);assert.ok(plan.alpha<=1);
  for(let j=0;j<15;j++)assert.ok(R.contrastRatio(fg,R.compositeColor(plan.surface,color(),plan.alpha))>=4.5-1e-9);
 }
});
test('mid-tone stock foreground cannot slip between black/white wallpaper endpoints',()=>{
 const p=R.fixedForegroundPlan('#000000','#777777',0);assert.ok(p.alpha>0);assert.ok(R.contrastRatio(p.foreground,R.compositeColor(p.surface,'#777777',p.alpha))>=4.5);
});
test('all styles generate valid contrast-safe theme surfaces in dark and light palettes',()=>{
 for(const preset of R.PRESETS)for(const [bg,fg] of [['#151520','#eeeeff'],['#f4f3ed','#292323'],['#777777','#787878']]){
  const surface=R.styleSurface(bg,'#8888ff',preset);assert.match(surface,/^#[0-9a-f]{6}$/);const p=R.fixedForegroundPlan(surface,fg,.456);assert.ok(p.contrast>=4.5);
 }
});
