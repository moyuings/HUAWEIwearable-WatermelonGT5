"""Validate the packaged Lite launcher-resource contract. No signing or binary patching."""
from pathlib import Path,PurePosixPath
import io,json,struct,zipfile

REQUIRED={'icon.png':(114,114),'icon_small.png':(80,80)}

def resource_entries(raw):
    # Restool resource records: little-endian size/type/id, UTF-8 value/name.
    found=[]
    for p in range(len(raw)-16):
        size,kind,resid=struct.unpack_from('<III',raw,p)
        end=p+4+size
        if size<12 or end>len(raw) or not (0x1000000<=resid<=0x1FFFFFF):continue
        sizev=struct.unpack_from('<H',raw,p+12)[0];pn=p+14+sizev
        if pn+2>end:continue
        sizen=struct.unpack_from('<H',raw,pn)[0]
        if pn+2+sizen!=end:continue
        try:
            value=raw[p+14:pn].decode('utf-8').rstrip('\0')
            name=raw[pn+2:end].decode('utf-8').rstrip('\0')
        except UnicodeDecodeError:continue
        if name:found.append({'type':kind,'id':resid,'name':name,'value':value})
    return found

def signed_files(raw):
    assert raw[-32:-16]==b'hw signed app   '
    end=len(raw)-int.from_bytes(raw[-12:-8],'big');p=1
    def integer(n):
        nonlocal p
        assert p+n<=end;v=int.from_bytes(raw[p:p+n],'big');p+=n;return v
    def string():
        nonlocal p
        n=integer(4);assert 0<=n<16384 and p+n<=end
        v=raw[p:p+n].decode('utf-8');p+=n;return v
    string();out={}
    while p<end:
        name=string();folder=string();n=integer(8);assert p+n<=end
        key=(folder.strip('/')+'/'+name).lstrip('/');assert key not in out
        out[key]=raw[p:p+n];p+=n
    assert p==end;return out

def unwrap(path):
    data=Path(path).read_bytes()
    if not zipfile.is_zipfile(io.BytesIO(data)):return signed_files(data)
    z=zipfile.ZipFile(io.BytesIO(data))
    for _ in range(3):
        names=z.namelist();assert z.testzip() is None
        if 'config.json' in names:return {n:z.read(n) for n in names if not n.endswith('/')}
        if 'signed.bin' in names:return signed_files(z.read('signed.bin'))
        child=next(n for n in names if n.endswith(('.hap','.app')))
        z=zipfile.ZipFile(io.BytesIO(z.read(child)))
    raise ValueError('No module payload')

def check(files):
    config=json.loads(files['config.json']);ability=config['module']['abilities'][0]
    indexes=[n for n in files if n.endswith('resources.index')]
    assert len(indexes)==1,'expected one module resource index'
    entries=resource_entries(files[indexes[0]])
    def entry(resid,name):
        matches=[e for e in entries if e['id']==resid and e['name']==name]
        assert len(matches)==1,'resource ID is not uniquely resolved: '+name
        return matches[0]
    assert ability['icon']=='$media:icon'
    icon=entry(ability['iconId'],'icon')
    label_name=ability['label'].split(':',1)[1]
    label=entry(ability['labelId'],label_name)
    assert label['value'] and len(label['value'].encode('utf-8'))<=30
    assert len(ability['label'].encode('utf-8'))<=30
    directory='assets/'+str(PurePosixPath(icon['value']).parent)
    for name in REQUIRED:
        assert directory+'/'+name in files,'missing launcher PNG: '+directory+'/'+name
        choices=[directory+'/'+name+'.bin',directory+'/'+name[:-4]+'.bin']
        assert any(n in files for n in choices),'missing launcher BIN: '+directory+'/'+name
    pictures=[]
    for name,expected in REQUIRED.items():
        key=directory+'/'+name
        assert key in files,'missing launcher PNG: '+key
        native=key+'.bin' if key+'.bin' in files else directory+'/'+name[:-4]+'.bin'
        raw=files[key];assert raw.startswith(b'\x89PNG\r\n\x1a\n')
        dimensions=struct.unpack('>II',raw[16:24]);assert dimensions==expected,(name,dimensions,expected)
        # These project assets are RGBA; the current SDK converts them to 8-byte header + pixels.
        assert len(files[native])>=8
        if native.endswith('.png.bin'):assert len(files[native])==expected[0]*expected[1]*4+8
        pictures.append({'path':key,'nativePath':native,'width':expected[0],'height':expected[1],'nativeBytes':len(files[native])})
    return {'passed':True,'label':label['value'],'iconId':ability['iconId'],'iconDirectory':directory,'icons':pictures}

if __name__=='__main__':
    import sys
    print(json.dumps(check(unwrap(sys.argv[1])),ensure_ascii=False))
