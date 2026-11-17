// ---------- audio: original procedural score + sfx (Web Audio, no samples) ----------
// Music: calm ambient in D Hijaz (Phrygian dominant) — drone, soft pads, Karplus-Strong "oud/harp"
// plucks, a breathy ney-like flute and a light frame-drum. Free-spins mode is brighter and faster.
const A={ctx:null,ks:{}};
const NOTE=m=>440*Math.pow(2,(m-69)/12);
function impulse(C,dur,decay){const sr=C.sampleRate,len=Math.floor(sr*dur),pre=Math.floor(sr*.018),b=C.createBuffer(2,len,sr);
 for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let y=0;for(let i=pre;i<len;i++){const p=(i-pre)/(len-pre),a=.85-.7*p;y+=((Math.random()*2-1)-y)*a;d[i]=y*Math.pow(1-p,decay)}}return b}
function audioInit(){if(A.ctx){if(A.ctx.state=='suspended')A.ctx.resume();return}
 try{const C=new(window.AudioContext||window.webkitAudioContext)();A.ctx=C;
  const comp=C.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.3;
  A.master=C.createGain();A.master.gain.value=.9;A.master.connect(comp);comp.connect(C.destination);
  A.rev=C.createConvolver();A.rev.buffer=LITE?impulse(C,1.8,2.4):impulse(C,3.4,2.4);const rv=C.createGain();rv.gain.value=.85;A.rev.connect(rv);rv.connect(A.master);
  A.sfx=C.createGain();A.sfx.connect(A.master);const ss=C.createGain();ss.gain.value=.16;A.sfx.connect(ss);ss.connect(A.rev);
  A.mus=C.createGain();A.mus.connect(A.master);const ms=C.createGain();ms.gain.value=.55;A.mus.connect(ms);ms.connect(A.rev);
  A.duck=C.createGain();A.duck.connect(A.mus);
  A.sfx.gain.value=st.sfx?.62:0;A.mus.gain.value=st.music?.5:0;
  music.start()}catch(e){console.warn(e)}}
function tone({f=440,t=.15,type='sine',v=.2,a=.004,dst,when=0,slide=0,pan=0}){const C=A.ctx;if(!C)return;const t0=C.currentTime+when,o=C.createOscillator(),g=C.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t0+t);
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+a);g.gain.exponentialRampToValueAtTime(.0001,t0+t);o.connect(g);
 if(pan&&C.createStereoPanner){const p=C.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(dst||A.sfx)}else g.connect(dst||A.sfx);o.start(t0);o.stop(t0+t+.05)}
let NB=null;function noise({t=.1,v=.2,f=1200,f2=0,type='bandpass',when=0,dst,q=1,a=.002}){const C=A.ctx;if(!C)return;if(!NB){NB=C.createBuffer(1,C.sampleRate*2,C.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 const t0=C.currentTime+when,s=C.createBufferSource();s.buffer=NB;const fl=C.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t0);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t0+t);fl.Q.value=q;
 const g=C.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+a);g.gain.exponentialRampToValueAtTime(.0001,t0+t);s.connect(fl);fl.connect(g);g.connect(dst||A.sfx);s.start(t0,Math.random()*1.2);s.stop(t0+t+.05)}
// Karplus-Strong plucked string, rendered once per pitch and cached
function pluckBuf(m,soft){const key=m+(soft?'s':'');if(A.ks[key])return A.ks[key];const C=A.ctx,sr=C.sampleRate,f=NOTE(m),N=Math.max(2,Math.round(sr/f)),dur=Math.max(1.1,Math.min(3.2,1.4+(72-m)*.06)),len=Math.floor(sr*dur);
 const b=C.createBuffer(1,len,sr),d=b.getChannelData(0),r=new Float32Array(N);for(let i=0;i<N;i++)r[i]=Math.random()*2-1;
 for(let p=0;p<(soft?4:2);p++)for(let i=0;i<N;i++)r[i]=(r[i]+r[(i+1)%N])*.5;let mean=0;for(let i=0;i<N;i++)mean+=r[i];mean/=N;for(let i=0;i<N;i++)r[i]-=mean;
 const loss=Math.pow(10,-1.6/(dur*f));let idx=0,mx=1e-6;for(let i=0;i<len;i++){const a=r[idx],nx=r[(idx+1)%N];d[i]=a;r[idx]=(a+nx)*.5*loss;idx=(idx+1)%N;if(i<2000)mx=Math.max(mx,Math.abs(a))}
 const k=.8/mx,fi=Math.floor(sr*.0015),fo=Math.floor(sr*.08);for(let i=0;i<len;i++){let e=k;if(i<fi)e*=i/fi;if(i>len-fo)e*=(len-i)/fo;d[i]*=e}
 return A.ks[key]=b}
