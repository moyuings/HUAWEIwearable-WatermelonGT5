"""Inspect official APP/HAP payloads and independent snapshot outputs; read-only."""
from pathlib import Path
import hashlib,io,json,re,subprocess,zipfile,xml.etree.ElementTree as ET,runpy
ROOT=Path(__file__).resolve().parents[1]
SDK=Path(r'E:\DevEco Studio\sdk\default\openharmony')
APP=next((ROOT/'build/outputs/default').glob('*unsigned.app'))
LOADER=ROOT/'entry/build/default/intermediates/loader_out_lite/default/js/default'
def sha(b):return hashlib.sha256(b).hexdigest()
report={'app':APP.name,'appBytes':APP.stat().st_size,'appSha256':sha(APP.read_bytes()),'GT5Verified':False,'snapshots':[],'images':[]}
with zipfile.ZipFile(APP) as z:
    assert z.testzip() is None
    hapnames=[n for n in z.namelist() if n.endswith('.hap')];assert len(hapnames)==1
    with zipfile.ZipFile(io.BytesIO(z.read(hapnames[0]))) as h:
        assert h.testzip() is None
        config=json.loads(h.read('config.json').decode('utf-8'))
        assert config['app']['bundleName']=='com.moyu.gt5.watermelon'
        report['packagedConfig']=config
        # Numeric SDK target encodes 5.0.0/API12 as 50000012.
        assert config['app']['apiVersion']['target']==50000012
        assert config['app']['apiVersion']['compatible']==50000012
        assert config['module']['abilities'][0]['name']=='default'
        assert config['module']['js'][0]['name']=='default'
        assert config['module']['js'][0]['pages'][0]=='pages/index/index'
        assert len(list(LOADER.rglob('*.bc')))==3
        for f in LOADER.rglob('*.bc'):
            key='assets/js/default/'+f.relative_to(LOADER).as_posix()
            assert h.read(key)==f.read_bytes(),key
            js=f.with_suffix('.js');assert js.stat().st_size<48*1024
            out=ROOT/'entry/build/snapshot-check'/f.relative_to(LOADER);out.parent.mkdir(parents=True,exist_ok=True)
            result=subprocess.run([str(SDK/'js/build-tools/ace-loader/bin/jerry-snapshot.exe'),'generate','-o',str(out),str(js)],capture_output=True,text=True)
            assert result.returncode==0,result.stdout+result.stderr
            assert out.read_bytes()==f.read_bytes()
            report['snapshots'].append({'path':key,'sourceBytes':js.stat().st_size,'snapshotBytes':f.stat().st_size,'sha256':sha(f.read_bytes()),'independentSdkCompilerMatches':True})
        for f in (LOADER/'common/fruit').glob('*.png.bin'):
            key='assets/js/default/'+f.relative_to(LOADER).as_posix()
            assert h.read(key)==f.read_bytes(),key
            report['images'].append({'path':key,'packagedBytes':f.stat().st_size,'sha256':sha(f.read_bytes())})
        launcher=runpy.run_path(str(ROOT/'tools/launcher-guard.py'))
        report['launcher']=launcher['check']({n:h.read(n) for n in h.namelist() if not n.endswith('/')})
        report['unsigned']=not any('signature' in n.lower() or n.lower().endswith(('.p7b','.p12','.cer','.pem','.key')) for n in h.namelist())
        assert report['unsigned']
hml=ROOT/'entry/src/main/js/default/pages/game/game.hml'
tree=ET.fromstring(hml.read_text(encoding='utf-8'))
allowed={'stack','div','image','text','input','qrcode'}
for element in tree.iter():
    assert element.tag in allowed
    assert not ('for' in element.attrib and 'if' in element.attrib)
    for value in element.attrib.values():assert not any(token in value for token in ['=>','?.','??','`'])
report['sourceLayoutPassed']=True
manifest=json.loads((ROOT/'docs/reference-hashes.json').read_text(encoding='utf-8'))
ref=Path(manifest['root']);actual={str(p.relative_to(ref)):sha(p.read_bytes()) for p in ref.rglob('*') if p.is_file()}
assert actual==manifest['files'];report['readOnlyReferenceUnchanged']=len(actual)
baseline=ROOT.parent/'baseline-hashes.json'
if baseline.exists():
    original=json.loads(baseline.read_text(encoding='utf-8'))
    for name,digest in original['files'].items():assert sha((Path(original['root'])/name).read_bytes())==digest,name
    report['oldGameUnchanged']=len(original['files'])
for file in (ROOT/'entry/src/main/js').rglob('*.js'):
    code=file.read_text(encoding='utf-8')
    # Strip ordinary comments for syntax heuristic, then audit forbidden runtimes.
    code=re.sub(r'//[^\n]*','',code)
    assert not re.search(r'\b(async|await|Promise|Map|Set|eval|require|requestAnimationFrame)\b|\?\.|\?\?',code),file
(ROOT/'docs/package-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'appBytes':report['appBytes'],'snapshots':len(report['snapshots']),'nativeImagePayloads':len(report['images']),'targetApi':12,'referenceUnchanged':len(actual),'unsigned':report['unsigned']}))
