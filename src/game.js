(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const W=1920,H=1080,CH=143,GAP=4,PADX=4,RW=881,RH=572,COLW=(RW-PADX*2-GAP*4)/5,RX=519,RY=223,SUNX=959,SUNY=108;
const colX=r=>PADX+r*(COLW+GAP);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rand=(a,b)=>a+Math.random()*(b-a);
const r2=v=>Math.round(v*100)/100;
/*MATH*/
// ---------- device profile ----------
const COARSE=matchMedia('(pointer:coarse)').matches;
// LITE: phones/tablets and weak CPUs get lighter ambient effects (fewer particles, lower background resolution).
const LITE=COARSE||(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4||/[?&]lite=1/.test(location.search);
if(LITE)document.documentElement.classList.add('lite');
/*SYMIMG*/
// symbol sprites -> short blob: URLs in CSS variables. Huge data: URIs inside var() made every style recalc slow
// (hundreds of symbols are created per spin). Images are also pre-decoded so the first spin doesn't hitch.
const PRE=[];
(()=>{const r=document.documentElement.style,mk=b=>{try{const t=atob(b),u=new Uint8Array(t.length);for(let i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return URL.createObjectURL(new Blob([u],{type:'image/webp'}))}catch(e){return'data:image/webp;base64,'+b}};
 for(const n in SYMIMG)SYMIMG[n].forEach((b,i)=>{const u=mk(b);r.setProperty('--'+n+(i?'b':''),'url('+u+')');const im=new Image();im.src=u;if(im.decode)im.decode().catch(()=>{});PRE.push(im)})})();
// canvas -> blob URL (async PNG encoding instead of blocking toDataURL)
function canvasURL(c,cb){if(c.toBlob)c.toBlob(b=>cb(b?'url('+URL.createObjectURL(b)+')':'url('+c.toDataURL()+')'));else cb('url('+c.toDataURL()+')')}
// ---------- game config (unchanged math model) ----------
const WEI={H1:2,H2:3,H3:4,H4:5,M1:6,M2:7,A:12,K:12,Q:14,J:14,T:15};
const BASE=strips({seed:7,len:90,w:WEI,sc:.034,wild:.05,st:.4,st2:.5});
const FSS=strips({seed:5,len:90,w:WEI,sc:.028,wild:.05,st:.4,st2:.5});
const LINES=lines(),FSN={3:8,4:12,5:16},BUYX=100,MAXWIN=5000;
const LEVELS=[1,2,3,4,5,6,7,8,9,10],COINS=[.01,.02,.03,.04,.05,.1,.2,.5,1],BETMUL=20;
const TOTALS=(()=>{const m=new Map();for(const c of COINS)for(const l of LEVELS){const t=Math.round(l*c*BETMUL*100)/100;if(!m.has(t))m.set(t,[l,c])}return[...m.entries()].sort((a,b)=>a[0]-b[0])})();
const SPEEDS=[{base:.6,step:.17,px:3500,stag:.05,ant:1.7,lift:.13},{base:.34,step:.085,px:4200,stag:.03,ant:1.4,lift:.1},{base:.17,step:.03,px:4600,stag:0,ant:1.1,lift:.08}];
const SYM={H1:{k:'hi',n:'Король Лео'},H2:{k:'hi',n:'Королева Львица'},H3:{k:'hi',n:'Белый Лев'},H4:{k:'hi',n:'Принц Львёнок'},M1:{k:'mid',n:'Анх'},M2:{k:'mid',n:'Скарабей'},A:{k:'let'},K:{k:'let'},Q:{k:'let'},J:{k:'let'},T:{k:'let'},W:{k:'wild'},S:{k:'scat'}};
const posWith=S=>S.map(s=>{const a=[[],[]];for(let p=0;p<s.length;p++){let n=0;for(let k=0;k<4;k++)if(s[(p+k)%s.length]=='S')n++;if(n<2)a[n].push(p)}return a});
const BASEP=posWith(BASE);
const ls=(k,d)=>{try{const v=localStorage.getItem('pol_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const save=(k,v)=>{try{localStorage.setItem('pol_'+k,JSON.stringify(v))}catch(e){}};
const st={bal:100000,lvl:2,coin:.01,busy:false,spinning:false,mode:ls('mode',0),auto:0,autoSel:10,autoTurbo:false,fs:null,sticky:{},grid:null,mult:{},tls:[],cycleT:null,hold:false,modal:null,skip:false,
 music:ls('music',true),sfx:ls('sfx',true),battery:ls('battery',false),intro:ls('intro',true),landedS:0,lastWin:0,spins:0,antS:[]};
const bet=()=>Math.round(st.lvl*st.coin*BETMUL*100)/100;
const fmt=v=>'$'+(Math.round(v*100)/100).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const curMode=()=>st.hold?2:(st.auto>0&&st.autoTurbo)?2:st.mode;
const plural=(n,a,b,c)=>{const m=n%100,d=n%10;return m>10&&m<20?c:d==1?a:d>=2&&d<=4?b:c};
const fsWord=n=>plural(n,'БЕСПЛАТНЫЙ СПИН','БЕСПЛАТНЫХ СПИНА','БЕСПЛАТНЫХ СПИНОВ');
const spWord=n=>plural(n,'СПИН','СПИНА','СПИНОВ');
let introOn=false;
/*AUDIO*/
// ---------- symbols ----------
const mxHTML=m=>m?`<i class="mx m${m}"><small>x</small>${m}</i>`:'';
function symHTML(id,m){return `<div class="sym"><i class="si s-${id}"></i>${id=='W'?mxHTML(m):''}</div>`}
const cellHTML=(id,m)=>`<div class="cell">${symHTML(id,m)}</div>`;
const rmult=()=>Math.random()<.65?2:3;
// ---------- build reels ----------
const reelsEl=$('#reels'),stripEls=[],reelEls=[];
for(let r=0;r<5;r++){const d=document.createElement('div');d.className='reel';d.innerHTML='<div class="clip"><div class="strip"></div></div>';reelsEl.appendChild(d);reelEls.push(d);stripEls.push(d.querySelector('.strip'))}
function renderRest(r,ids,ms,above){stripEls[r].innerHTML=cellHTML(above,above=='W'?rmult():0)+ids.map((id,k)=>cellHTML(id,ms[k])).join('');gsap.set(stripEls[r],{y:-CH})}
function setGrid(g,mult){st.grid=g.map(c=>c.slice());st.mult=Object.assign({},mult);g.forEach((c,r)=>renderRest(r,c,c.map((id,k)=>mult[r+','+k]||0),BASE[r][Math.random()*90|0]))}
// ---------- results (unchanged) ----------
function genResult(force){const S=st.fs?FSS:BASE;let pos;
 if(force){const sel=[0,1,2,3,4].sort(()=>Math.random()-.5).slice(0,force);pos=[0,1,2,3,4].map(r=>{const a=BASEP[r][sel.includes(r)?1:0];return a[Math.random()*a.length|0]})}
 else pos=S.map(s=>Math.random()*s.length|0);
 const g=pos.map((p,r)=>[0,1,2,3].map(k=>S[r][(p+k)%S[r].length]));return{g,pos,S}}
function evaluate(g,mult){const b=bet(),wins=[];
 LINES.forEach((L,li)=>{const base=g[0][L[0]];if(base=='S'||base=='W')return;let n=1,m=0;
  for(let r=1;r<5;r++){const id=g[r][L[r]];if(id==base||id=='W'){n++;if(id=='W')m+=mult[r+','+L[r]]||1}else break}
  if(n>=3){const amt=Math.round(PAYS[base][n-3]*b*(m||1)*100)/100;wins.push({li,base,n,m,amt,cells:L.slice(0,n).map((row,r)=>[r,row])})}});
 const sc=[];g.forEach((c,r)=>c.forEach((id,k)=>{if(id=='S')sc.push([r,k])}));
 const scPay=sc.length>=3?b*5:0;return{wins,sc,scPay,total:Math.round((wins.reduce((a,w)=>a+w.amt,0)+scPay)*100)/100}}
// ---------- fx helpers ----------
const fxEl=$('#fx'),stickyEl=$('#sticky');
function symEl(r,k){const s=stickyEl.querySelector(`[data-k="${r+','+k}"] .sym`);return s||stripEls[r].children[1+k]&&stripEls[r].children[1+k].firstElementChild}
/*BG*/
// ---------- fit (stage scaling + text auto-fit so long amounts never clip) ----------
const bgEl=$('#bg'),stages=$$('.stage');
function fitEl(e){if(!e)return;if(!e.dataset.fs)e.dataset.fs=parseFloat(getComputedStyle(e).fontSize);const base=+e.dataset.fs;e.style.fontSize=base+'px';
 const p=e.parentElement,cs=getComputedStyle(p),avail=p.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),w=e.scrollWidth;
 if(avail>0&&w>avail)e.style.fontSize=Math.floor(base*avail/w*20)/20*.98+'px'}
function setTxt(e,t){if(typeof e=='string')e=$(e);if(e.textContent!==t){e.textContent=t;fitEl(e)}}
function fitAll(root=document){root.querySelectorAll('.fit').forEach(fitEl)}
// Layouts: 'd' desktop 1920x1080 (original), 'l' phone/tablet landscape (wider stage, big side controls),
// 'p' portrait (1080 wide, reels on top, controls at the bottom). Stage size + scene transform are set here,
// CSS (.ml/.mp/.mob) positions the controls. Safe areas (notch, home bar) are respected.
const LAY={SW:W,SH:H,s:1,tx:0,ty:0,mode:'d',k:1};
const probe=document.createElement('div');probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.appendChild(probe);
const layEl=$('#lay'),sceneEl=$('#scene'),uiEl=$('#ui'),buyEls=[$('#buy'),$('#fsc')];
function placeBuy(){const t=LAY.mode=='p'?uiEl:sceneEl;buyEls.forEach(e=>{if(e.parentElement!==t)t.insertBefore(e,t==sceneEl?$('#pollen'):null)})}
function fit(){const cs=getComputedStyle(probe),iT=parseFloat(cs.paddingTop)||0,iR=parseFloat(cs.paddingRight)||0,iB=parseFloat(cs.paddingBottom)||0,iL=parseFloat(cs.paddingLeft)||0;
 const VW=innerWidth,VH=innerHeight,vw=Math.max(1,VW-iL-iR),vh=Math.max(1,VH-iT-iB),portrait=vh>vw*1.15,mob=!portrait&&(vh<=640||COARSE);
 let SW=W,SH=H,mode='d',s=1,tx=0,ty=0;
 if(portrait){mode='p';SW=1080;SH=Math.round(Math.min(2400,Math.max(1820,SW*vh/vw)));s=.95;tx=SW/2-960*s;ty=Math.round(Math.min(440,Math.max(312,(SH-1820)/2+312)))}
 else if(mob){mode='l';SH=1080;SW=Math.round(Math.min(2400,Math.max(1920,SH*vw/vh)));s=Math.min(1,(SW-520)/1720);tx=SW/2-960*s;ty=Math.round((H-H*s)/2)}
 const k=Math.min(vw/SW,vh/SH),ox=iL+(vw-SW*k)/2,oy=iT+(vh-SH*k)/2;Object.assign(LAY,{SW,SH,s,tx,ty,mode,k});
 const dc=document.documentElement,set=(n,v)=>dc.style.setProperty(n,v);
 dc.classList.toggle('mp',mode=='p');dc.classList.toggle('ml',mode=='l');dc.classList.toggle('mob',mode!='d');
 stages.forEach(e=>{e.style.width=SW+'px';e.style.height=SH+'px';e.style.transform=`translate(${ox}px,${oy}px) scale(${k})`});
 layEl.style.transform=mode=='d'?'':`translate(${tx}px,${ty}px) scale(${s})`;
 const rb=ty+(RY+RH)*s;
 set('--SW',SW+'px');set('--SH',SH+'px');set('--cx',tx+(RX+RW/2)*s+'px');set('--cy',ty+(RY+RH/2)*s+'px');set('--sunx',tx+SUNX*s+'px');set('--suny',ty+SUNY*s+'px');
 set('--rb',rb+'px');set('--ly',ty-300+'px');set('--my',Math.round(rb+Math.max(20,(SH-575-rb-150)/2))+'px');set('--iy',Math.round(Math.max(20,(SH-1720)/2))+'px');
 placeBuy();if(st.modal)placeModal($(st.modal));
 const ar=1536/1024;let bw=VW,bh=VW/ar;if(bh<VH){bh=VH;bw=VH*ar}bgEl.style.width=bw+'px';bgEl.style.height=bh+'px';BG.resize(bw,bh)}
let fitQ=0;const queueFit=()=>{if(!fitQ)fitQ=requestAnimationFrame(()=>{fitQ=0;fit()})};
addEventListener('resize',queueFit);addEventListener('orientationchange',()=>{queueFit();setTimeout(fit,350)});if(window.visualViewport)visualViewport.addEventListener('resize',queueFit);
// modals: on phones they are centred and scaled up so text stays readable
function placeModal(m){if(!m)return;if(LAY.mode=='d'){m.style.left=m.style.top=m.style.height='';gsap.set(m,{scale:1});return}
 m.style.left=m.style.top='0px';m.style.height='';const zp=2,w=m.offsetWidth;let h=m.offsetHeight;
 if(m.id=='infoPanel'){h=Math.round((LAY.SH-60)/Math.min(zp,(LAY.SW-40)/w));m.style.height=h+'px'}
 const z=Math.min(zp,(LAY.SW-40)/w,(LAY.SH-40)/h);m.style.left=(LAY.SW-w*z)/2+'px';m.style.top=(LAY.SH-h*z)/2+'px';gsap.set(m,{scale:z,transformOrigin:'0 0'})}
// ---------- UI ----------
function ui(){const b=bet(),price=r2(b*BUYX),low=st.bal<price-1e-9;
 setTxt('#bal',fmt(st.bal));setTxt('#betV',fmt(b));setTxt('#buyPrice',fmt(price));
 $('#bpLvl').textContent=st.lvl;$('#bpCoin').textContent=fmt(st.coin);setTxt('#bpTot',fmt(b));
 const lock=st.busy||!!st.fs||st.auto>0;['#minus','#plus'].forEach(s=>$(s).classList.toggle('dis',lock));
 $('#buy').classList.toggle('dis',lock);$('#buy').classList.toggle('low',low);
 $('#autoW').classList.toggle('dis',!!st.fs);const ab=$('#autoBtn');ab.classList.toggle('on',st.auto>0);$('#autoN').textContent=st.auto>0?st.auto:'';$('#autoL').textContent=st.auto>0?'СТОП':'АВТО';
 $('#spin').classList.toggle('auto',st.auto>0);
 $$('#turbo .dots b').forEach((d,i)=>d.classList.toggle('on',i<=st.mode));$('#turbo').classList.toggle('m2',st.mode==2);
 const ti=TOTALS.findIndex(t=>t[0]==b);$$('[data-st="tot-"]').forEach(x=>x.disabled=ti<=0);$$('[data-st="tot+"]').forEach(x=>x.disabled=ti>=TOTALS.length-1);
 $$('[data-st="lvl-"]').forEach(x=>x.disabled=st.lvl<=1);$$('[data-st="lvl+"]').forEach(x=>x.disabled=st.lvl>=10);$$('[data-st="coin-"]').forEach(x=>x.disabled=st.coin<=COINS[0]);$$('[data-st="coin+"]').forEach(x=>x.disabled=st.coin>=COINS[COINS.length-1]);
 setTxt('#byPrice',fmt(price));$('#byNote').textContent=`${BUYX}x от общей ставки ${fmt(b)}`;setTxt('#byBetV',fmt(b));setTxt('#buyOkT','КУПИТЬ ЗА '+fmt(price));
 $('#buyOk').disabled=low;$('#byWarn').classList.toggle('on',low)}
function setMsg(html,cls='plain'){$('#msg').innerHTML=cls=='raw'?html:`<span class="${cls}">${html}</span>`}
function winMsg(v){const e=$('#msg .wv');if(e)e.textContent=fmt(v);else setMsg(`<span class="wl2">ВЫИГРЫШ</span><span class="wv">${fmt(v)}</span>`,'raw')}
function idleMsg(){st.spins++;return st.spins%5==3?[COARSE?'УДЕРЖИВАЙТЕ КНОПКУ СПИНА ДЛЯ ТУРБО':'УДЕРЖИВАЙТЕ ПРОБЕЛ ДЛЯ ТУРБОСПИНА','small']:['ДЕЛАЙТЕ ВАШИ СТАВКИ!','plain']}
function toast(t){const e=$('#toast');e.textContent=t;gsap.killTweensOf(e);gsap.fromTo(e,{opacity:0,y:20},{opacity:1,y:0,duration:.25,ease:'power2.out'});gsap.to(e,{opacity:0,duration:.4,delay:1.6})}
function setSpinIcon(run){$('#spin').classList.toggle('run',run)}
const pop=(el,from,to)=>{gsap.set(el,{transition:'none'});return gsap.fromTo(el,from,Object.assign({clearProps:'transform,transition'},to))};
// ---------- win / land fx ----------
const NS='http://www.w3.org/2000/svg';
function dim(on){reelsEl.classList.toggle('dimmed',on);stickyEl.classList.toggle('dimmed',on)}
function unmark(){$$('#reels .sym.win,#sticky .sym.win').forEach(s=>s.classList.remove('win'))}
function mark(cells){cells.forEach(([r,k])=>{const e=symEl(r,k);if(e)e.classList.add('win')})}
function clearFx(){fxEl.innerHTML='';unmark();$$('#reels .sym,#sticky .sym').forEach(s=>{gsap.killTweensOf(s);gsap.set(s,{scale:1})});dim(false);$('#lineinfo').innerHTML=''}
function showBoxes(cells){fxEl.querySelectorAll('.wbox').forEach(b=>b.remove());const els=cells.map(([r,k])=>{const b=document.createElement('div');b.className='wbox';Object.assign(b.style,{left:colX(r)+3+'px',top:k*CH+3+'px',width:COLW-6+'px',height:CH-6+'px'});fxEl.appendChild(b);return b});
 if(els.length)gsap.from(els,{scale:1.25,opacity:0,duration:.3,ease:'back.out(2)',stagger:.012})}
function linePts(li){const L=LINES[li],p=L.map((row,r)=>[colX(r)+COLW/2,row*CH+CH/2]);return[[-16,p[0][1]],...p,[RW+16,p[4][1]]]}
function drawLines(ws,pill){fxEl.querySelectorAll('.lsvg,.lamt').forEach(e=>e.remove());if(!ws.length)return;
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','lsvg');svg.setAttribute('viewBox',`0 0 ${RW} ${RH}`);
 ws.forEach(w=>{const d='M'+linePts(w.li).map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');['lg','lm','lc'].forEach(c=>{const p=document.createElementNS(NS,'path');p.setAttribute('class',c);p.setAttribute('d',d);svg.appendChild(p)})});
 fxEl.insertBefore(svg,fxEl.firstChild);const ps=[...svg.querySelectorAll('path')];ps.forEach(p=>{const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L});
 gsap.to(ps,{strokeDashoffset:0,duration:curMode()==2?.22:.45,ease:'power2.out'});
 if(pill&&ws.length==1){const w=ws[0],[r,k]=w.cells[w.cells.length-1],e=document.createElement('div');e.className='lamt';e.textContent=fmt(w.amt);
  e.style.left=colX(r)+COLW/2+'px';e.style.top=k*CH+CH*.83+'px';fxEl.appendChild(e);gsap.from(e,{scale:.3,opacity:0,duration:.35,ease:'back.out(2.4)',delay:.15})}}
function pulse(cells,rep=3){cells.forEach(([r,k])=>{const e=symEl(r,k);if(!e)return;gsap.killTweensOf(e);gsap.fromTo(e,{scale:1},{scale:1.1,duration:.26,yoyo:true,repeat:rep,ease:'sine.inOut'});
 const m=e.querySelector('.mx');if(m)gsap.fromTo(m,{scale:1},{scale:1.3,duration:.26,yoyo:true,repeat:rep,ease:'sine.inOut'})})}
const cx=r=>colX(r)+COLW/2,cy=k=>k*CH+CH/2;
function at(x,y,cls){const h=document.createElement('div');h.style.cssText=`position:absolute;left:${x}px;top:${y}px`;const e=document.createElement('div');e.className=cls;h.appendChild(e);fxEl.appendChild(h);return[h,e]}
function burstAt(r,k){const[h,f]=at(cx(r),cy(k),'flash');gsap.fromTo(f,{scale:.2,opacity:1},{scale:1.6,opacity:0,duration:.6,ease:'power2.out',onComplete:()=>h.remove()})}
function ringAt(r,k,big){const[h,e]=at(cx(r),cy(k),'ringw');gsap.fromTo(e,{scale:.35,opacity:1},{scale:big?2.1:1.6,opacity:0,duration:big?.9:.65,ease:'power2.out',onComplete:()=>h.remove()})}
function sparksAt(x,y,n,col){if(st.battery)n=Math.min(n,4);else if(LITE)n=Math.ceil(n/2);for(let i=0;i<n;i++){const p=document.createElement('i');p.className='pt';if(col)p.style.background=col;fxEl.appendChild(p);const a=rand(0,Math.PI*2),d=rand(40,120);
 gsap.fromTo(p,{x,y,scale:rand(.6,1.3),opacity:1},{x:x+Math.cos(a)*d,y:y+Math.sin(a)*d-rand(10,40),opacity:0,scale:.2,duration:rand(.55,.95),ease:'power2.out',onComplete:()=>p.remove()})}}
function addAntic(r){const d=document.createElement('div');d.className='antic';d.dataset.r=r;Object.assign(d.style,{left:colX(r)+'px',width:COLW+'px'});
 for(let i=0,np=LITE?5:9;i<np;i++){const p=document.createElement('i');p.style.left=rand(6,COLW-12)+'px';p.style.animationDelay=-rand(0,1.1)+'s';p.style.animationDuration=rand(.8,1.4)+'s';d.appendChild(p)}
 fxEl.appendChild(d);gsap.from(d,{opacity:0,duration:.25});sfx.antic();
 st.antS.forEach(e=>e.classList.add('win'))}
function remAntic(r){const d=fxEl.querySelector(`.antic[data-r="${r}"]`);if(d)gsap.to(d,{opacity:0,duration:.2,onComplete:()=>d.remove()})}
function coins(n,ox=960,oy=520,spread=1,raw){if(st.battery)n=Math.min(n,8);else if(LITE)n=Math.min(n,16);const L=$('#coins');if(!raw){ox=LAY.tx+ox*LAY.s;oy=LAY.ty+oy*LAY.s}for(let i=0;i<n;i++){const c=document.createElement('div');c.className='coin';c.innerHTML='<i></i>';L.appendChild(c);const s=rand(.55,1.15),vx=(Math.random()-.5)*1300*spread,up=rand(280,720),dur=rand(1.4,2.2);
 gsap.set(c,{x:ox-33,y:oy-33,scale:s,rotation:rand(0,360)});const fl=gsap.to(c.firstChild,{scaleX:.08,duration:rand(.12,.3),yoyo:true,repeat:-1,ease:'sine.inOut'});
 const tl=gsap.timeline({delay:Math.random()*.3,onComplete:()=>{fl.kill();c.remove()}});tl.to(c,{x:'+='+vx,rotation:'+='+rand(-200,200),duration:dur,ease:'none'},0).to(c,{y:oy-33-up,duration:dur*.36,ease:'power2.out'},0).to(c,{y:LAY.SH+80,duration:dur*.64,ease:'power2.in'},dur*.36)}}
// ---------- spin ----------
function spinReel(r,R,mult,p,sp,plan){return new Promise(res=>{const S=R.S[r],L=S.length,pos=R.pos[r],strip=stripEls[r],clip=strip.parentElement;
 const n=Math.max(5,Math.ceil((p.dur*sp.px)/CH));const cur=st.grid[r];
 const ids=[S[(pos-1+L)%L],...R.g[r]];for(let i=0;i<n;i++)ids.push(S[(pos+4+i)%L]);ids.push(...cur);
 const ms=ids.map((id,i)=>id!='W'?0:i>=1&&i<=4?mult[r+','+(i-1)]:i>=ids.length-4?(st.mult[r+','+(i-ids.length+4)]||rmult()):rmult());
 strip.innerHTML=ids.map((id,i)=>cellHTML(id,ms[i])).join('');
 const y0=-(5+n)*CH,yEnd=-CH;gsap.set(strip,{y:y0});
 const tl=gsap.timeline({delay:r*sp.stag,onComplete:()=>{while(strip.children.length>5)strip.lastChild.remove();res()}});
 tl.to(strip,{y:y0-36,duration:sp.lift,ease:'power2.out'}).add(()=>{if(!st.battery)clip.classList.add('mb')})
  .to(strip,{y:yEnd+30,duration:p.dur,ease:'none'}).add(()=>{clip.classList.remove('mb');land(r,R,plan)})
  .to(strip,{y:yEnd,duration:.36,ease:'back.out(2.6)'});
 st.tls.push(tl)})}
function land(r,R,plan){sfx.stop(r);remAntic(r);let wild=false;
 R.g[r].forEach((id,k)=>{const c=stripEls[r].children[1+k],e=c&&c.firstElementChild;if(!e)return;
  if(id=='S'){st.landedS++;sfx.scatter(st.landedS);st.antS.push(e);gsap.fromTo(e,{scale:1.4},{scale:1,duration:.55,ease:'back.out(3)'});burstAt(r,k);ringAt(r,k);if(!st.quick)sparksAt(cx(r),cy(k),10)}
  else if(id=='W'&&!st.sticky[r+','+k]){wild=true;gsap.fromTo(e,{scale:1.22},{scale:1,duration:.45,ease:'back.out(3)'});const m=e.querySelector('.mx');if(m)gsap.fromTo(m,{scale:0,rotation:-140},{scale:1,rotation:0,duration:.55,ease:'back.out(2.6)',delay:.1})}});
 if(wild)sfx.wild();
 if(plan[r+1]&&plan[r+1].ant&&!st.quick)addAntic(r+1)}
function quickStop(){if(!st.spinning||st.quick)return;st.quick=true;fxEl.querySelectorAll('.antic').forEach(a=>a.remove());st.tls.forEach(t=>t.timeScale(6))}
function addSticky(list){list.forEach(([r,k])=>{const key=r+','+k;const d=document.createElement('div');d.className='stk';d.dataset.k=key;Object.assign(d.style,{left:colX(r)+'px',top:k*CH+'px',width:COLW+'px',height:CH+'px'});
 d.innerHTML='<i class="lk"></i>'+symHTML('W',st.sticky[key])+'<div class="flash"></div>';stickyEl.appendChild(d);const s=d.querySelector('.sym'),m=d.querySelector('.mx');
 gsap.fromTo(d.querySelector('.lk'),{opacity:0,scale:.6},{opacity:1,scale:1,duration:.4,ease:'back.out(2)'});
 gsap.fromTo(s,{scale:1.7,opacity:0},{scale:1,opacity:1,duration:.5,ease:'back.out(2.4)'});
 if(m)gsap.fromTo(m,{scale:0,rotationY:180},{scale:1,rotationY:0,duration:.6,ease:'back.out(2.2)',delay:.3});
 gsap.fromTo(d.querySelector('.flash'),{scale:.3,opacity:1},{scale:1.8,opacity:0,duration:.7,ease:'power2.out',onComplete(){this.targets()[0].remove()}})})}
async function stickyFX(list){const fast=curMode()==2;
 gsap.fromTo('#sunE',{scale:1},{scale:1.12,duration:.18,yoyo:true,repeat:1,ease:'power2.out'});
 list.forEach(([r,k])=>{const b=document.createElement('div');b.className='beam';const top=SUNY-RY,hgt=cy(k)-top;Object.assign(b.style,{left:cx(r)-COLW*.3+'px',width:COLW*.6+'px',top:top+'px',height:hgt+'px'});fxEl.appendChild(b);
  gsap.timeline({onComplete:()=>b.remove()}).fromTo(b,{scaleY:0,opacity:1},{scaleY:1,duration:fast?.16:.26,ease:'power2.in'}).to(b,{opacity:0,duration:.35})});
 await sleep(fast?160:260);addSticky(list);sfx.sticky();list.forEach(([r,k])=>{ringAt(r,k,true);sparksAt(cx(r),cy(k),12)});await sleep(fast?300:560)}
async function spin(opts={}){
 if(st.modal||st.blocking||introOn)return;
 if(st.busy){if(st.spinning)quickStop();else st.skip=true;return}
 const b=bet();
 if(!st.fs&&!opts.paid){if(st.bal<b-1e-9){toast('НЕДОСТАТОЧНО СРЕДСТВ');st.auto=0;ui();return}st.bal=r2(st.bal-b)}
 if(st.fs){st.fs.left--;st.fs.spun++;updFS()}
 if(st.auto>0&&!st.fs&&!opts.paid)st.auto--;
 st.busy=true;st.spinning=true;st.quick=false;st.skip=false;st.tls=[];st.landedS=0;st.antS=[];stopCycle();clearFx();ui();setSpinIcon(true);
 if(!st.fs)setMsg('УДАЧИ!');sfx.start();
 const R=genResult(opts.force);if(st.debug){R.g=st.debug.map(c=>c.slice());st.debug=null}
 if(st.fs)for(const key in st.sticky){const[r,k]=key.split(',').map(Number);R.g[r][k]='W'}
 const mult={};R.g.forEach((c,r)=>c.forEach((id,k)=>{if(id=='W'){const key=r+','+k;mult[key]=st.sticky[key]||rmult()}}));
 const sp=SPEEDS[curMode()];let extra=0,sc=0;const plan=[];
 for(let r=0;r<5;r++){const ant=sc>=2;if(ant)extra+=sp.ant;plan.push({ant,dur:sp.base+r*sp.step+extra});sc+=R.g[r].filter(x=>x=='S').length}
 await Promise.all(plan.map((p,r)=>spinReel(r,R,mult,p,sp,plan)));
 st.spinning=false;setSpinIcon(false);st.grid=R.g;st.mult=mult;
 if(st.fs){const nw=[];R.g.forEach((c,r)=>c.forEach((id,k)=>{const key=r+','+k;if(id=='W'&&!st.sticky[key]){st.sticky[key]=mult[key];nw.push([r,k])}}));if(nw.length)await stickyFX(nw)}
 const ev=evaluate(R.g,mult);let win=ev.total;
 if(st.fs){const cap=MAXWIN*b-st.fs.total;if(win>cap)win=Math.max(0,cap)}else win=Math.min(win,MAXWIN*b);
 if(ev.sc.length<3)st.antS.forEach(e=>e.classList.remove('win'));
 if(win>0){st.bal=r2(st.bal+win);if(st.fs){st.fs.total=r2(st.fs.total+win);updFS()}ui();await presentWin(ev,win)}
 else if(!st.fs){const[m,c]=idleMsg();setMsg(m,c)}
 if(ev.sc.length>=3){const n=FSN[Math.min(5,ev.sc.length)];
  if(!st.fs){await sleep(250);await scatterCelebrate(ev.sc);await transIn(n)}
  else{await scatterCelebrate(ev.sc,true);st.fs.left+=n;updFS(true);await banner(`+${n} ${spWord(n)}`)}}
 if(st.fs&&(st.fs.left<=0||st.fs.total>=MAXWIN*b)){await sleep(800);await fsOutro();await transOut()}
 st.busy=false;ui();
 if(st.fs){setTimeout(()=>spin(),curMode()==2?350:650);return}
 if(st.auto>0){setTimeout(()=>{if(st.auto>0&&!st.busy)spin()},curMode()==2?150:400);return}
 if(st.hold){setTimeout(()=>{if(st.hold&&!st.busy)spin()},80);return}
 if(ev.wins.length)startCycle(ev)}
async function presentWin(ev,win){const b=bet(),cells=new Map();
 ev.wins.forEach(w=>w.cells.forEach(([r,k])=>cells.set(r+','+k,[r,k])));if(ev.scPay)ev.sc.forEach(([r,k])=>cells.set(r+','+k,[r,k]));
 const cl=[...cells.values()];dim(true);mark(cl);showBoxes(cl);drawLines(ev.wins,ev.wins.length==1&&!ev.scPay);pulse(cl);sfx.win(win/b);
 const li=$('#lineinfo');
 if(ev.wins.length==1&&!ev.scPay)li.innerHTML=lineText(ev.wins[0]);
 else if(st.fs)li.innerHTML=fsTotText();
 else li.innerHTML=`${ev.wins.length?ev.wins.length+' '+plural(ev.wins.length,'ЛИНИЯ','ЛИНИИ','ЛИНИЙ'):''}${ev.scPay?(ev.wins.length?' · ':'')+'SCATTER ПЛАТИТ <b>'+fmt(ev.scPay)+'</b>':''}`;
 if(win>=b*15){await bigWin(win);winMsg(win)}
 else{if(win>=b*4)coins(Math.min(30,Math.round(win/b*2)),960,560,.8);await countUp(win)}
 if(st.fs&&ev.wins.length)li.innerHTML=fsTotText();
 await sleep(st.fs||st.auto>0||st.hold?(curMode()==2?250:500):150)}
const fsTotText=()=>'ВСЕГО ЗА БЕСПЛАТНЫЕ СПИНЫ: <b>'+fmt(st.fs.total)+'</b>';
function lineText(w){return`ЛИНИЯ ${w.li+1} · ${w.n}× ${SYM[w.base].n||w.base} · <b>${fmt(w.amt)}</b>${w.m>1?` · WILD x${w.m}`:''}`}
function countUp(v){return new Promise(res=>{const fast=curMode()==2,d=Math.min(2.4,.45+v/bet()*.14)*(fast?.45:1);const o={v:0};let last=0;
 const tw=gsap.to(o,{v,duration:d,ease:'power1.out',onUpdate(){winMsg(o.v);const now=performance.now();if(now-last>70){last=now;sfx.tick(o.v/v)}if(st.skip){tw.progress(1)}},onComplete(){winMsg(v);res()}})})}
function startCycle(ev){if(!ev.wins.length)return;let i=0;const go=()=>{const w=ev.wins[i%ev.wins.length];unmark();mark(w.cells);showBoxes(w.cells);drawLines([w],true);pulse(w.cells,1);$('#lineinfo').innerHTML=lineText(w);i++;st.cycleT=setTimeout(go,1800)};st.cycleT=setTimeout(go,ev.wins.length>1?1900:2600)}
function stopCycle(){clearTimeout(st.cycleT);st.cycleT=null}
async function scatterCelebrate(sc,short){dim(true);fxEl.querySelectorAll('.wbox,.lsvg,.lamt').forEach(e=>e.remove());sc.forEach(([r,k])=>{const e=symEl(r,k);if(!e)return;e.classList.add('win');gsap.killTweensOf(e);
 gsap.fromTo(e,{scale:1},{scale:1.2,duration:.28,yoyo:true,repeat:3,ease:'sine.inOut'});ringAt(r,k,true);sparksAt(cx(r),cy(k),14)});showBoxes(sc);sfx.scatter(5);await sleep(short?900:1400)}
// ---------- big win ----------
const veil=$('#veil');
function veilOn(on){veil.classList.toggle('on',on);gsap.to(veil,{opacity:on?1:0,duration:.3})}
function bigWin(v){return new Promise(res=>{const b=bet(),el=$('#big'),T=$('#bigT'),V=$('#bigV'),tiers=[[15,'БОЛЬШОЙ ВЫИГРЫШ'],[40,'МЕГА ВЫИГРЫШ'],[80,'ЭПИЧЕСКИЙ ВЫИГРЫШ']];
 const setT=t=>{T.dataset.t=t;T.querySelector('span').textContent=t};let tier=0;setT(tiers[0][1]);V.textContent=fmt(0);
 st.blocking=true;veilOn(true);el.style.display='flex';gsap.set(el,{opacity:1});sfx.big();
 const rays=gsap.to('#bigRays',{rotation:360,duration:14,repeat:-1,ease:'none'});const glow=gsap.fromTo('#bigGlow',{scale:.9,opacity:.75},{scale:1.08,opacity:1,duration:.9,yoyo:true,repeat:-1,ease:'sine.inOut'});
 gsap.fromTo('#bigRays',{scale:.3,opacity:0},{scale:1,opacity:1,duration:.8});
 gsap.fromTo('#bigLion',{scale:0,y:60},{scale:1,y:0,duration:.6,ease:'back.out(2)'});const lb=gsap.to('#bigLion',{y:-10,duration:1.3,yoyo:true,repeat:-1,ease:'sine.inOut',delay:.6});
 gsap.fromTo(T,{scale:0},{scale:1,duration:.6,ease:'back.out(2.2)',delay:.1});gsap.fromTo('#big .bv',{scale:.4,opacity:0},{scale:1,opacity:1,duration:.4,delay:.3});gsap.fromTo('#big .bskip',{opacity:0},{opacity:.8,duration:.4,delay:1});
 const rain=setInterval(()=>coins(st.battery?2:LITE?3:5,rand(.15,.85)*LAY.SW,-60,.25,true),LITE?240:180);coins(36,960,640,1.2);
 const o={v:0},maxT=v>=b*80?3:v>=b*40?2:1,dur=2.2+maxT*1.6;let done=false,closed=false,last=0,ct=null;
 const close=()=>{if(closed)return;closed=true;clearTimeout(ct);clearInterval(rain);veilOn(false);gsap.to([el,'#bigRays'],{opacity:0,duration:.35,onComplete:()=>{el.style.display='none';gsap.set(el,{opacity:1});rays.kill();glow.kill();lb.kill();st.blocking=false;res()}})};
 const finish=()=>{if(done){close();return}done=true;tw.kill();V.textContent=fmt(v);setT(tiers[maxT-1][1]);gsap.fromTo('#big .bv',{scale:1.25},{scale:1,duration:.4,ease:'back.out(3)'});ct=setTimeout(close,1900)};
 const tw=gsap.to(o,{v,duration:dur,ease:'power1.inOut',delay:.4,onUpdate(){V.textContent=fmt(o.v);const now=performance.now();if(now-last>60){last=now;sfx.tick(.5)}
  const nt=tiers.filter(t=>o.v>=b*t[0]).length;if(nt>tier+1&&nt<=maxT){tier=nt-1;setT(tiers[tier][1]);sfx.tier();gsap.fromTo(T,{scale:1.35},{scale:1,duration:.5,ease:'back.out(3)'});coins(24,960,520,1)}},onComplete:finish});
 el.onclick=()=>finish();st.bigSkip=finish})}
// ---------- popups ----------
function popup(html,{auto=0}={}){return new Promise(res=>{const P=$('#pop'),B=$('#popBox');B.innerHTML=html+'<i class="shw"><i class="shine"></i></i>';st.blocking=true;veilOn(true);P.style.display='flex';const t0=performance.now();
 const rays=gsap.to('#popRays',{rotation:360,duration:18,repeat:-1,ease:'none'});gsap.fromTo('#popRays',{opacity:0,scale:.4},{opacity:1,scale:1,duration:.7});gsap.fromTo(B,{scale:.3,opacity:0},{scale:1,opacity:1,duration:.55,ease:'back.out(1.8)'});
 const kids=[...B.children].filter(e=>!e.classList.contains('shw'));gsap.from(kids,{y:24,opacity:0,duration:.4,stagger:.07,delay:.2,ease:'power2.out'});
 let closed=false;const close=()=>{if(closed)return;closed=true;sfx.click();gsap.to(B,{scale:.6,opacity:0,duration:.25,ease:'power2.in'});gsap.to('#popRays',{opacity:0,duration:.25,onComplete:()=>{P.style.display='none';rays.kill();st.blocking=false;P.onclick=null;res(true)}});veilOn(false)};
 P.onclick=()=>{if(performance.now()-t0>600)close()};if(auto)setTimeout(close,auto)})}
const gtx=(t,c)=>`<div class="${c} gt" data-t="${t}"><span>${t}</span></div>`;
function fsIntro(n){sfx.fanfare();coins(30,960,500,1.1);
 return popup(`<i class="orn"></i>${gtx('ПОЗДРАВЛЯЕМ!','pt1')}<div class="pt2">ВЫ ВЫИГРАЛИ</div>${gtx(String(n),'pnumbig')}<div class="pt3">${fsWord(n)}</div><div class="pt4">WILD на барабанах 2–5 <b>залипают</b> со своим множителем <b>x2</b> или <b>x3</b> до конца раунда</div><div class="ptap">НАЖМИТЕ, ЧТОБЫ НАЧАТЬ</div>`,{auto:st.auto>0?4000:0})}
function fsOutro(){sfx.fanfare();coins(40,960,500,1.2);const v=st.fs.total,n=st.fs.spun;
 const p=popup(`<i class="orn"></i>${gtx('ПОЗДРАВЛЯЕМ!','pt1')}<div class="pt2">ВАШ ВЫИГРЫШ</div><span class="pamt" id="pAmt">${fmt(0)}</span><div class="pt3">ЗА ${n} ${fsWord(n)}</div><div class="ptap">НАЖМИТЕ, ЧТОБЫ ПРОДОЛЖИТЬ</div>`,{auto:st.auto>0?5000:0});
 const o={v:0};let last=0;gsap.to(o,{v,duration:Math.min(2.6,.6+v/bet()*.03),delay:.45,ease:'power1.out',onUpdate(){const e=$('#pAmt');if(e)e.textContent=fmt(o.v);const now=performance.now();if(now-last>80){last=now;sfx.tick(.4)}}});
 return p}
async function banner(t){const e=$('#banner');e.dataset.t=t;e.querySelector('span').textContent=t;sfx.tier();await gsap.timeline().fromTo(e,{opacity:0,scale:.3},{opacity:1,scale:1,duration:.45,ease:'back.out(2.5)'}).to(e,{opacity:0,y:-60,duration:.4,delay:1.1}).set(e,{y:0})}
// ---------- free spins: transition, enter/exit ----------
const TG=$('#trans .tGlow'),TR=$('#trans .tRays');
async function transIn(n){st.blocking=true;sfx.whoosh();SUN.speed(14,1.3);
 gsap.to('#sunE',{scale:1.3,duration:1.2,ease:'power2.in'});gsap.to('#scene',{scale:1.035,transformOrigin:'50% 10%',duration:1.3,ease:'power2.in'});
 gsap.set(TR,{opacity:0,scale:.2,rotation:0});gsap.to(TR,{opacity:.9,scale:1,duration:1.2,ease:'power2.in'});gsap.to(TR,{rotation:50,duration:2.6,ease:'none'});
 gsap.set(TG,{opacity:0,scale:.2});await gsap.to(TG,{opacity:1,scale:18,duration:1.1,ease:'power3.in',delay:.3});
 clearFx();enterFS(n);gsap.set('#scene',{scale:1});gsap.set('#sunE',{scale:1});SUN.speed(2.5,2);
 gsap.to(TR,{opacity:0,duration:1});await gsap.to(TG,{opacity:0,duration:.9,ease:'power2.out'});st.blocking=false;
 await fsIntro(n)}
async function transOut(){st.blocking=true;sfx.whoosh();gsap.set(TG,{opacity:0,scale:.2});await gsap.to(TG,{opacity:1,scale:18,duration:.75,ease:'power3.in'});
 exitFS();SUN.speed(1,1.6);await gsap.to(TG,{opacity:0,duration:.85,ease:'power2.out'});st.blocking=false}
function slideIn(el){el.classList.remove('off');pop(el,{x:-260,opacity:0},{x:0,opacity:1,duration:.6,ease:'back.out(1.6)'})}
function enterFS(n){st.fs={left:n,total:0,spun:0};st.sticky={};stickyEl.innerHTML='';$('#buy').classList.add('off');slideIn($('#fsc'));
 BG.dusk(true,1.2);reelsEl.classList.add('fsm');document.body.classList.add('fsmode');music.setMode('fs');updFS();setMsg('БЕСПЛАТНЫЕ СПИНЫ');ui()}
function exitFS(){st.fs=null;st.sticky={};gsap.to(stickyEl.children,{opacity:0,duration:.3,onComplete:()=>stickyEl.innerHTML=''});$('#fsc').classList.add('off');slideIn($('#buy'));
 BG.dusk(false,1.2);reelsEl.classList.remove('fsm');document.body.classList.remove('fsmode');music.setMode('base');clearFx();
 st.mult={};st.grid.forEach((c,r)=>c.forEach((id,k)=>{if(id=='W')st.mult[r+','+k]=rmult()}));setGrid(st.grid,st.mult);setMsg('ДЕЛАЙТЕ ВАШИ СТАВКИ!');ui()}
function updFS(pop){if(!st.fs)return;$('#fsN').textContent=st.fs.left;$('#fsL').textContent=st.fs.left==0?'ПОСЛЕДНИЙ СПИН':'ОСТАЛОСЬ';setTxt('#fsT',fmt(st.fs.total));
 if(pop)gsap.fromTo('#fsN',{scale:1.6},{scale:1,duration:.5,ease:'back.out(3)'})}
// ray texture (canvas instead of CSS mask: avoids compositor tile glitches)
const RAYS=(()=>{const N=1024,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),R=N/2;
 const rg=g.createRadialGradient(R,R,0,R,R,R);rg.addColorStop(0,'rgba(255,225,120,.55)');rg.addColorStop(.12,'rgba(255,215,100,.42)');rg.addColorStop(.45,'rgba(255,205,90,.18)');rg.addColorStop(.78,'rgba(255,200,80,0)');
 g.fillStyle=rg;const n=20,w=Math.PI*2/n;for(let k=0;k<n;k++){const a=k*w;g.beginPath();g.moveTo(R,R);g.arc(R,R,R,a,a+w/3);g.closePath();g.fill()}
 const gl=g.createRadialGradient(R,R,0,R,R,R*.42);gl.addColorStop(0,'rgba(255,240,180,.35)');gl.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=gl;g.fillRect(0,0,N,N);
 canvasURL(c,u=>$$('#popRays,#bigRays,.lRays,.iray,.byRays').forEach(e=>e.style.backgroundImage=u))})();
// ---------- modals ----------
function openModal(id){if(st.busy&&id!='#infoPanel'&&id!='#setPanel')return;closeModal();st.modal=id;const m=$(id);m.style.display='block';placeModal(m);veilOn(true);fitAll(m);gsap.fromTo(m,{opacity:0,y:30},{opacity:1,y:0,duration:.25,ease:'power2.out'});sfx.click()}
function closeModal(){if(!st.modal)return;const m=$(st.modal);m.style.display='none';st.modal=null;veilOn(false)}
veil.addEventListener('click',()=>{if(st.modal)closeModal()});
$$('[data-close]').forEach(b=>b.onclick=()=>{sfx.click();closeModal()});
function setTotalIdx(i){i=Math.max(0,Math.min(TOTALS.length-1,i));[st.lvl,st.coin]=TOTALS[i][1]}
function betLocked(){return st.busy||!!st.fs||st.auto>0}
function stepBet(kind){if(betLocked())return;const ti=TOTALS.findIndex(t=>t[0]==bet());
 if(kind=='tot+')setTotalIdx(ti+1);if(kind=='tot-')setTotalIdx(ti-1);
 if(kind=='lvl+')st.lvl=Math.min(10,st.lvl+1);if(kind=='lvl-')st.lvl=Math.max(1,st.lvl-1);
 const ci=COINS.indexOf(st.coin);if(kind=='coin+')st.coin=COINS[Math.min(COINS.length-1,ci+1)];if(kind=='coin-')st.coin=COINS[Math.max(0,ci-1)];
 sfx.click();ui();if(st.modal)fitAll($(st.modal));gsap.fromTo('#betV',{scale:1.25,color:'#ffd23a'},{scale:1,color:'#fff',duration:.35});
 if(st.modal=='#buyPanel')gsap.fromTo('#byPrice',{scale:1.12},{scale:1,duration:.3,ease:'back.out(3)'});stopCycle();clearFx()}
$$('[data-st]').forEach(b=>b.onclick=()=>stepBet(b.dataset.st));
$('#maxBet').onclick=()=>{if(betLocked())return;setTotalIdx(TOTALS.length-1);sfx.click();ui();closeModal()};
$('#minus').onclick=()=>{if(betLocked())return;stepBet('tot-');openModal('#betPanel')};$('#plus').onclick=()=>{if(betLocked())return;stepBet('tot+');openModal('#betPanel')};$('#betRow').onclick=()=>{if(!betLocked())openModal('#betPanel')};
// autoplay
const AOPTS=[10,20,30,50,70,100,500,1000];$('#agrid').innerHTML=AOPTS.map(n=>`<button data-a="${n}">${n}</button>`).join('');
function updAutoPanel(){$$('#agrid button').forEach(b=>b.classList.toggle('sel',+b.dataset.a==st.autoSel));$('#autoStart').textContent=`НАЧАТЬ АВТОИГРУ (${st.autoSel})`;$('#autoTurbo').classList.toggle('on',st.autoTurbo)}
$$('#agrid button').forEach(b=>b.onclick=()=>{st.autoSel=+b.dataset.a;sfx.click();updAutoPanel()});
$('#autoTurbo').onclick=()=>{st.autoTurbo=!st.autoTurbo;sfx.click();updAutoPanel()};
$('#autoStart').onclick=()=>{st.auto=st.autoSel;closeModal();ui();spin()};
$('#autoBtn').onclick=()=>{if(st.fs)return;if(st.auto>0){st.auto=0;sfx.click();ui();return}if(st.busy)return;updAutoPanel();openModal('#autoPanel')};
$('#turbo').onclick=()=>{st.mode=(st.mode+1)%3;save('mode',st.mode);sfx.click();ui();toast(['ОБЫЧНЫЕ СПИНЫ','БЫСТРЫЕ СПИНЫ','ТУРБОСПИНЫ'][st.mode])};
// settings
function updSet(){$$('[data-set]').forEach(b=>b.classList.toggle('on',!!st[b.dataset.set]));document.body.classList.toggle('battery',st.battery);$('#fullSw').classList.toggle('on',!!fsEl())}
$$('[data-set]').forEach(b=>b.onclick=()=>{const k=b.dataset.set;st[k]=!st[k];save(k,st[k]);sfx.click();updSet();applyAudio();if(k=='battery')BG.battery(st.battery);if(k=='intro')skipNext=!st.intro});
function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement}
const FS_OK=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);
function goFull(on){const d=document,e=d.documentElement;try{if(!on){const x=d.exitFullscreen||d.webkitExitFullscreen;if(fsEl()&&x)x.call(d)}else if(!fsEl()){const r=(e.requestFullscreen||e.webkitRequestFullscreen).call(e);if(r&&r.catch)r.catch(()=>{})}}catch(x){}}
if(!FS_OK)$('#fullSw').closest('.tgl').style.display='none';
$('#fullSw').onclick=()=>{sfx.click();goFull(!fsEl())};
['fullscreenchange','webkitfullscreenchange'].forEach(t=>document.addEventListener(t,()=>{updSet();setTimeout(fit,60)}));
$('#menuBtn').onclick=()=>{updSet();openModal('#setPanel')};
$('#sndBtn').onclick=()=>{audioInit();const on=!(st.sfx||st.music);st.sfx=on;st.music=on;save('sfx',on);save('music',on);applyAudio();updSet();if(on)sfx.click()};
// info pages
let page=0;const ico=id=>`<svg class="ii"><use href="#${id}"/></svg>`;
function buildInfo(){const b=bet(),pv=id=>PAYS[id].map((v,i)=>[i+3,v*b]).reverse().map(([n,v])=>`<i>${n}</i> ${fmt(v)}`).join('<br>');
 const hi=['H1','H2','H3','H4','M1','M2'].map(id=>`<div class="pi"><div class="ic">${symHTML(id)}</div><div class="pv">${pv(id)}</div></div>`).join('');
 const lo=['A','K','Q','J','T'].map(id=>`<div class="pi"><div class="ic">${symHTML(id)}</div><div class="pv">${pv(id)}</div></div>`).join('');
 const lg=LINES.map((L,i)=>`<div class="ln">${i+1}<div class="mini">${[0,1,2,3].map(row=>[0,1,2,3,4].map(c=>`<i class="${L[c]==row?'on':''}"></i>`).join('')).join('')}</div></div>`).join('');
 $('#pages').innerHTML=`
 <div class="page"><div class="ph">ТАБЛИЦА ВЫПЛАТ</div><div class="psub">Все символы оплачиваются слева направо на смежных барабанах, начиная с крайнего левого. Значения указаны для текущей ставки ${fmt(b)}.</div><div class="ptab">${hi}</div><div class="ptab l">${lo}</div></div>
 <div class="page"><div class="ph">ОСОБЫЕ СИМВОЛЫ</div>
  <div class="prow"><div class="ic">${symHTML('W',3)}</div><div>Это символ <b>WILD</b>. Он заменяет все символы, кроме SCATTER, и появляется только на барабанах 2, 3, 4 и 5.<br>Каждый выпавший WILD получает случайный множитель <b>x2</b> или <b>x3</b> (медальон в углу символа), который применяется ко всем выигрышным комбинациям с этим символом. Если в комбинации несколько WILD, их множители суммируются.</div></div>
  <div class="prow"><div class="ic">${symHTML('S')}</div><div>Это символ <b>SCATTER</b> — Лапа Льва. Он появляется на всех барабанах и оплачивается в любом месте.<br>3, 4 или 5 символов SCATTER запускают <b>8, 12 или 16 БЕСПЛАТНЫХ СПИНОВ</b> и платят 5x от общей ставки.</div></div>
  <div class="ptxt"><h3>БЕСПЛАТНЫЕ СПИНЫ</h3>Во время бесплатных спинов все символы WILD, выпавшие на барабанах 2, 3, 4 и 5, становятся <b>ЛИПКИМИ</b> и остаются на экране со своим множителем до конца раунда.<br>3 и более символа SCATTER во время раунда добавляют ещё 8, 12 или 16 бесплатных спинов.
  <h3>ПОКУПКА БЕСПЛАТНЫХ СПИНОВ</h3>Раунд бесплатных спинов можно мгновенно запустить из основной игры, купив его за <b>${BUYX}x</b> от общей ставки (сейчас ${fmt(b*BUYX)}). Перед покупкой открывается окно подтверждения с точной стоимостью. В запускающем спине выпадает 3, 4 или 5 символов SCATTER.</div></div>
 <div class="page"><div class="ph">ПРАВИЛА ИГРЫ</div><div class="psub">40 фиксированных линий выплат · Высокая волатильность</div><div class="lgrid">${lg}</div>
  <div class="ptxt" style="font-size:17px;line-height:1.55">Оплачивается только самый крупный выигрыш на линии. Выигрыши на разных линиях суммируются. Максимальный выигрыш ограничен <b>${MAXWIN.toLocaleString('ru-RU')}x</b> от ставки.<br>Заявленный RTP прототипа: <b>96,2%</b> · Минимальная ставка: <b>${fmt(TOTALS[0][0])}</b> · Максимальная ставка: <b>${fmt(TOTALS[TOTALS.length-1][0])}</b><br>Клавиши ПРОБЕЛ и ВВОД запускают спин и останавливают барабаны, ESC закрывает окна. Неисправность аннулирует все выплаты и игры.</div></div>
 <div class="page"><div class="ph">КАК ИГРАТЬ</div><div class="ptxt howto">
  <p>${ico('iMinus')}${ico('iPlus')} Изменить ставку — откроется меню ставок.</p>
  <p>${ico('iSpin')} Круглая кнопка <b>СПИН</b> запускает игру. Повторное нажатие мгновенно останавливает барабаны.</p>
  <p>${ico('iTurbo')} Скорость: обычные, быстрые и турбоспины. Удерживайте <b>ПРОБЕЛ</b> (на телефоне — кнопку спина) для турбоспина.</p>
  <p>${ico('iAuto')} <b>АВТОИГРА</b> — меню автоигры. Нажмите «Стоп» или кнопку спина, чтобы остановить.</p>
  <p>${ico('iMenu')} Настройки: музыка, звуки, экономия батареи, заставка, полный экран. ${ico('iSnd')} — быстро выключить звук.</p>
  <p>Напротив ярлыков <b>КРЕДИТ</b> и <b>СТАВКА</b> отображаются текущий баланс и общая ставка.</p></div></div>`;
 $('#pDots').innerHTML=$$('#pages .page').map((_,i)=>`<i data-p="${i}"></i>`).join('');$$('#pDots i').forEach(d=>d.onclick=()=>{sfx.click();showPage(+d.dataset.p)});showPage(page)}
function showPage(i){const P=$$('#pages .page');page=(i+P.length)%P.length;P.forEach((p,j)=>p.classList.toggle('on',j==page));$$('#pDots i').forEach((d,j)=>d.classList.toggle('on',j==page))}
$('#pPrev').onclick=()=>{sfx.click();showPage(page-1)};$('#pNext').onclick=()=>{sfx.click();showPage(page+1)};
$('#infoBtn').onclick=()=>{buildInfo();openModal('#infoPanel')};
// buy feature: confirmation window with exact price, bet stepper and balance check
function openBuy(){if(st.busy||st.fs||st.modal||st.auto>0||st.blocking)return;ui();openModal('#buyPanel');
 gsap.fromTo('#buyPanel .byS',{scale:.5,rotation:-25},{scale:1,rotation:0,duration:.7,ease:'back.out(2)'});gsap.fromTo('#buyPanel .byRays',{rotation:0},{rotation:90,duration:12,ease:'none'})}
$('#buy').onclick=openBuy;
$('#buyOk').onclick=()=>{const price=r2(bet()*BUYX);if(st.bal<price-1e-9){toast('НЕДОСТАТОЧНО СРЕДСТВ');return}closeModal();st.bal=r2(st.bal-price);ui();sfx.buy();
 gsap.fromTo('#bal',{scale:1.2,color:'#ffd23a'},{scale:1,color:'#fff',duration:.4});const r=Math.random();spin({paid:true,force:r<.8?3:r<.97?4:5})};
// spin controls
const spinBtn=$('#spin');let lpT=0,lpOn=false;
spinBtn.addEventListener('pointerdown',e=>{if(e.pointerType=='mouse')return;clearTimeout(lpT);lpOn=false;lpT=setTimeout(()=>{if(st.auto>0||st.fs||st.modal||st.blocking||introOn)return;lpOn=true;st.hold=true;audioInit();if(!st.busy)spin()},450)});
['pointerup','pointercancel','pointerleave'].forEach(t=>spinBtn.addEventListener(t,()=>{clearTimeout(lpT);st.hold=false}));
spinBtn.addEventListener('contextmenu',e=>e.preventDefault());
spinBtn.onclick=()=>{if(lpOn){lpOn=false;return}audioInit();if(st.auto>0){st.auto=0;ui();if(st.spinning)quickStop();return}spin()};
addEventListener('keydown',e=>{const c=e.code;
 if(c=='Escape'){if(st.modal){sfx.click();closeModal()}return}
 if(c!='Space'&&c!='Enter'&&c!='NumpadEnter')return;e.preventDefault();if(e.repeat){if(c=='Space')st.hold=true;return}
 const S=$('#studio');if(S.style.display!='none'){if(S.onclick)S.onclick();return}if(introOn){goGame();return}
 if(st.blocking){if($('#big').style.display=='flex'&&st.bigSkip)st.bigSkip();else if($('#pop').style.display=='flex'&&$('#pop').onclick)$('#pop').onclick();return}
 if(st.modal){closeModal();return}spin()});
addEventListener('keyup',e=>{if(e.code=='Space')st.hold=false});
// ---------- intro (feature screen) ----------
let skipNext=!st.intro,introTw=[];
$('.iart .ws.w1').innerHTML=symHTML('W',2);$('.iart .ws.w2').innerHTML=symHTML('W',3);
$('#iChk').onclick=()=>{skipNext=!skipNext;$('#iChk').classList.toggle('on',skipNext);$('#iChk').setAttribute('aria-checked',skipNext);sfx.click()};
function startIntro(){introOn=true;const I=$('#intro');I.style.display='block';gsap.set(I,{opacity:1});gsap.set('#ui',{opacity:0,pointerEvents:'none'});gsap.set('#buy',{opacity:0});gsap.set('#scene',{scale:.94});
 $('#iChk').classList.toggle('on',skipNext);$('#iChk').setAttribute('aria-checked',skipNext);
 gsap.timeline().fromTo('#iShade',{opacity:0},{opacity:1,duration:.6})
  .fromTo('#iLogo .l2',{scale:2,opacity:0},{scale:1,opacity:1,duration:.9,ease:'back.out(1.5)'},.1)
  .fromTo('#iLogo .l1',{y:-40,opacity:0},{y:0,opacity:1,duration:.5,ease:'power2.out'},.45)
  .from('#iLogo .l3',{opacity:0,letterSpacing:'1.4em',duration:.8,ease:'power2.out'},.6)
  .fromTo('#iLogo .lRays',{opacity:0,scale:.4},{opacity:.55,scale:1,duration:1.2,ease:'power2.out'},.1)
  .fromTo('.icard',{y:80,opacity:0},{y:0,opacity:1,duration:.65,stagger:.12,ease:'back.out(1.5)',clearProps:'transform'},.5)
  .fromTo('#iPlay',{scale:0,opacity:0},{scale:1,opacity:1,duration:.6,ease:'back.out(2)',clearProps:'transform'},1.05)
  .fromTo(['#iChk','#iNote'],{opacity:0},{opacity:1,duration:.5,clearProps:'opacity'},1.2);
 introTw=[gsap.to('#iLogo .lRays',{rotation:360,duration:50,repeat:-1,ease:'none'}),gsap.to('.iray',{rotation:360,duration:30,repeat:-1,ease:'none'}),
  gsap.to('.iart .ws.w2',{y:-8,duration:1.5,yoyo:true,repeat:-1,ease:'sine.inOut'}),gsap.to('.iart .ws.w1',{y:-6,duration:1.8,yoyo:true,repeat:-1,ease:'sine.inOut',delay:.4}),
  gsap.to('.isc',{scale:1.06,duration:1.1,yoyo:true,repeat:-1,ease:'sine.inOut'}),gsap.to('.ih1',{y:-8,duration:1.7,yoyo:true,repeat:-1,ease:'sine.inOut'})];
 $$('.iart .mx').forEach((m,i)=>introTw.push(gsap.to(m,{scale:1.18,duration:.6,yoyo:true,repeat:-1,ease:'sine.inOut',delay:i*.3})))}
function goGame(){if(!introOn)return;introOn=false;st.intro=!skipNext;save('intro',st.intro);updSet();sfx.click();
 const tl=gsap.timeline();tl.to('#intro',{opacity:0,duration:.45,onComplete:()=>{$('#intro').style.display='none';introTw.forEach(t=>t.kill());introTw=[]}})
  .fromTo('#scene',{scale:.94},{scale:1,duration:.9,ease:'power3.out',clearProps:'transform'},.1)
  .to('#ui',{opacity:1,duration:.5,onComplete:()=>gsap.set('#ui',{pointerEvents:'none'})},.35)
  .add(()=>{pop('#spin',{scale:0,rotation:-180},{scale:1,rotation:0,duration:.7,ease:'back.out(1.8)'});pop('#buy',{x:-240,opacity:0},{x:0,opacity:1,duration:.7,ease:'back.out(1.6)'});
   pop(['#minus','#plus'],{scale:0},{scale:1,duration:.4,ease:'back.out(2)',stagger:.08});pop(['#lgroup','#credit'],{y:40,opacity:0},{y:0,opacity:1,duration:.5,stagger:.08,ease:'power2.out'})},.4)}
$('#iPlay').onclick=goGame;
// ---------- studio splash ----------
function mane(g,n,r0,r1,w,off){let s='';const P=(a,r)=>(120+Math.cos(a)*r).toFixed(1)+' '+(124+Math.sin(a)*r).toFixed(1);
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2+off;s+=`<path d="M${P(a-w,r0)}Q${P(a-w*.95,(r0+r1)*.52)} ${P(a+w*.4,r1)}Q${P(a+w*1.05,(r0+r1)*.5)} ${P(a+w,r0)}Z"/>`}g.innerHTML=s}
function dust(){const c=$('#dust'),g=c.getContext('2d');let raf=0;const P=[];const rs=()=>{c.width=innerWidth>>1;c.height=innerHeight>>1};rs();addEventListener('resize',rs);
 const sp=document.createElement('canvas');sp.width=sp.height=32;const sg=sp.getContext('2d'),gr=sg.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,232,160,1)');gr.addColorStop(.35,'rgba(255,205,110,.45)');gr.addColorStop(1,'rgba(255,190,80,0)');sg.fillStyle=gr;sg.fillRect(0,0,32,32);
 for(let i=0;i<60;i++)P.push({x:Math.random(),y:Math.random(),r:rand(.6,2.4),v:rand(.004,.018),ph:rand(0,6.3),dx:rand(-.004,.004)});
 let lt=0;const f=t=>{raf=requestAnimationFrame(f);if(t-lt<32)return;lt=t;g.clearRect(0,0,c.width,c.height);
  for(const p of P){p.y-=p.v/30;p.x+=p.dx/30;if(p.y<-.02){p.y=1.02;p.x=Math.random()}const R=p.r*(c.height/350)*3;g.globalAlpha=Math.max(0,.3+.4*Math.sin(t/700+p.ph));g.drawImage(sp,p.x*c.width-R,p.y*c.height-R,R*2,R*2)}};
 raf=requestAnimationFrame(f);return()=>{cancelAnimationFrame(raf);removeEventListener('resize',rs)}}
function studio(){const S=$('#studio');gsap.set(['#bg','#stage'],{visibility:'hidden'});mane($('#sManeB'),18,50,114,.2,0);mane($('#sManeF'),18,48,94,.17,Math.PI/18);const stopDust=dust();let ready=false;
 const tl=gsap.timeline({delay:.15});
 tl.fromTo('#sGlow',{opacity:0,scale:.5},{opacity:1,scale:1,duration:1.4,ease:'power2.out'},0)
  .fromTo('#sLogo',{scale:.2,opacity:0,rotation:-25},{scale:1,opacity:1,rotation:0,duration:1.1,ease:'back.out(1.6)'},.1)
  .fromTo('#sManeB',{rotation:-120,scale:.5,transformOrigin:'50% 51.67%'},{rotation:0,scale:1,duration:1.5,ease:'power3.out'},.1)
  .fromTo('#sManeF',{rotation:120,scale:.5,transformOrigin:'50% 51.67%'},{rotation:0,scale:1,duration:1.5,ease:'power3.out'},.1)
  .fromTo('#sFace',{y:-26,opacity:0},{y:0,opacity:1,duration:.7,ease:'back.out(2)'},.55)
  .fromTo('#sName',{clipPath:'inset(0% 100% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:.9,ease:'power2.inOut'},.9)
  .fromTo('#sName span',{backgroundPosition:'100% 0%'},{backgroundPosition:'0% 0%',duration:1.8,ease:'power1.inOut'},.95)
  .from('#sSub',{opacity:0,letterSpacing:'1.6em',duration:1,ease:'power2.out'},1.2)
  .fromTo('#sFlare',{opacity:0,scaleX:.1},{opacity:1,scaleX:1,duration:.5,ease:'power2.out'},1.15).to('#sFlare',{opacity:0,duration:.9},1.7)
  .fromTo('#sBar i',{width:'0%'},{width:'100%',duration:1.7,ease:'power1.inOut'},.5);
 const idle=[gsap.to('#sManeB',{rotation:'+=360',duration:70,repeat:-1,ease:'none',delay:1.7}),gsap.to('#sManeF',{rotation:'-=360',duration:90,repeat:-1,ease:'none',delay:1.7}),
  gsap.to('#sGlow',{scale:1.08,duration:2.4,yoyo:true,repeat:-1,ease:'sine.inOut',delay:1.5})];
 Promise.all([document.fonts?document.fonts.ready:0,new Promise(r=>tl.eventCallback('onComplete',r))]).then(()=>{ready=true;gsap.to('#sBar',{opacity:0,duration:.4});gsap.fromTo('#sTap',{opacity:0},{opacity:1,duration:.4});gsap.to('#sTap',{opacity:.35,duration:.8,yoyo:true,repeat:-1,delay:.4})});
 S.onclick=()=>{if(!ready)return;S.onclick=null;if(COARSE&&FS_OK)goFull(true);const show=()=>{gsap.set(['#bg','#stage'],{visibility:'visible'});BG.start()};if(!COARSE)show();audioInit();applyAudio();gsap.killTweensOf('#sTap');
  gsap.to('#sWrap',{scale:1.08,duration:.6,ease:'power2.in'});gsap.to(S,{opacity:0,duration:.6,delay:.1,onComplete:()=>{S.style.display='none';tl.kill();idle.forEach(t=>t.kill());if(!COARSE)stopDust()}});
  const go=()=>{if(st.intro)startIntro();else{introOn=true;gsap.set('#ui',{opacity:0,pointerEvents:'none'});gsap.set('#buy',{opacity:0});goGame()}};
  // phones: don't build the game scene + intro in the same frames as the splash fade / fullscreen resize
  // (that peak of GPU memory and layout work crashed mobile browsers right after the first tap)
  if(COARSE){stopDust();introOn=true;setTimeout(()=>{fit();show();go()},700)}else go()}}
// ---------- init ----------
(()=>{const R=genResult();const m={};R.g.forEach((c,r)=>c.forEach((id,k)=>{if(id=='W')m[r+','+k]=rmult()}));setGrid(R.g,m)})();
fit();updSet();ui();BG.init();ambient();studio();applyAudio();
window.__pol={st,spin,setGrid,evaluate,bigWin,enterFS,exitFS,fsIntro,fsOutro,transIn,transOut,addSticky,stickyFX,showBoxes,coins,genResult,ui,fitAll,BG,SUN,openBuy,goGame,LINES,TOTALS};
})();
