"""Subset OFL fonts for embedding (Latin + Cyrillic) -> assets/fonts/*.woff
Cinzel Decorative has a Reserved Font Name, so it is embedded UNMODIFIED (original TTF)."""
from fontTools import subset
from fontTools.ttLib import TTFont
from pathlib import Path
import shutil
R=Path(__file__).resolve().parent.parent/'assets'/'fonts'
U='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+0400-045F,U+0490-0491,U+2010-2027,U+2030-203A,U+2044,U+20AC,U+20BD,U+2116,U+2122,U+2190-2193,U+2212,U+2215,U+221E,U+00D7'
JOBS={'AlegreyaSC-Black.ttf':'alegreyasc-900','AlegreyaSC-ExtraBold.ttf':'alegreyasc-800','Oswald[wght].ttf':'oswald-var','Montserrat[wght].ttf':'montserrat-var'}
for src,dst in JOBS.items():
    o=subset.Options(); o.flavor='woff'; o.layout_features=['*']; o.name_IDs=['*']; o.name_languages=['*']; o.notdef_outline=True; o.hinting=False
    f=TTFont(R/'src'/src); s=subset.Subsetter(o); s.populate(unicodes=subset.parse_unicodes(U)); s.subset(f)
    f.flavor='woff'; f.save(R/(dst+'.woff')); print(dst,(R/(dst+'.woff')).stat().st_size)
for src in ['CinzelDecorative-Black.ttf','CinzelDecorative-Bold.ttf']:
    shutil.copy(R/'src'/src,R/src); print(src,(R/src).stat().st_size,'(unmodified)')