function pluck(m,{v=.25,when=0,dst,pan=0,soft=false,lp=3600}={}){const C=A.ctx;if(!C)return;const t0=C.currentTime+when,s=C.createBufferSource();s.buffer=pluckBuf(m,soft);
 const body=C.createBiquadFilter();body.type='peaking';body.frequency.value=320;body.gain.value=4;body.Q.value=.9;const l=C.createBiquadFilter();l.type='lowpass';l.frequency.value=lp;
 const g=C.createGain();g.gain.value=v;s.connect(body);body.connect(l);l.connect(g);
 if(C.createStereoPanner){const p=C.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(dst||A.sfx)}else g.connect(dst||A.sfx);s.start(t0)}
function bell(m,{v=.08,when=0,dst,t=2}={}){const f=NOTE(m);[[1,1],[2.01,.55],[2.76,.4],[4.07,.25],[5.4,.14]].forEach(([r,a],i)=>tone({f:f*r,t:t/(1+i*.5),v:v*a,when,dst,a:.003}))}
function brass(ms,{v=.03,when=0,t=1.4,dst}={}){const C=A.ctx;if(!C)return;const t0=C.currentTime+when,g=C.createGain(),lp=C.createBiquadFilter();lp.type='lowpass';lp.Q.value=1.2;
 lp.frequency.setValueAtTime(300,t0);lp.frequency.exponentialRampToValueAtTime(2600,t0+.18);lp.frequency.exponentialRampToValueAtTime(900,t0+t);
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+.05);g.gain.setValueAtTime(v,t0+t*.6);g.gain.exponentialRampToValueAtTime(.0001,t0+t);lp.connect(g);g.connect(dst||A.sfx);
 ms.forEach(m=>[-6,6].forEach(dt=>{const o=C.createOscillator();o.type='sawtooth';o.frequency.value=NOTE(m);o.detune.value=dt;o.connect(lp);o.start(t0);o.stop(t0+t+.05)}))}
function duck(on){if(!A.ctx)return;A.duck.gain.setTargetAtTime(on?.35:1,A.ctx.currentTime,on?.08:.6)}
const sfx={
 click(){tone({f:1500,t:.035,v:.06});noise({t:.02,v:.025,f:4200})},
 start(){noise({t:.3,v:.045,f:500,f2:2600,type:'bandpass',q:.9});tone({f:200,t:.2,type:'triangle',v:.02,slide:1.8})},
 stop(r){tone({f:150+r*7,t:.14,v:.2,slide:.5});noise({t:.05,v:.06,f:900,type:'lowpass'});tone({f:1250+r*60,t:.025,v:.018,type:'triangle'})},
 scatter(n){const m=[62,66,69,74,78][Math.min(4,n-1)];bell(m+12,{v:.07,t:2.2});pluck(m,{v:.3});tone({f:70,t:.4,v:.18,slide:.6})},
 wild(){pluck(81,{v:.14});pluck(86,{v:.1,when:.05});tone({f:110,t:.18,v:.12,slide:.6})},
 antic(){const C=A.ctx;if(!C)return;const t=C.currentTime,o=C.createOscillator(),g=C.createGain(),f=C.createBiquadFilter(),lfo=C.createOscillator(),lg=C.createGain();o.type='sawtooth';o.frequency.setValueAtTime(98,t);o.frequency.linearRampToValueAtTime(294,t+1.7);
  f.type='lowpass';f.frequency.setValueAtTime(260,t);f.frequency.linearRampToValueAtTime(2200,t+1.7);lfo.frequency.value=9;lg.gain.value=.012;lfo.connect(lg);lg.connect(g.gain);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.3);g.gain.linearRampToValueAtTime(0,t+1.8);o.connect(f);f.connect(g);g.connect(A.sfx);o.start(t);o.stop(t+1.85);lfo.start(t);lfo.stop(t+1.85);
  noise({t:1.6,v:.025,f:2000,f2:9000,type:'highpass',a:1.2})},
 tick(p){const sc=[74,78,79,81,82,84,86,90];pluck(sc[Math.min(7,p*8|0)]+(Math.random()<.5?0:12),{v:.05,lp:6000})},
 win(x){const ns=x>=5?[62,66,69,74,78,81]:[69,74,78];ns.forEach((m,i)=>pluck(m,{v:.2,when:i*.055,pan:-.4+i*.16}))},
 big(){duck(true);brass([50,57,62,66,69],{v:.03,t:1.8});[0,.2,.4].forEach(w=>tone({f:78,t:.45,v:.28,slide:.55,when:w}));noise({t:1.2,v:.05,f:3000,f2:9000,type:'highpass',a:1});
  [62,66,69,74,78,81,86].forEach((m,i)=>pluck(m,{v:.16,when:.5+i*.06}));setTimeout(()=>duck(false),2600)},
 tier(){bell(81,{v:.07});[74,78,81,86].forEach((m,i)=>pluck(m,{v:.14,when:i*.05}))},
 sticky(){[1,2.4,3.9,5.6].forEach((r,i)=>tone({f:523*r,t:.7/(1+i*.4),v:.045/(1+i*.3)}));tone({f:120,t:.22,v:.2,slide:.5});noise({t:.5,v:.035,f:6000,type:'highpass'});pluck(86,{v:.12,when:.04})},
 fanfare(){duck(true);brass([50,57,62,66],{v:.028,t:.5});brass([51,58,63,67],{v:.028,t:.5,when:.45});brass([50,57,62,66,69],{v:.032,t:1.6,when:.9});
  [0,.45,.9,1.05].forEach(w=>tone({f:72,t:.4,v:.26,slide:.55,when:w}));noise({t:1.4,v:.05,f:2500,f2:9000,type:'highpass',when:.3,a:1});setTimeout(()=>duck(false),2600)},
 whoosh(){noise({t:1.1,v:.09,f:200,f2:5000,type:'bandpass',q:.7,a:.8});tone({f:58,t:1.3,v:.32,slide:.5,when:.85});bell(74,{v:.05,when:.85,t:2.5})},
 buy(){[86,90,93,98].forEach((m,i)=>pluck(m,{v:.1,when:i*.05,lp:7000}))}};
