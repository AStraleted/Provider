"""Builds layers derived from the existing art:
 - assets/fx/sun_wheel.webp : rotating part of the winged-sun emblem (rays + enamel), cut from frame.webp
 - assets/fx/sun_disc.webp  : static glossy sun disc on top (highlight must not rotate)
 - assets/fx/bg_mask.png    : R = foliage sway, G = water shimmer, B = grass sway (for the WebGL background)
Needs Pillow, NumPy, OpenCV."""
import numpy as np, cv2, json
from PIL import Image
from pathlib import Path
A=Path(__file__).resolve().parent.parent/'assets'
fr=np.asarray(Image.open(A/'frame.webp').convert('RGBA')).astype(np.float32)
CX,CY=767.5,70.5          # emblem centre in frame.webp px (found with HoughCircles)
R_WHEEL,R_DISC=61.6,36.2  # inner edge of gold bezel / outer edge of disc outline
S=4                       # supersample for smooth rotation on hi-dpi
half=64; size=half*2*S
# sample with sub-pixel accuracy, upscale with Lanczos
x0,y0=int(CX-half),int(CY-half)
crop=Image.fromarray(fr[y0:y0+half*2+1,x0:x0+half*2+1].astype(np.uint8),'RGBA')
off=(CX-half-x0, CY-half-y0)
big=crop.transform((size,size),Image.AFFINE,(1/S,0,off[0],0,1/S,off[1]),resample=Image.BICUBIC)
big=np.asarray(big).astype(np.float32)
yy,xx=np.mgrid[0:size,0:size]; rr=np.hypot(xx+.5-size/2,yy+.5-size/2)/S
def ring_alpha(r0,fe): return np.clip((r0-rr)/fe+.5,0,1)
wheel=big.copy(); wheel[...,3]=255*ring_alpha(R_WHEEL,.9)
disc=big.copy();  disc[...,3]=255*ring_alpha(R_DISC,1.2)
for n,a in [('sun_wheel',wheel),('sun_disc',disc)]:
    Image.fromarray(a.astype(np.uint8),'RGBA').save(A/'fx'/(n+'.webp'),'WEBP',quality=92,alpha_quality=100,method=6)
k=1720/1536; ky=997/890
meta=dict(cx=100+CX*k,cy=29+CY*ky,r_wheel=R_WHEEL*k,r_disc=R_DISC*k,box=half*2*k)
json.dump(meta,open(A/'fx'/'sun.json','w'),indent=1); print(meta)
# ---- background mask ----
im=np.asarray(Image.open(A/'bg_src.png').convert('RGB'))
h,w=im.shape[:2]
hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV).astype(np.float32); H,Sa,V=hsv[...,0]*2,hsv[...,1]/255,hsv[...,2]/255
yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
green=((H>55)&(H<170)&(Sa>.25)&(V>.12)).astype(np.float32)
reg=np.zeros((h,w),np.float32)
reg[(xx<330)]=1.0                               # palms + ferns on the left
reg[(xx>1150)&(yy<620)]=np.maximum(reg[(xx>1150)&(yy<620)],.75)   # acacia canopy right
reg[(xx>1250)&(yy>=620)]=.9                      # bushes bottom right
reg[(xx>=330)&(xx<=1150)]=.35                    # distant trees (mostly behind the frame)
fol=cv2.GaussianBlur(cv2.dilate(green,np.ones((5,5),np.uint8)),(0,0),5)*reg
water=((H>180)&(H<215)&(Sa>.3)&(V>.4)&(yy>530)&(yy<720)&(xx<520)).astype(np.float32)
water=cv2.GaussianBlur(water,(0,0),3)
grass=((H>30)&(H<56)&(Sa>.45)&(V>.55)&(yy>560)&((xx<380)|(xx>1150))).astype(np.float32)
grass=cv2.GaussianBlur(grass,(0,0),4)*.8
m=np.dstack([fol,water,grass]); m=np.clip(m/np.maximum(m.max(axis=(0,1)),1e-3)*1.0,0,1)
Image.fromarray((m*255).astype(np.uint8),'RGB').resize((w//2,h//2),Image.LANCZOS).save(A/'fx'/'bg_mask.png',optimize=True)
print('mask ok')
