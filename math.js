const PAYS={H1:[2.5,9,35],H2:[2,6.5,22],H3:[1.3,3.5,13],H4:[.9,2.2,9],M1:[.6,1.3,6.5],M2:[.45,.9,4.4],A:[.25,.5,2.6],K:[.25,.5,2.6],Q:[.18,.45,1.75],J:[.18,.45,1.75],T:[.18,.45,1.75]};
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function strips(P){const out=[];for(let r=0;r<5;r++){const R=rng(P.seed+r*977);const s=[];const pool=[];for(const k in P.w)for(let i=0;i<P.w[k];i++)pool.push(k);
 let lastS=-9;while(s.length<P.len){
  if(R()<P.sc&&s.length-lastS>5){s.push('S');lastS=s.length-1;continue}
  if(r>0&&R()<P.wild){s.push('W');continue}
  const k=pool[R()*pool.length|0];const st=1+(R()<P.st?1+(R()<P.st2?1+(R()<.4?1:0):0):0);for(let i=0;i<st;i++)s.push(k)}
 // avoid scatter wrap neighbours
 out.push(s)}return out}
function lines(){const all=[];const rec=a=>{if(a.length==5){all.push(a.slice());return}for(let r=0;r<4;r++){if(a.length&&Math.abs(r-a[a.length-1])>1)continue;a.push(r);rec(a);a.pop()}};rec([]);
 const sc=l=>{let s=0,ch=0;for(let i=1;i<5;i++){s+=Math.abs(l[i]-l[i-1]);if(i>1&&l[i]-l[i-1]!=l[i-1]-l[i-2])ch++}return s*3+ch+(l[0]==l[4]&&l[1]==l[3]?0:2)};
 return all.sort((a,b)=>sc(a)-sc(b)).slice(0,40)}
if(typeof module!='undefined')module.exports={PAYS,strips,lines,rng};
