// ---------- living background: WebGL (foliage/grass sway, water ripples & glints, cloud shadows, dusk grade) ----------
// Falls back to the static CSS image + #tint when WebGL is unavailable. Capped at 30 fps, frozen in battery mode.
const BG=(()=>{const cv=$('#bgc'),host={w:0,h:0};let gl=null,ok=false,raf=0,last=0;const U={},t0=performance.now(),D={v:0};
 const kb=gsap.to('#bgimg',{scale:1.04,x:-14,duration:26,yoyo:true,repeat:-1,ease:'sine.inOut',paused:true});
 const VS='attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
 const FS=`precision mediump float;varying vec2 v;uniform sampler2D uI,uM;uniform float uT,uD,uZ;uniform vec2 uP;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
void main(){vec2 uv=(v-.5)/uZ+.5+uP;vec3 m=texture2D(uM,uv).rgb;float t=uT;
 float gust=.55+.45*sin(t*.31+uv.x*3.)*sin(t*.17+1.3);
 vec2 d=m.r*vec2(sin(t*1.25+uv.y*22.+uv.x*7.)+.6*sin(t*2.1+uv.x*31.),.6*cos(t*1.05+uv.x*19.+uv.y*5.))*.0015*(.6+gust);
 d+=m.b*vec2(sin(t*1.8+uv.x*38.+uv.y*14.)*(.7+gust)*.0012,0.);
 d+=m.g*vec2(sin(t*1.4+uv.y*190.)*.0009,sin(t*.9+uv.x*70.+uv.y*120.)*.0006);
 vec3 c=texture2D(uI,uv+d).rgb;
 float sp=n(vec2(uv.x*260.+t*1.6,uv.y*520.))*n(vec2(uv.x*180.-t*1.1,uv.y*380.+t*.7));
 c+=m.g*pow(sp,6.)*2.4*vec3(1.,.96,.84)*(1.-.6*uD);
 float cs=n(vec2(uv.x*2.2-t*.018,uv.y*3.5+t*.006))*.6+n(vec2(uv.x*5.-t*.03,uv.y*7.))*.4;
 c*=1.-smoothstep(.5,.62,uv.y)*.085*smoothstep(.45,.75,cs);
 vec2 q=uv-vec2(.96,0.);float an=atan(q.y,q.x),r=length(q*vec2(1.5,1.));
 c+=pow(.5+.5*sin(an*26.+t*.08)*sin(an*11.-t*.05),3.)*smoothstep(1.,.1,r)*.05*vec3(1.,.93,.75)*(1.-uD);
 vec3 g1=vec3(.47,.16,.67),g2=vec3(1.,.47,.24),g3=vec3(.43,.08,.24);
 vec3 gr=uv.y<.55?mix(g1,g2,uv.y/.55):mix(g2,g3,(uv.y-.55)/.45);float ga=uv.y<.55?mix(.85,.55,uv.y/.55):mix(.55,.8,(uv.y-.55)/.45);
 c*=mix(vec3(1.),gr,ga*.55*uD);c+=uD*.035*vec3(.5,.2,.6);
 gl_FragColor=vec4(c,1.);}`;
 function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
 function tex(src,unit){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));res(t)};im.onerror=rej;im.src=src})}
 function draw(now){if(!ok)return;const t=(now-t0)/1000;gl.viewport(0,0,cv.width,cv.height);gl.uniform1f(U.uT,t);gl.uniform1f(U.uD,D.v);
  gl.uniform1f(U.uZ,1.04+.015*Math.sin(t*.12));gl.uniform2f(U.uP,.005*Math.sin(t*.07),.0025*Math.sin(t*.05));gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
 // one rAF loop: draws the shader at <=30 fps and watches frame times. If the device can't keep ~30 fps the
 // background first drops resolution, then freezes (static frame / static image) so the game itself stays smooth.
 let want=false,cap=LITE?1000:1600,lvl=0,acc=0,cnt=0,lastF=0;
 function degrade(){lvl++;if(ok&&lvl==1){cap=LITE?720:900;size();return}stop();want=false;kb.pause();if(ok)draw(performance.now());console.info('[bg] slow device: background animation frozen')}
 function loop(){if(raf||!want)return;lastF=0;acc=cnt=0;const f=now=>{raf=requestAnimationFrame(f);
  if(lastF){const dt=Math.min(now-lastF,1000);if(dt<5000){acc+=dt;cnt++}if(acc>2500&&cnt>1){const avg=acc/cnt;acc=cnt=0;if(avg>31)return degrade()}}lastF=now;
  if(!ok||now-last<32)return;last=now;draw(now)};raf=requestAnimationFrame(f)}
 function stop(){cancelAnimationFrame(raf);raf=0}
 function size(w,h){if(w){host.w=w;host.h=h}const W0=host.w||innerWidth,H0=host.h||innerHeight,k=Math.min(devicePixelRatio||1,LITE?1:1.5),pw=Math.min(Math.round(W0*k),cap);
  if(cv.width!=pw){cv.width=pw;cv.height=Math.round(pw*H0/W0)}if(ok&&!raf)draw(performance.now())}
 async function init(){if(COARSE&&!/[?&]gl=1/.test(location.search)){kb.pause();lvl=2;console.info('[bg] touch device: static background');return}try{gl=cv.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});if(!gl)return;
  const di=gl.getExtension('WEBGL_debug_renderer_info'),ren=di?String(gl.getParameter(di.UNMASKED_RENDERER_WEBGL)):'';
  if(/swiftshader|llvmpipe|softpipe|software|basic render/i.test(ren)&&!/[?&]gl=1/.test(location.search)){console.info('[bg] software GL ('+ren+'): using static background');kb.pause();lvl=2;return}
  const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('link');gl.useProgram(p);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const la=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
  ['uI','uM','uT','uD','uZ','uP'].forEach(n=>U[n]=gl.getUniformLocation(p,n));
  const src=getComputedStyle($('#bgimg')).backgroundImage.replace(/^url\(["']?/,'').replace(/["']?\)$/,'');
  await tex(src,0);await tex('__MASK__',1);gl.uniform1i(U.uI,0);gl.uniform1i(U.uM,1);
  ok=true;kb.pause();document.body.classList.add('gl');size();draw(performance.now())}
  catch(e){console.warn('[bg] WebGL disabled:',e&&e.message);ok=false;document.body.classList.remove('gl')}}
 cv.addEventListener('webglcontextlost',e=>{e.preventDefault();ok=false;document.body.classList.remove('gl');if(lvl<2&&!st.battery)kb.resume()});
 return{init,resize:size,get gl(){return ok},get level(){return lvl},
  start(){if(lvl>=2)return;want=true;if(!st.battery){if(!ok)kb.resume();loop()}},
  dusk(on,d=1.4){if(ok)gsap.to(D,{v:on?1:0,duration:d,ease:'power2.inOut',onUpdate:()=>{if(!raf)draw(performance.now())}});gsap.to('#tint',{autoAlpha:on?.55:0,duration:d})},
  battery(on){if(on){stop();kb.pause();if(ok)draw(performance.now())}else if(lvl<2){want=true;if(!ok)kb.resume();loop()}}}})();
