import type { BlockProgram } from "./blocks";
import { slugify } from "./utils";

function embeddedRuntime(programJson: string): string {
  return [
    "var PROGRAM = " + programJson + ";",
    "var W=480,H=320;",
    "function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}",
    "function num(b,k,f){var v=parseFloat(b.args&&b.args[k]);return isFinite(v)?v:f;}",
    "var keys={},orbs=[],orbSeq=0,now=0;var G={score:0,level:1,status:'playing',banner:'',say:null};",
    "document.addEventListener('keydown',function(e){var k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;});",
    "document.addEventListener('keyup',function(e){var k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;});",
    "function makeSprites(){return PROGRAM.sprites.map(function(s,i){return {name:s.spriteId,x:120+(i%4)*90,y:160+Math.floor(i/4)*60,dir:0,color:i===0?'#7c5cff':i===1?'#22d3ee':i===2?'#fb7185':'#a3e635',shape:s.spriteId==='hero'?'star':'circle',size:s.spriteId==='hero'?20:16,script:typeof s.blocks==='string'?JSON.parse(s.blocks):s.blocks,stack:[],waitUntil:0,say:null,sayUntil:0};});}",
    "var sprites=makeSprites();",
    "function startScript(s){if(!s.script.length){s.stack=[];return;}var f=s.script[0];if(f.kind==='whenKey'&&!keys[f.args.key||'']){s.stack=[];return;}s.stack=[{blocks:s.script,i:0,loopLeft:-1}];}",
    "sprites.forEach(startScript);",
    "function runBlock(s,b,frame){",
    " switch(b.kind){",
    "  case 'whenFlag':return true;",
    "  case 'whenKey':if(keys[b.args.key||''])return true;if(b===s.script[0]&&s.stack.length===1){s.stack=[];return false;}frame.i=frame.blocks.length;return true;",
    "  case 'forever':if(b.children&&b.children.length)s.stack.push({blocks:b.children,i:0,loopLeft:-1});return true;",
    "  case 'repeat':{var t=Math.max(0,Math.round(num(b,'times',1)));if(b.children&&b.children.length&&t>0)s.stack.push({blocks:b.children,i:0,loopLeft:t});return true;}",
    "  case 'wait':s.waitUntil=now+Math.max(0,num(b,'seconds',1))*1000;return false;",
    "  case 'move':{var r=s.dir*Math.PI/180;s.x+=Math.cos(r)*num(b,'steps',10);s.y+=Math.sin(r)*num(b,'steps',10);s.x=clamp(s.x,-60,W+60);s.y=clamp(s.y,-60,H+60);return true;}",
    "  case 'turn':s.dir=(s.dir+num(b,'degrees',15))%360;return true;",
    "  case 'point':s.dir=num(b,'degrees',90);return true;",
    "  case 'goto':s.x=clamp(num(b,'x'),10,W-10);s.y=clamp(num(b,'y'),10,H-10);return true;",
    "  case 'home':s.x=W/2;s.y=H/2;return true;",
    "  case 'edgeBounce':{var hit=false;if(s.x<s.size){s.dir=180-s.dir;hit=true;}if(s.x>W-s.size){s.dir=180-s.dir;hit=true;}if(s.y<s.size){s.dir=-s.dir;hit=true;}if(s.y>H-s.size){s.dir=-s.dir;hit=true;}s.x=clamp(s.x,s.size,W-s.size);s.y=clamp(s.y,s.size,H-s.size);return true;}",
    "  case 'say':s.say=b.args.text||'';s.sayUntil=now+Math.max(1,num(b,'seconds',2))*1000;return true;",
    "  case 'setColor':if(/^#[0-9a-fA-F]{6}$/.test(b.args.color||''))s.color=b.args.color;return true;",
    "  case 'setShape':s.shape=b.args.shape||'circle';return true;",
    "  case 'size':s.size=clamp(num(b,'size',18),4,60);return true;",
    "  case 'spawn':{var r2=s.dir*Math.PI/180;orbs.push({id:++orbSeq,x:clamp(s.x+Math.cos(r2)*40,15,W-15),y:clamp(s.y+Math.sin(r2)*40,15,H-15),points:Math.max(1,Math.round(num(b,'points',1))),color:'#a3e635'});return true;}",
    "  case 'addScore':G.score+=Math.round(num(b,'points',1));return true;",
    "  case 'levelUp':G.status='won';G.banner='Level cleared!';return true;",
    "  case 'gameOver':G.status='lost';G.banner='Game over';return true;",
    "  default:return true;",
    " }}",
    "function execSprite(s,maxOps){var ops=0;while(s.stack.length&&ops++<maxOps&&now>=s.waitUntil){var f=s.stack[s.stack.length-1];if(f.i>=f.blocks.length){if(f.loopLeft===-1){f.i=0;continue;}if(f.loopLeft>1){f.loopLeft--;f.i=0;continue;}s.stack.pop();continue;}var b=f.blocks[f.i];f.i++;if(!runBlock(s,b,f))return;if(!s.stack.length)break;}if(!s.stack.length)startScript(s);}",
    "function tickSprite(s){if(now<s.waitUntil)return;if(!s.stack.length&&s.script.length)startScript(s);if(!s.stack.length)return;execSprite(s,96);if(s.sayUntil&&now>s.sayUntil){s.say=null;s.sayUntil=0;}}",
    "function step(dt){G.tick=(G.tick||0)+1;if(G.status!=='playing')return;now+=dt;sprites.forEach(tickSprite);",
    " for(var i=0;i<sprites.length;i++){var s=sprites[i];for(var j=orbs.length-1;j>=0;j--){var o=orbs[j];var dx=s.x-o.x,dy=s.y-o.y;if(dx*dx+dy*dy<(s.size+9)*(s.size+9)){G.score+=o.points;orbs.splice(j,1);}}}",
    " var hero=null;for(var i2=0;i2<sprites.length;i2++){if(sprites[i2].name.indexOf('hero')===0)hero=sprites[i2];}",
    " if(hero){for(var i3=0;i3<sprites.length;i3++){var sc=sprites[i3];if(sc.name.indexOf('chaser')!==0)continue;var ddx=sc.x-hero.x,ddy=sc.y-hero.y;if(ddx*ddx+ddy*ddy<(sc.size+hero.size)*(sc.size+hero.size)){G.status='lost';G.banner='Caught!';}}}",
    " if(orbs.length===0&&G.tick>30){/* keep playing if design has no orbs */}",
    "}",
    "function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}",
    "function drawShape(ctx,shape,x,y,r,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;if(shape==='circle'){ctx.beginPath();ctx.arc(0,0,r,0,6.2832);ctx.fill();}else if(shape==='square'){ctx.fillRect(-r,-r,r*2,r*2);}else if(shape==='triangle'){ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,r);ctx.lineTo(-r,r);ctx.closePath();ctx.fill();}else{ctx.beginPath();for(var i=0;i<10;i++){var a=i*Math.PI/5-1.5708,rr=i%2===0?r:r*0.45;if(i===0)ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();}ctx.restore();}",
    "var cv=document.getElementById('g'),ctx=cv.getContext('2d');",
    "function draw(){var pair=(PROGRAM.bg||'').indexOf('|')>=0?PROGRAM.bg.split('|'):['#151a33','#0a0b12'];var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,pair[0]);g.addColorStop(1,pair[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);",
    " orB();for(var i=0;i<sprites.length;i++){var s=sprites[i];drawShape(ctx,s.shape,s.x,s.y,s.size,s.color);if(s.say){ctx.font='11px sans-serif';var tw=ctx.measureText(s.say).width;ctx.fillStyle='rgba(10,11,18,0.8)';roundRect(ctx,s.x-tw/2-6,s.y-s.size-26,tw+12,18,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(s.say,s.x-tw/2,s.y-s.size-13);}}",
    " ctx.fillStyle='rgba(0,0,0,0.35)';roundRect(ctx,8,8,132,22,8);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 11px monospace';ctx.fillText('SCORE '+G.score,16,23);",
    " if(G.status!=='playing'){ctx.fillStyle='rgba(6,7,12,0.72)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText(G.status==='won'?'YOU WIN!':'GAME OVER',W/2,H/2-8);ctx.font='13px sans-serif';ctx.fillText(G.banner,W/2,H/2+18);ctx.textAlign='left';}}",
    "function orB(){for(var j=0;j<orbs.length;j++){var o=orbs[j];ctx.fillStyle=o.color;ctx.beginPath();ctx.arc(o.x,o.y,7,0,6.2832);ctx.fill();}}",
    "var last=0;function loop(t){var dt=last?Math.min(50,t-last):16;last=t;step(dt);draw();requestAnimationFrame(loop);}",
    "document.getElementById('restart').addEventListener('click',function(){sprites=makeSprites();orbs=[];G={score:0,level:1,status:'playing',banner:''};now=0;sprites.forEach(startScript);});",
    "requestAnimationFrame(loop);",
  ].join("\n");
}

export function buildStandaloneHtml(title: string, program: BlockProgram): string {
  const programJson = JSON.stringify(program);
  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8"><title>' + title + "</title>",
    "<style>body{margin:0;background:#0a0b12;color:#e7e9f5;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px}",
    "h1{font-size:18px;margin:0}",
    "canvas{border-radius:14px;border:1px solid #262b45;touch-action:none}",
    "button{background:#7c5cff;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer}",
    "</style></head><body>",
    "<h1>" + title + "</h1>",
    '<canvas id="g" width="480" height="320" tabindex="0"></canvas>',
    "<p>Arrow keys / WASD to move · Restart to replay</p>",
    '<button id="restart">Restart</button>',
    "<p style='color:#6b7280;font-size:12px'>Made with GamePlatform — blocks compiled to a standalone HTML5 game.</p>",
    "<script>",
    embeddedRuntime(programJson) + "\n</" + "script>",
    "</body></html>",
  ].join("\n");
}

export function downloadHtml(name: string, program: BlockProgram) {
  const html = buildStandaloneHtml(name, program);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = slugify(name) + "-game.html";
  a.click();
  URL.revokeObjectURL(url);
}
