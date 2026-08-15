#!/usr/bin/env node
// ============================================================================
// Lobby XSS regression test.
//
// The arena lobby lists levels published by anyone on the internet, including
// a free-text level NAME. Interpolating that name into innerHTML was a stored
// XSS on the hosting domain: any visitor reading the public arena list ran the
// publisher's JavaScript, same-origin with the rest of the site.
//
// This serves arena/index.html against a stubbed relay that returns a hostile
// name, drives the page's REAL render path, and asserts the payload produced
// zero elements — that it stayed a text node.
//
// Negative control (must FAIL): restore the old innerHTML row build and rerun;
// the pre-fix page injects a live <img onerror> and sets window.__pwned.
//
//   node scripts/check-xss.js          # needs puppeteer + a chromium binary
//   CHROMIUM=/path/to/chrome node scripts/check-xss.js
// ============================================================================
// Serves arena/ with a stubbed lobby returning a HOSTILE level name, and
// asserts the page's real render path treats it as text, not markup.
// The page is served with API forced to http:// so ?relay= can point at the stub.
const http=require('http'),fs=require('fs'),path=require('path');
// Needs a real browser. Exit 2 = SKIPPED (reported as skipped, never as
// passed) so a machine without puppeteer can't silently green-light a deploy.
let puppeteer;
try { puppeteer = require(process.env.PUPPETEER || 'puppeteer'); }
catch (e) { try { puppeteer = require('/tmp/node_modules/puppeteer'); }
  catch (e2) { console.log('SKIPPED — puppeteer not installed (npm install puppeteer to run this)'); process.exit(2); } }
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
if (!fs.existsSync(CHROME)) {
  try { puppeteer.executablePath(); }
  catch (e) { console.log('SKIPPED — no chromium binary found (set CHROMIUM=/path/to/chrome)'); process.exit(2); }
}
const ROOT=path.join(__dirname,'..'), PORT=+(process.env.PORT||8196);
const PAYLOAD="<img src=x onerror=window.__pwned=1>";
let arena=fs.readFileSync(path.join(ROOT,'arena/index.html'),'utf8')
  .replace("const API = 'https://' + RELAY_HOST;","const API = 'http://' + RELAY_HOST;");
const srv=http.createServer((rq,rs)=>{
  const u=rq.url.split('?')[0];
  const cors={'Access-Control-Allow-Origin':'*','content-type':'application/json'};
  if(u==='/api/lobby/list'){rs.writeHead(200,cors);return rs.end(JSON.stringify({levels:[
    {room:'r1-aaaa',name:PAYLOAD,seed:1,rooms:12,enemies:30,maxPlayers:4,dm:true,created:Date.now()}]}));}
  if(u==='/arena/'||u==='/arena/index.html'){rs.writeHead(200,{'Content-Type':'text/html'});return rs.end(arena);}
  let p=path.join(ROOT,decodeURIComponent(u));
  if(!fs.existsSync(p)){rs.writeHead(404);return rs.end('nf');}
  rs.writeHead(200,{'Content-Type':u.endsWith('.js')?'text/javascript':'application/octet-stream'});
  fs.createReadStream(p).pipe(rs);
});
(async()=>{
await new Promise(r=>srv.listen(PORT,r));
const b=await puppeteer.launch({args:['--no-sandbox'],executablePath: fs.existsSync(CHROME) ? CHROME : undefined});
const pg=await b.newPage();
await pg.goto('http://localhost:'+PORT+'/arena/?relay=localhost:'+PORT,{waitUntil:'networkidle2'});
await new Promise(r=>setTimeout(r,4000));
const res=await pg.evaluate(()=>{
  const tb=document.getElementById('lobby');
  return {pwned:!!window.__pwned, injected:document.querySelectorAll('#lobby svg,#lobby img,#lobby script').length,
    relay:(document.getElementById('relaystat')||{}).innerText,
    rows:tb.querySelectorAll('tr').length,
    text:tb.innerText.replace(/\s+/g,' ').slice(0,140),
    html:tb.innerHTML.slice(0,260)};
});
console.log(JSON.stringify(res,null,1));
await b.close();srv.close();
// The row MUST render (else the test proved nothing), and the payload must
// have produced ZERO elements — i.e. it stayed a text node.
if (res.rows === 0) { console.log('\nINCONCLUSIVE — lobby row never rendered'); process.exit(2); }
const ok = !res.pwned && res.injected === 0;
console.log(ok ? '\nOK — hostile name rendered as inert text (0 elements injected)'
               : '\nFAIL — payload injected ' + res.injected + ' element(s), pwned=' + res.pwned);
process.exit(ok?0:1);
})();