// pre-rendered ray textures (no CSS masks/blend modes -> cheap to rotate on any GPU)
function rayTex(N,n,duty,stops,rgb,el){const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),R=N/2,rg=g.createRadialGradient(R,R,0,R,R,R);
 stops.forEach(([o,a])=>rg.addColorStop(o,`rgba(${rgb},${a})`));g.fillStyle=rg;const w=Math.PI*2/n;for(let k=0;k<n;k++){const a=k*w;g.beginPath();g.moveTo(R,R);g.arc(R,R,R,a,a+w*duty);g.closePath();g.fill()}canvasURL(c,u=>el.style.backgroundImage=u)}
rayTex(640,24,.2,[[0,0],[.184,0],[.224,.9],[.59,.27],[.95,0],[1,0]],'255,240,190',$('#sunRays'));
rayTex(LITE?768:1024,30,.33,[[0,.85],[.1,.85],[.5,.42],[1,0]],'255,244,200',$('#trans .tRays'));
// ---------- sun emblem above the reels: separate layers, the ray wheel rotates continuously ----------
const SUN={w:gsap.to('#sunE .sw1',{rotation:360,duration:72,repeat:-1,ease:'none'}),r:gsap.to('#sunRays',{rotation:-360,duration:200,repeat:-1,ease:'none'}),
 speed(k,d=1.2){gsap.to([this.w,this.r],{timeScale:k,duration:d,ease:'power2.inOut'})}};
