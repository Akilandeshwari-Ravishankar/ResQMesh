/* ResQMesh hackathon demo server — dependency-free local network sync. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json'};
const seed = [
  {id:'seed-1',type:'Emergency',icon:'✦',tone:'danger-bg',title:'Maya L. requested assistance',body:'Medical assistance requested near Cedar & 8th.',time:'2m',distance:'0.4 km',sender:'Maya L.',status:'Relaying',urgency:'critical'},
  {id:'seed-2',type:'Hazard',icon:'!',tone:'hazard-bg',title:'Road blocked',body:'Fallen tree blocks the north entrance to Oak Street.',time:'8m',distance:'0.7 km',sender:'Field volunteer',status:'Verified by 2 relays',urgency:'high'},
  {id:'seed-3',type:'Resource',icon:'⌂',tone:'resource-bg',title:'Water point available',body:'Community water and charging point open until 20:00.',time:'12m',distance:'1.2 km',sender:'Community Hub',status:'Confirmed',urgency:'normal'},
  {id:'seed-4',type:'Status',icon:'✓',tone:'resource-bg',title:'Library shelter is open',body:'The east hall has space for 18 more people.',time:'18m',distance:'1.6 km',sender:'Library team',status:'Confirmed',urgency:'normal'}
];
let updates = seed.map(update => ({...update,...triage(update.type,update.body)}));
function reply(res, status, body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(body));}
function triage(type, text){
  const words = text.toLowerCase();
  const critical = /trapped|injur|medical|bleed|fire|collapse|sos|urgent/.test(words) || type === 'Emergency';
  const high = critical || /block|flood|landslide|bridge|power line/.test(words);
  return {urgency:critical?'critical':high?'high':'normal', recommendation:critical?'Alert nearby responders and maintain relay path.':high?'Mark the route unsafe and request a second confirmation.':'Share with the community and request verification.', confidence:critical?94:high?82:71, signals:critical?['life-safety language','emergency category']:high?['hazard language','access disruption']:['community update category']};
}
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,`http://${req.headers.host}`);
  if(req.method==='GET' && url.pathname==='/health') return reply(res,200,{status:'ok',service:'resqmesh-demo'});
  if(req.method==='GET' && url.pathname==='/api/state') return reply(res,200,{updates,peers:12,serverTime:Date.now()});
  if(req.method==='POST' && url.pathname==='/api/updates'){
    let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>10000)req.destroy()});req.on('end',()=>{try{const input=JSON.parse(raw);const type=['Emergency','Hazard','Resource','Status','Safe route'].includes(input.type)?input.type:'Status';const body=String(input.body||'').trim().slice(0,500);if(!body)return reply(res,400,{error:'An update description is required.'});const map={Emergency:['✦','danger-bg'],Hazard:['!','hazard-bg'],Resource:['⌂','resource-bg'],Status:['✓','resource-bg'],'Safe route':['→','resource-bg']}[type];const ai=triage(type,body);const update={id:`u-${Date.now()}`,type,icon:map[0],tone:map[1],title:input.title||`${input.sender||'Community member'} shared a ${type.toLowerCase()}`,body,time:'now',distance:input.distance||'demo location',sender:input.sender||'Demo responder',status:'Relaying',...ai};updates.unshift(update);reply(res,201,{update});}catch{return reply(res,400,{error:'Invalid update format.'})}});return;
  }
  if(req.method==='POST' && url.pathname==='/api/reset'){updates=seed.map(update => ({...update,...triage(update.type,update.body)}));return reply(res,200,{updates});}
  if(req.method==='OPTIONS') {res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return res.end();}
  const safe = path.normalize(url.pathname==='/'?'/index.html':url.pathname).replace(/^(\.\.([\\/]|$))+/, '');
  const file = path.join(root,safe); if(!file.startsWith(root)) {res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
});
server.listen(port,'0.0.0.0',()=>console.log(`ResQMesh demo running on http://localhost:${port}`));
