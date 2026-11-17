const {PAYS,strips,lines}=require('./math.js');const L=lines();
const K=+process.argv[5]||1;for(const k in PAYS)PAYS[k]=PAYS[k].map(v=>v*K);
const P=JSON.parse(process.argv[3]);const F=JSON.parse(process.argv[4]);
const BS=strips(P),FS=strips(F);
function win(S){return S.map(s=>{const p=Math.random()*s.length|0;return [0,1,2,3].map(k=>s[(p+k)%s.length])})}
function ev(g,mult){let t=0;for(const l of L){const b=g[0][l[0]];if(b=='S'||b=='W')continue;let n=1,m=0;for(let r=1;r<5;r++){const id=g[r][l[r]];if(id==b||id=='W'){n++;if(id=='W')m+=mult[r+','+l[r]]}else break}if(n>=3)t+=PAYS[b][n-3]*(m||1)}
 let sc=0;g.forEach(c=>c.forEach(x=>{if(x=='S')sc++}));if(sc>=3)t+=5;return{t,sc}}
const FSN={3:8,4:12,5:16};
function fsRound(n){let tot=0,st={},sp=0;while(n>0&&sp<300){n--;sp++;const g=win(FS);for(const k in st){const[r,c]=k.split(',');g[r][c]='W'}const mult={};g.forEach((c,r)=>c.forEach((x,k)=>{if(x=='W'){if(!st[r+','+k])st[r+','+k]=Math.random()<.65?2:3;mult[r+','+k]=st[r+','+k]}}));const e=ev(g,mult);tot+=e.t;if(e.sc>=3)n+=FSN[Math.min(5,e.sc)];if(tot>=5000)break}return Math.min(tot,5000)}
let N=+process.argv[2],tot=0,trig=0,fsTot=0,hits=0,big=0;
for(let i=0;i<N;i++){const g=win(BS);const mult={};g.forEach((c,r)=>c.forEach((x,k)=>{if(x=='W')mult[r+','+k]=Math.random()<.65?2:3}));const e=ev(g,mult);tot+=e.t;if(e.t>0)hits++;if(e.t>=15)big++;if(e.sc>=3){trig++;const f=fsRound(FSN[Math.min(5,e.sc)]);fsTot+=f;tot+=f}}
let buy=0;const B=+process.argv[6]||4000;for(let i=0;i<B;i++){const r=Math.random();buy+=5+fsRound(r<.8?8:r<.97?12:16)}
console.log('RTP',(tot/N*100).toFixed(1),'base',((tot-fsTot)/N*100).toFixed(1),'hit',(hits/N*100).toFixed(1),'big1in',(N/big|0),'FS1in',(N/trig).toFixed(0),'avgFS',(fsTot/trig).toFixed(1),'buyRTP',(buy/B).toFixed(1));