// ---------- ambient life: leaves, birds, pollen, frame sparkles, symbol glints ----------
const live=()=>!st.battery&&!document.hidden;
function leafLoop(){setTimeout(leafLoop,rand(1800,4200));if(!live())return;const L=$('#leaves');if(L.childElementCount>=(LITE?3:5))return;const w=L.clientWidth,h=L.clientHeight;if(!w)return;
 const left=Math.random()<.55,s=w/1600*rand(.75,1.3),e=document.createElement('i');e.className='leaf'+(Math.random()<.4?' y':'');L.appendChild(e);
 const x0=(left?rand(.01,.17):rand(.8,.97))*w,y0=(left?rand(.12,.42):rand(.12,.3))*h,wind=(left?1:-1)*rand(.08,.2)*w,fall=rand(.3,.55)*h,dur=rand(7,11);
 gsap.set(e,{x:x0,y:y0,scale:s,rotation:rand(0,360),opacity:0});
 const fl=gsap.to(e,{rotationX:'+=180',rotationY:'+=70',duration:rand(.9,1.6),repeat:-1,yoyo:true,ease:'sine.inOut'});
 const sw=gsap.to(e,{xPercent:rand(250,450)*(Math.random()<.5?1:-1),rotation:'+='+rand(40,90),duration:rand(1.4,2.2),repeat:-1,yoyo:true,ease:'sine.inOut'});
 gsap.timeline({onComplete:()=>{fl.kill();sw.kill();e.remove()}}).to(e,{opacity:.95,duration:.8},0).to(e,{y:y0+fall,duration:dur,ease:'none'},0).to(e,{x:x0+wind,duration:dur,ease:'sine.inOut'},0).to(e,{opacity:0,duration:1.2},dur-1.2)}
function birdLoop(first){setTimeout(birdLoop,first?rand(5000,9000):rand(16000,30000));if(first||!live())return;const B=$('#birds'),w=B.clientWidth,h=B.clientHeight;if(!w)return;
 const n=2+(Math.random()*3|0),rtl=Math.random()<.6,y=rand(.05,.2)*h,dur=rand(22,30),s=w/1920;
 for(let i=0;i<n;i++){const e=document.createElement('div');e.className='bird';e.innerHTML='<svg viewBox="0 0 26 12"><path d="M1 6Q7 0 13 6Q19 0 25 6"/></svg>';const sv=e.firstChild;sv.style.animationDuration=rand(.45,.62)+'s';sv.style.animationDelay=-rand(0,.6)+'s';B.appendChild(e);
  const sc=s*rand(.55,1),dx=i*rand(30,48)*s,dy=(i%2?1:-1)*Math.ceil(i/2)*rand(10,18)*s,xa=rtl?w+40+dx:-60-dx,xb=rtl?-90-dx:w+50+dx;
  gsap.set(e,{x:xa,y:y+dy,scale:sc});const bob=gsap.to(e,{y:'+='+rand(-26,26)*s,duration:rand(3,5),yoyo:true,repeat:-1,ease:'sine.inOut'});
  gsap.to(e,{x:xb,duration:dur,ease:'none',onComplete:()=>{bob.kill();e.remove()}})}}
function pollen(){const P=$('#pollen');for(let i=0,n=LITE?12:30;i<n;i++){const d=document.createElement('i');d.style.left=rand(0,1900)+'px';d.style.top=rand(300,1100)+'px';const s=rand(.5,1.6);d.style.width=d.style.height=6*s+'px';d.style.animationDuration=rand(9,20)+'s';d.style.animationDelay=-rand(0,20)+'s';P.appendChild(d)}}
const GEMS=[[431,297],[1487,297],[1487,464],[150,868],[1770,868],[960,880],[905,108],[1013,108]];
function sparkLoop(){setTimeout(sparkLoop,LITE?rand(1300,2800):rand(600,1500));if(!live())return;const g=GEMS[Math.random()*GEMS.length|0],s=document.createElement('div');s.className='spark';s.style.left=g[0]+rand(-10,10)+'px';s.style.top=g[1]+rand(-10,10)+'px';$('#sparks').appendChild(s);
 gsap.fromTo(s,{scale:0,opacity:1,rotation:0},{scale:rand(.8,1.4),rotation:90,duration:.45,yoyo:true,repeat:1,ease:'power2.out',onComplete:()=>s.remove()})}
function glintLoop(){setTimeout(glintLoop,rand(2400,4600));if(!live()||st.busy||st.modal||!st.grid)return;const c=[];
 st.grid.forEach((col,r)=>col.forEach((id,k)=>{if(/^(H|W|S|M)/.test(id))c.push([r,k])}));if(!c.length)return;const[r,k]=c[Math.random()*c.length|0],e=symEl(r,k);if(!e||e.classList.contains('win'))return;
 e.classList.remove('glm');void e.offsetWidth;e.classList.add('glm');setTimeout(()=>e.classList.remove('glm'),1400)}
function ambient(){pollen();sparkLoop();leafLoop();setTimeout(leafLoop,900);birdLoop(true);setTimeout(glintLoop,3000)}
