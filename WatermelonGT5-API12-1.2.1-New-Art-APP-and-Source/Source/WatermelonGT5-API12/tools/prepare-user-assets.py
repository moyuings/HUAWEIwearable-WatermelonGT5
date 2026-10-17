"""PC-only deterministic crop/resize requested by the user; requires Pillow.
Keep the main fruit; remove disconnected neighbouring-image scraps, then fit
the existing circular game bounds. No regeneration or watch-side processing.
"""
from pathlib import Path
from collections import deque
import hashlib,json,math
from PIL import Image,ImageOps,ImageFilter,ImageChops,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'artwork/user-supplied/master_512'
OUT=ROOT/'entry/src/main/js/default/common/fruit'
DIAMETERS=[18,24,30,36,44,54,64,76,88,102,116]
NAMES=['葡萄','樱桃','橙子','柠檬','猕猴桃','番茄','桃子','菠萝','椰子','半个西瓜','大西瓜']
sha=lambda data:hashlib.sha256(data).hexdigest()
def isolate(image):
    image=image.convert('RGBA');w,h=image.size
    pixels=bytearray(image.getchannel('A').point(lambda a:255 if a>=16 else 0).tobytes())
    largest=[];parts=[]
    for pos in range(w*h):
        if not pixels[pos]:continue
        pixels[pos]=0;queue=deque([pos]);points=[]
        while queue:
            p=queue.popleft();points.append(p);x=p%w;y=p//w
            for n in ([p-1] if x else [])+([p+1] if x+1<w else [])+([p-w] if y else [])+([p+w] if y+1<h else []):
                if pixels[n]:pixels[n]=0;queue.append(n)
        if len(points)>=16:parts.append(len(points))
        if len(points)>len(largest):largest=points
    assert largest,'Empty image'
    mask=bytearray(w*h)
    for p in largest:mask[p]=255
    keep=Image.frombytes('L',(w,h),bytes(mask)).filter(ImageFilter.MaxFilter(3))
    image.putalpha(ImageChops.multiply(image.getchannel('A'),keep))
    bbox=image.getchannel('A').getbbox();assert bbox
    return image.crop(bbox),{'cropBox':list(bbox),'componentPixels':len(largest),'otherComponentPixels':sum(parts)-len(largest),'componentsAtLeast16Pixels':sorted(parts,reverse=True)}
def fitted(image,size):
    target=Image.new('RGBA',(size,size),(0,0,0,0))
    small=ImageOps.contain(image,(size,size),Image.Resampling.LANCZOS)
    target.paste(small,((size-small.width)//2,(size-small.height)//2))
    scale=4;mask=Image.new('L',(size*scale,size*scale),0)
    ImageDraw.Draw(mask).ellipse((0,0,size*scale-1,size*scale-1),fill=255)
    mask=mask.resize((size,size),Image.Resampling.LANCZOS)
    values=list(mask.tobytes())
    for y in range(size):
        for x in range(size):
            if math.hypot(x+.5-size/2,y+.5-size/2)>size/2:values[y*size+x]=0
    mask.putdata(values);target.putalpha(ImageChops.multiply(target.getchannel('A'),mask))
    return Image.alpha_composite(Image.new('RGBA',target.size,(0,0,0,0)),target)
if __name__=='__main__':
    manifest=json.loads((SOURCE.parent/'source.json').read_text(encoding='utf-8'))
    expected={v['file']:v['sha256'] for v in manifest['masters']}
    OUT.mkdir(parents=True,exist_ok=True);rows=[];cleaned=[]
    for level,diameter in enumerate(DIAMETERS):
        source=SOURCE/('fruit_'+str(level)+'.png');raw=source.read_bytes();assert sha(raw)==expected[source.name]
        image=Image.open(source)
        # In this supplied master, the neighbouring pineapple touches the peach's
        # faint edge. A reviewed selection is needed before connected-component crop.
        selection=(0,0,448,512) if level==6 else (0,0,image.width,image.height)
        image,details=isolate(image.crop(selection));details['sourceSelectionBox']=list(selection);cleaned.append(image)
        target=fitted(image,diameter);file=OUT/('fruit_'+str(level)+'.png');target.save(file,optimize=True)
        rows.append({'file':file.name,'name':NAMES[level],'width':diameter,'height':diameter,'sourceSHA256':sha(raw),'sha256':sha(file.read_bytes()),'bytes':file.stat().st_size,'rgbaEstimate':diameter*diameter*4,**details})
    media=ROOT/'entry/src/main/resources/base/media';launcher=[]
    for filename,size in [('icon.png',114),('icon_small.png',80)]:
        output=media/filename;fitted(cleaned[10],size).save(output,optimize=True)
        launcher.append({'file':filename,'width':size,'height':size,'bytes':output.stat().st_size,'rgbaEstimate':size*size*4,'sha256':sha(output.read_bytes())})
    report={'source':'User-provided 合成大西瓜素材.zip','archiveSHA256':manifest['archiveSHA256'],'artLicense':'CC-BY-NC-4.0; supplied by user, rights not independently verified','launcherIcons':launcher,'images':rows,
            'compressedBytes':sum(x['bytes'] for x in rows),'allUniqueRGBABytes':sum(x['rgbaEstimate'] for x in rows),'worst40CopiesRGBABytes':40*rows[-1]['rgbaEstimate'],
            'previewCopiesRGBABytes':rows[4]['rgbaEstimate']*2,'scope':'Static byte sizes and RGBA estimates only; GT5 image allocation/sharing unmeasured'}
    (ROOT/'docs/assets.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    sheet=Image.new('RGB',(760,350),'#162b32');draw=ImageDraw.Draw(sheet)
    for i,size in enumerate(DIAMETERS):
        col=i%6;row=i//6;x=col*126+63;y=row*175+77
        image=Image.open(OUT/('fruit_'+str(i)+'.png'));sheet.paste(image,(x-size//2,y-size//2),image)
        draw.text((col*126+17,row*175+143),'fruit_'+str(i)+' / '+str(size)+'px',fill='#eeeeee')
    sheet.save(ROOT/'docs/artwork-preview.png')
    print(json.dumps(report,ensure_ascii=False))