const music={timer:null,step:0,next:0,mode:'base',bar:0,
 start(){if(this.timer||!A.ctx)return;this.next=A.ctx.currentTime+.2;this.drone();this.timer=setInterval(()=>this.tick(),50)},
 setMode(m){this.mode=m},
 drone(){const C=A.ctx,g=C.createGain(),lp=C.createBiquadFilter(),lfo=C.createOscillator(),lg=C.createGain();g.gain.value=.045;lp.type='lowpass';lp.frequency.value=320;
  lfo.frequency.value=.07;lg.gain.value=.02;lfo.connect(lg);lg.connect(g.gain);lfo.start();lp.connect(g);g.connect(A.duck);
  [[38,'sine',1],[45,'triangle',.5],[50,'sine',.35]].forEach(([m,t,v])=>{const o=C.createOscillator(),og=C.createGain();o.type=t;o.frequency.value=NOTE(m);og.gain.value=v;o.connect(og);og.connect(lp);o.start()})},
 tick(){const C=A.ctx;if(!C||C.state!='running')return;const fs=this.mode=='fs',spb=fs?.326:.405;while(this.next<C.currentTime+.3){this.play(this.step,this.next-C.currentTime,spb,fs);this.next+=spb;this.step++}},
 PROG:[[50,54,57],[51,55,58],[50,54,57],[48,51,55],[46,50,55],[51,55,58],[50,54,57],[50,54,57]],
 MEL:[[[69,2],[70,1],[69,1],[67,2],[66,2],[67,1],[66,1],[63,2],[62,4]],[[62,2],[63,2],[66,2],[67,2],[69,4],[67,2],[66,2],[63,4]],[[74,3],[75,1],[74,2],[72,2],[70,2],[69,2],[67,2],[69,4]]],
 play(s,w,spb,fs){if(!st.music)return;const b=s%8,bar=(s>>3)%16,ch=this.PROG[bar>>1],hum=()=>Math.random()*.012;
  if(b==0&&bar%2==0)this.pad(ch,w,spb*16,fs?.022:.026);
  // plucks: arpeggiated chord tones with passing notes from the scale
  const SC=[62,63,66,67,69,70,72,74,75,78,79,81];const arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[0]+24];
  const pat=fs?[0,2,1,3,2,1,0,2]:[0,-1,1,2,-1,1,3,-1];const dens=fs?.92:.62;
  if(pat[b]>=0&&Math.random()<dens){let m=arp[pat[b]];if(Math.random()<.18)m=SC[Math.random()*SC.length|0];pluck(m,{v:(b%4==0?.17:.11)*(fs?1:.85),when:w+hum(),dst:A.duck,pan:Math.random()*.6-.3,soft:!fs,lp:fs?4200:2800})}
  if(fs&&b%2==1&&Math.random()<.35)pluck(arp[Math.random()*3|0]+12,{v:.05,when:w+spb*.5,dst:A.duck,pan:.4,soft:true});
  // ney-like melody phrases
  if(b==0&&(fs?bar%4==0:bar==8)){const ph=this.MEL[Math.random()*this.MEL.length|0];let t=0;ph.forEach(([m,d])=>{this.ney(m+(fs?12:0),w+t*spb,d*spb*.96,fs?.028:.034);t+=d})}
  // frame drum
  if(fs){if(b==0||b==4)this.dum(w,b==0?.2:.13);if(b==1||b==3||b==6)this.tek(w+hum(),b==6?.05:.035);this.shk(w+spb*.5,.012)}
  else{if(b==0&&bar%2==0)this.dum(w,.11);if(b==4&&bar%4==2)this.tek(w,.025);if(b%2==1)this.shk(w,.008)}},
 pad(ms,w,dur,v){const C=A.ctx,t0=C.currentTime+w,g=C.createGain(),lp=C.createBiquadFilter();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+dur*.3);g.gain.setValueAtTime(v,t0+dur*.7);g.gain.linearRampToValueAtTime(0,t0+dur*1.05);
  lp.type='lowpass';lp.Q.value=.6;lp.frequency.setValueAtTime(380,t0);lp.frequency.linearRampToValueAtTime(this.mode=='fs'?1300:850,t0+dur*.5);lp.frequency.linearRampToValueAtTime(420,t0+dur);lp.connect(g);g.connect(A.duck);
  ms.forEach(m=>[-8,8].forEach(dt=>{const o=C.createOscillator();o.type='sawtooth';o.frequency.value=NOTE(m);o.detune.value=dt;o.connect(lp);o.start(t0);o.stop(t0+dur*1.1)}))},
 ney(m,w,dur,v){const C=A.ctx,t0=C.currentTime+w,f=NOTE(m),o=C.createOscillator(),o2=C.createOscillator(),g=C.createGain(),g2=C.createGain(),vib=C.createOscillator(),vg=C.createGain();
  o.type='sine';o2.type='triangle';o.frequency.setValueAtTime(f*.97,t0);o.frequency.exponentialRampToValueAtTime(f,t0+.09);o2.frequency.setValueAtTime(f*2*.97,t0);o2.frequency.exponentialRampToValueAtTime(f*2,t0+.09);g2.gain.value=.12;
  vib.frequency.value=5.1;vg.gain.setValueAtTime(0,t0);vg.gain.linearRampToValueAtTime(f*.007,t0+Math.max(.2,dur*.7));vib.connect(vg);vg.connect(o.frequency);
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+.16);g.gain.setValueAtTime(v*.85,t0+Math.max(.17,dur-.1));g.gain.linearRampToValueAtTime(0,t0+dur+.28);
  o.connect(g);o2.connect(g2);g2.connect(g);g.connect(A.duck);[o,o2,vib].forEach(x=>{x.start(t0);x.stop(t0+dur+.35)});
  noise({t:dur+.2,v:v*.18,f:f*2,type:'bandpass',q:6,when:w,dst:A.duck,a:.12})},
 dum(w,v){tone({f:96,t:.34,v,slide:.55,when:w,dst:A.duck});noise({t:.07,v:v*.22,f:320,type:'lowpass',when:w,dst:A.duck})},
 tek(w,v){noise({t:.045,v,f:3300,type:'bandpass',q:1.3,when:w,dst:A.duck});tone({f:840,t:.035,v:v*.3,type:'triangle',when:w,dst:A.duck})},
 shk(w,v){noise({t:.03,v,f:8500,type:'highpass',when:w,dst:A.duck})}};
document.addEventListener('visibilitychange',()=>{if(!A.ctx)return;document.hidden?A.ctx.suspend():A.ctx.resume()});
function applyAudio(){if(A.ctx){const t=A.ctx.currentTime;A.sfx.gain.setTargetAtTime(st.sfx?.62:0,t,.05);A.mus.gain.setTargetAtTime(st.music?.5:0,t,.25)}
 const m=!st.sfx&&!st.music;$('#sndIco').innerHTML=`<use href="#${m?'iSndOff':'iSnd'}"/>`;$('#sndBtn').classList.toggle('off',m)}
