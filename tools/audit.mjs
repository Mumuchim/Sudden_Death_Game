globalThis.localStorage={_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}};
globalThis.matchMedia=()=>({matches:true,addEventListener(){},addListener(){}});
globalThis.window=globalThis; globalThis.document={createElement:()=>({getContext:()=>null,style:{},addEventListener(){}}),addEventListener(){},getElementById:()=>null,body:{classList:{add(){},remove(){}}}};
globalThis.requestAnimationFrame=()=>0; globalThis.cancelAnimationFrame=()=>{};
globalThis.performance={now:()=>0};
const {api}=await import('../src/game/registry.js');
await import('../src/game/story_school.js');
await import('../src/game/story_below.js');
await import('../src/game/story_endings.js');
const art=await import('../src/game/art.js');
const S=api.SCENES, E=api.ENDINGS, I=api.ITEMS;
let n=0; const bad=m=>{n++;console.log('  ! '+m)};

// items
Object.keys(I).forEach(k=>{const it=I[k];
  if(typeof it.use!=='function') bad(`item ${k} has no use()`);
  if(!it.name) bad(`item ${k} has no name`);
  if(it.combatOnly&&it.storyOnly) bad(`item ${k} is both combatOnly and storyOnly`);
  if(it.suggest&&typeof it.suggest!=='function') bad(`item ${k} suggest is not a function`);
});
// scenes referencing items that don't exist
const src=[...(await import('node:fs')).readFileSync('src/game/story_below.js','utf8').matchAll(/addItem\(\s*'([^']+)'/g)].map(m=>m[1])
  .concat([...(await import('node:fs')).readFileSync('src/game/story_school.js','utf8').matchAll(/addItem\(\s*'([^']+)'/g)].map(m=>m[1]));
[...new Set(src)].forEach(id=>{ if(!I[id]) bad(`addItem('${id}') but no such item`); });

// combat defs
const probe={name:'T',seed:1,flags:{},bonds:{},inv:[],taken:[],shards:[],ember:5,emberCap:5,breath:6,breathCap:8,echoes:2,scars:0,doubt:0,devotion:0,jealousy:0,passive:0,fights:0,apostles:{},told:{},pools:{},scene:'x'};
Object.keys(S).forEach(k=>{const sc=S[k]; if(!sc.combat) return;
  let d; try{d=sc.combat(probe)}catch(e){return bad(`${k}.combat() threw: ${e.message}`)}
  if(!d) return bad(`${k}.combat() returned nothing`);
  if(!art.ENEMY_ART[d.art]) bad(`${k}: enemy art '${d.art}' missing`);
  if(!d.tells||d.tells.length!==4) bad(`${k}: ${d.tells?d.tells.length:0} tells (want 4)`);
  else{
    const as=d.tells.map(t=>t.a);
    if(new Set(as).size!==4) bad(`${k}: tells do not cover all four verbs (${as.join(',')})`);
    d.tells.forEach((t,i)=>{
      if(!t.t) bad(`${k}: tell ${i} has no text`);
      if(!t.bad) bad(`${k}: tell ${i} has no bad text`);
      if(t.lock&&t.lock.v==='guard') bad(`${k}: tell ${i} tries to lock Guard`);
      if(t.lock&&!['strike','slip','focus'].includes(t.lock.v)) bad(`${k}: tell ${i} locks unknown verb ${t.lock.v}`);
    });
    const heavy=d.tells.filter(t=>t.heavy).length;
    if(heavy>2) bad(`${k}: ${heavy} heavy tells (>2 is punishing)`);
  }
  if(d.pattern){
    if(d.pattern.some(i=>i<0||i>=d.tells.length)) bad(`${k}: pattern indexes outside tells`);
    const teach=d.teach===undefined?4:d.teach;
    const seen=new Set(d.pattern.slice(0,teach));
    if(seen.size<d.tells.length) bad(`${k}: teach window of ${teach} does not show all ${d.tells.length} tells`);
    for(let i=1;i<Math.min(teach,d.pattern.length);i++) if(d.pattern[i]===d.pattern[i-1]) bad(`${k}: pattern repeats a tell back-to-back at ${i}`);
  } else bad(`${k}: no pattern, so no teach window`);
  if(d.phase){
    if(d.phase.index===undefined||!d.tells[d.phase.index]) bad(`${k}: phase.index invalid`);
    if(!d.phase.a) bad(`${k}: phase has no new answer`);
    if(d.phase.at>=d.poise) bad(`${k}: phase.at ${d.phase.at} >= poise ${d.poise}, fires immediately`);
    if(d.phase.a && d.tells[d.phase.index] && d.phase.a===d.tells[d.phase.index].a) bad(`${k}: phase changes a tell to the answer it already had`);
  }
  if(!d.intro) bad(`${k}: no intro`);
  if(!d.speed) bad(`${k}: no speed set (falls back to 8000)`);
});
// endings
Object.keys(E).forEach(k=>{ if(!api.ENDING_ORDER.includes(k)) bad(`ending ${k} missing from ENDING_ORDER`); });
api.ENDING_ORDER.forEach(k=>{ if(!E[k]) bad(`ENDING_ORDER has '${k}' but no such ending`); });
const wins=Object.keys(E).filter(k=>E[k].kind==='win');
if(wins.length!==1) bad(`${wins.length} win endings: ${wins.join(',')}`);
// duplicate choice targets / empty choices
Object.keys(S).forEach(k=>{const sc=S[k];
  let ch; try{ch=typeof sc.choices==='function'?sc.choices(probe):sc.choices}catch(e){return}
  if(!ch) return;
  ch.forEach((c,i)=>{ if(!c.t) bad(`${k}: choice ${i} has no label`);
    if(!c.to&&!c.ending&&!c.do) bad(`${k}: choice ${i} goes nowhere`); });
});
console.log(n?`\n${n} issue(s)`:'\nno issues');
