#!/usr/bin/env node
// Load-reliability harness: topology closes, no inverted sectors, BSP + WAD
// lumps present and parseable — the things that make Chocolate Doom refuse to
// load a level (which presents as a level that just never starts).
//
//   node scripts/check-load.js [rooms] [numSeeds]
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
const ctx={window:{},localStorage:{getItem:()=>null,setItem:()=>{}},document:{createElement:()=>({getContext:()=>null})},console,Math,Date,JSON,TextDecoder,TextEncoder,navigator:{},performance,Uint8Array,Blob:class{}};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'arena/engine.js'),'utf8'),ctx);
const E=ctx.window.JerkwadEngine;
const mul=a=>()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
const arenaSrc=fs.readFileSync(path.join(ROOT,'arena/index.html'),'utf8');
const arenaThings=eval('('+arenaSrc.match(/function arenaThings\(lvl, rng, playerCount\) \{[\s\S]*?\n\}/)[0]+')');
const ROOMS=+(process.argv[2]||30), N=+(process.argv[3]||8);
let fails=0;
for(let i=0;i<N;i++){
 const seed=1+i*7919,rng=mul(seed);
 const t0=Date.now();
 const lvl=E.etherGenerateLevel({rng,presets:E.SHAPESHIFTER_PRESETS,roomCount:ROOMS,enemyCount:40,difficulty:'medium',fuseChance:0});
 const things=arenaThings(lvl,rng,4);
 const map=E.generateShapeShifterMap(lvl.rooms,lvl.connections,things,{seed});
 const loops=E.buildSectorLoops(map);
 const open=map.sectors.filter(s=>s.floorH>s.ceilH);
 const dup=new Set(),dups=[];
 for(const l of map.linedefs){const k=[l.v1,l.v2].sort().join('|');if(dup.has(k))dups.push(l.id);dup.add(k);}
 const zero=map.linedefs.filter(l=>l.v1===l.v2);
 const bytes=E.buildWad([{name:'MAP01',...map}]);
 const buf=Buffer.from(bytes.buffer?bytes.buffer:bytes);
 const nl=buf.readInt32LE(4),off=buf.readInt32LE(8);
 const names=[];for(let j=0;j<nl;j++){const o=off+j*16;let n='';for(let k2=0;k2<8;k2++){const c=buf[o+8+k2];if(c)n+=String.fromCharCode(c);}names.push({n,sz:buf.readInt32LE(o+4)});}
 const need=['THINGS','LINEDEFS','SIDEDEFS','VERTEXES','SEGS','SSECTORS','NODES','SECTORS','BLOCKMAP'];
 const missing=need.filter(x=>!names.some(e=>e.n===x&&e.sz>0));
 const ok = loops.size===map.sectors.length && !open.length && !dups.length && !zero.length && !missing.length;
 if(!ok)fails++;
 console.log((ok?'ok  ':'FAIL')+' seed '+String(seed).padEnd(7)+' sec='+String(map.sectors.length).padEnd(5)+'loops='+String(loops.size).padEnd(5)+
   'lines='+String(map.linedefs.length).padEnd(6)+'wad='+(buf.length/1024).toFixed(0)+'KB  '+(Date.now()-t0)+'ms'+
   (open.length?'  inverted='+open.length:'')+(dups.length?'  dupLines='+dups.length:'')+(zero.length?'  zeroLen='+zero.length:'')+(missing.length?'  missingLumps='+missing:''));
}
console.log(fails?'\nFAIL '+fails+'/'+N:'\nOK '+N+'/'+N+' levels build clean and export complete WAD lumps');
process.exit(fails?1:0);
