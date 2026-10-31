"""Read-only verification of actual assets, packaged PNGs and protected sources."""
from pathlib import Path
import json,hashlib,math,io,zipfile
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
report={'scope':'PC static files / official package inspection; not GT5','images':[]}
assets=json.loads((ROOT/'docs/assets.json').read_text(encoding='utf-8'))
app=next((ROOT/'build/outputs/default').glob('*unsigned.app'))
baseline=json.loads((ROOT.parent/'baseline-hashes.json').read_text(encoding='utf-8'))
old=Path(baseline['root']);old_hashes={sha(p) for p in old.rglob('*.png') if not any(x in ('build','.preview') for x in p.parts)}
with zipfile.ZipFile(app) as outer:
 with zipfile.ZipFile(io.BytesIO(outer.read(next(n for n in outer.namelist() if n.endswith('.hap'))))) as hap:
  for i,row in enumerate(assets['images']):
   p=ROOT/'entry/src/main/js/default/common/fruit'/row['file'];raw=p.read_bytes();im=Image.open(p)
   assert im.mode=='RGBA' and im.size==(row['width'],row['height'])
   assert raw[24]==8 and raw[25]==6 and raw[28]==0,'8-bit noninterlaced RGBA required'
   assert sha(p)==row['sha256'] and sha(p) not in old_hashes
   assert hap.read('assets/js/default/common/fruit/'+row['file'])==raw
   a=im.getchannel('A');assert a.getextrema()==(0,255)
   for y in range(im.height):
    for x in range(im.width):
     if math.hypot(x+.5-im.width/2,y+.5-im.height/2)>im.width/2:assert a.getpixel((x,y))==0
   report['images'].append({'file':row['file'],'size':list(im.size),'matchesPackagedPNG':True,'circularAlpha':True,'replacedOldImage':True})
  for row in assets['launcherIcons']:
   p=ROOT/'entry/src/main/resources/base/media'/row['file']
   assert sha(p)==row['sha256'] and sha(p) not in old_hashes
   assert hap.read('assets/entry/resources/base/media/'+row['file'])==p.read_bytes()
  for name in hap.namelist():
   if name.endswith('.png'):
    assert hashlib.sha256(hap.read(name)).hexdigest() not in old_hashes
    image=Image.open(io.BytesIO(hap.read(name)));assert max(image.size)<=116,'Source master leaked into APP'
assert not (ROOT/'artwork/yieio-original').exists()
for p in ROOT.rglob('*.png'):
 if not any(x in ('build','.preview') for x in p.relative_to(ROOT).parts):assert sha(p) not in old_hashes,p
for name,digest in baseline['files'].items():assert sha(old/name)==digest,name
logic=[]
for p in (ROOT/'entry/src/main/js/default').rglob('*'):
 if p.suffix not in ('.js','.hml','.css'):continue
 rel=p.relative_to(ROOT).as_posix()
 if rel.endswith(('default/app.js','pages/index/index.js')):
  assert p.read_text(encoding='utf-8').replace('1.2.1','1.2.0')==(old/rel).read_text(encoding='utf-8')
 else:assert sha(p)==sha(old/rel);logic.append(rel)
report.update({'protectedOldFiles':len(baseline['files']),'unchangedLogicAndLayoutFiles':logic,'launcherImagesReplaced':2,'oldArtworkExcludedFromSourceAndApp':True,'masterImagesExcludedFromApp':True,'fruitRGBAEstimate':assets['allUniqueRGBABytes'],'fruitPNGBytes':assets['compressedBytes'],'gt5Verified':False})
(ROOT/'docs/assets-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'docs/protected-sources.json').write_text(json.dumps({'oldProject':str(old),'oldFilesUnchanged':len(baseline['files']),'oldProjectModified':False,'fruitAndLauncherImagesReplacedInNewCopy':13,'unchangedLogicAndLayoutFileCount':len(logic),'GT5':False},indent=2),encoding='utf-8')
print(json.dumps({'fruitChecks':len(report['images']),'launcherChecks':2,'unchangedLogicFiles':len(logic),'oldFilesUnchanged':len(baseline['files']),'oldArtworkExcluded':True,'sourceMastersExcludedFromApp':True}))
