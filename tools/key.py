import numpy as np, cv2
from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SRC=str(ROOT / 'assets' / 'symsrc')+'/'; OUT=str(ROOT / 'assets' / 'sym')+'/'
def load(n): return np.asarray(Image.open(SRC+n+'.png').convert('RGB')).astype(np.float32)

def chroma(n, key='g'):
    C=load(n); R,G,B=C[...,0],C[...,1],C[...,2]
    d=G-np.maximum(R,B) if key=='g' else np.minimum(R,B)-G
    hard=(d>150).astype(np.uint8)
    K=np.median(C[hard>0],axis=0); dbg=np.median(d[hard>0]); lo=28
    a=1-np.clip((d-lo)/(dbg-lo),0,1)
    dist=cv2.distanceTransform((1-hard).astype(np.uint8),cv2.DIST_L2,3)
    a=np.where(dist>5,1.0,a)
    F=np.clip((C-(1-a[...,None])*K)/np.maximum(a,1e-3)[...,None],0,255)
    edge=(dist<=6)
    if key=='g':
        mx=np.maximum(F[...,0],F[...,2]); F[...,1]=np.where(edge,np.minimum(F[...,1],mx+12),F[...,1])
    else:
        ex=np.maximum(0,np.minimum(F[...,0],F[...,2])-F[...,1]-10)*edge
        F[...,0]-=ex; F[...,2]-=ex
    a=np.where(a<0.04,0,a)
    # drop isolated haze / specks: keep components that contain solid pixels
    m=(a>0).astype(np.uint8); n_,lab,stt,_=cv2.connectedComponentsWithStats(m,connectivity=8)
    solid=np.unique(lab[a>0.9]); keep=np.isin(lab,[l for l in solid if l!=0 and stt[l,4]>400])
    a=np.where(keep,a,0)
    return np.dstack([F,a*255]).astype(np.uint8)

def white(n):
    C=load(n); mn=C.min(2); mx=C.max(2)
    cand=((mn>226)&((mx-mn)<22)).astype(np.uint8)
    lab=cv2.connectedComponents(cand,connectivity=4)[1]
    border=np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]]))
    border=[b for b in border if b!=0]
    bg=np.isin(lab,border).astype(np.uint8)
    bg=cv2.dilate(bg,np.ones((3,3),np.uint8),iterations=1)
    a=cv2.GaussianBlur(1-bg.astype(np.float32),(0,0),0.9)
    F=np.clip((C-(1-a[...,None])*255)/np.maximum(a,1e-3)[...,None],0,255)
    F=np.where((a>0.98)[...,None],C,F)
    a=np.where(a<0.04,0,a)
    return np.dstack([F,a*255]).astype(np.uint8)

def bbox(rgba,th=20):
    ys,xs=np.where(rgba[...,3]>th); return xs.min(),ys.min(),xs.max()+1,ys.max()+1

import json
def finish(rgba,name,size,anchor,shadow=True):
    """rgba crop -> resized, padded, baked drop shadow; anchor=(x0,y0,x1,y1) in crop coords"""
    im=Image.fromarray(rgba,'RGBA').resize(size,Image.LANCZOS)
    sx=size[0]/rgba.shape[1]; sy=size[1]/rgba.shape[0]
    P=18 if shadow else 4
    can=Image.new('RGBA',(size[0]+2*P,size[1]+2*P),(0,0,0,0))
    if shadow:
        a=np.asarray(im)[...,3].astype(np.float32)
        sh=np.zeros((can.height,can.width),np.float32); sh[P+6:P+6+size[1],P:P+size[0]]=a
        sh=cv2.GaussianBlur(sh,(0,0),5)*0.55
        shim=np.zeros((can.height,can.width,4),np.uint8); shim[...,3]=np.clip(sh,0,255).astype(np.uint8)
        can=Image.fromarray(shim,'RGBA')
    can.alpha_composite(im,(P,P))
    can.save(OUT+name+'.webp','WEBP',quality=90,method=6,alpha_quality=92); can.save(OUT+name+'.png')
    ax=[anchor[0]*sx+P,anchor[1]*sy+P,anchor[2]*sx+P,anchor[3]*sy+P]
    META[name]=dict(w=can.width,h=can.height,a=[round(v,1) for v in ax])
META={}
TW=300; OV=0.11
for n in ['H1','H2','H3','H4','W']:
    rgba=white(n); x0,y0,x1,y1=bbox(rgba)
    col=rgba[:,x0+25,3]; tb=int(np.argmax(col>128))
    side=x1-x0; ov=int(round(OV*side)); top=tb-ov
    crop=rgba[max(0,top):y1, x0:x1]
    if top<0: crop=np.pad(crop,((-top,0),(0,0),(0,0)))
    hh=round(TW*crop.shape[0]/crop.shape[1])
    finish(crop,n,(TW,hh),(0,ov,crop.shape[1],crop.shape[0]))
for n,k in [('M1','g'),('M2','g'),('S','g'),('K','g'),('A','m'),('Q','g'),('J','g'),('T','g')]:
    rgba=chroma(n,k); x0,y0,x1,y1=bbox(rgba); pad=4
    crop=rgba[max(0,y0-pad):y1+pad, max(0,x0-pad):x1+pad]
    h,w=crop.shape[:2]; s=300/max(h,w) if n not in('X2','X3') else 240/w
    finish(crop,n,(round(w*s),round(h*s)),(pad,pad,w-pad,h-pad),shadow=n not in('X2','X3'))
json.dump(META,open(OUT+'meta.json','w'),indent=0)
for k,v in META.items(): print(k,v)
