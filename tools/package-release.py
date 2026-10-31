"""Package a source+official APP release; exclude caches, standalone HAPs and credentials."""
from pathlib import Path
import hashlib,json,zipfile,sys

ROOT=Path(__file__).resolve().parents[1]
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
proof=read(ROOT/'docs/build-source-proof.json')
for name,digest in proof['inputs'].items():assert sha((ROOT/name).read_bytes())==digest,name
app=ROOT/'build/outputs/default'/proof['app']
assert sha(app.read_bytes())==proof['appSha256']
pack=read(ROOT/'docs/package-verification.json')
assert pack['appSha256']==proof['appSha256']
# Optional local protection audit. Never write to the old project.
baseline=ROOT.parent/'baseline-sha256.json'
old=Path(r'G:\HUAWEICODEX\WatermelonGT5-API12-1.2.1-New-Art-APP-and-Source\Source\WatermelonGT5-API12')
old_count=None
if baseline.exists() and old.exists():
    records=read(baseline)
    assert {str(p.relative_to(old)) for p in old.rglob('*') if p.is_file()}=={r['path'] for r in records}
    for row in records:assert sha((old/row['path']).read_bytes()).lower()==row['sha256'].lower(),row['path']
    old_count=len(records)
docs={
 'VALIDATION.md','DESIGN-1.3.0.md','OPTIMIZATION-RESEARCH-1.3.0.md','INSTALL40.md',
 'artwork-preview.png','assets.json','assets-verification.json','reference-hashes.json',
 'build-1.3.0.log','build-source-proof.json','code-tests-1.3.0.log','code-tests.json',
 'engineering-audit-1.3.0.txt','package-verification.json','physics-optimization-tests.json',
 'runtime-optimization-tests.log'
}
scenarios={'entry','logs','game30','game60','gameprobe60','soak60'}
screens={'game30-524288-17s.jpg','game60-524288-17s.jpg','soak60-524288-105s.jpg','soak60-524288-175s.jpg'}
for s in scenarios:
    r=read(ROOT/f'docs/preview/{s}-524288.json');assert r['ok'],s
    expected={k['path'].removeprefix('assets/js/default/'):k['sha256'] for k in pack['snapshots']}
    used=['app.bc','pages/index/index.bc'] if s=='entry' else ['app.bc','pages/game/game.bc']
    assert all(r['compiledSha256'][k]==expected[k] for k in used),s
skip_dirs={'.hvigor','.git','.idea','.ohpm','oh_modules','node_modules','build','__pycache__'}
blocked={'.hap','.p7b','.p12','.pfx','.jks','.keystore','.cer','.pem','.key','.bc','.hsp'}
entries={}
for file in ROOT.rglob('*'):
    if not file.is_file():continue
    rel=file.relative_to(ROOT)
    if any(p in skip_dirs for p in rel.parts) or file.suffix.lower() in blocked:continue
    if file.name in {'local.properties','.DS_Store'}:continue
    if rel.parts[0]=='docs':
        if len(rel.parts)==2 and rel.name in docs:pass
        elif len(rel.parts)==3 and rel.parts[1]=='experiments' and rel.name.startswith('active-list-oom.'):pass
        elif len(rel.parts)==3 and rel.parts[1]=='preview':
            if rel.name not in screens and not any(rel.name==f'{s}-524288{ext}' for s in scenarios for ext in ['.json','.log','.jpg']):continue
        else:continue
    entries['Source/WatermelonGT5-API12/'+rel.as_posix()]=file.read_bytes()
entries['APP/WatermelonGT5-API12-1.3.0-unsigned.app']=app.read_bytes()
entries['先读我.md']=('''# 瓜瓜坠落 1.3.0 性能与内存优化

APP目录是官方Hvigor构建的未签名APP，Source目录是完整工程。没有独立HAP、证书、私钥、Profile或依赖缓存；官方APP内部包含标准模块HAP。

原应用身份com.moyu.gt5.watermelon / moyu / API12保持，素材保持。30和60仍是目标模式。固定40图片槽位复用；减少物理排序；新增时钟/回调诊断。新版尚未在GT5验证，不能承诺达到60帧或已修复旧版470分卡死。

已通过主机代码与官方SDK预览，包含512KiB堆的180秒跨局测试；真实显示FPS、GT5内存和持久化仍须实测。详细数字、撤回实验和复测步骤见Source/WatermelonGT5-API12/docs/VALIDATION.md。

构建：在工程根目录用PowerShell运行 .\\build-app.ps1，默认DevEco路径 E:\\DevEco Studio，可用参数指定本机目录。完整构建/许可证说明见工程README.md。代码MIT；用户素材CC BY-NC 4.0，未改变既有许可。
''').encode('utf-8')
manifest={'version':'1.3.0','GT5Verified':False,'oldProjectUnchangedFiles':old_count,'officialAppSha256':proof['appSha256'],'files':{k:sha(v) for k,v in sorted(entries.items())}}
entries['release-manifest.json']=json.dumps(manifest,ensure_ascii=False,indent=2).encode('utf-8')
dest=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/'WatermelonGT5-API12-1.3.0-源码与APP.zip'
dest.parent.mkdir(parents=True,exist_ok=True)
assert not dest.exists(),'Refusing to overwrite an existing delivery'
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name,content in sorted(entries.items()):z.writestr(name,content)
with zipfile.ZipFile(dest) as z:
    assert z.testzip() is None
    for name,digest in manifest['files'].items():assert sha(z.read(name))==digest
    assert len([n for n in z.namelist() if n.endswith('.app')])==1
    assert not any(Path(n).suffix.lower() in blocked for n in z.namelist())
print(json.dumps({'zip':str(dest),'bytes':dest.stat().st_size,'sha256':sha(dest.read_bytes()),'files':len(entries),'oldProjectUnchangedFiles':old_count,'officialAppBytes':len(app.read_bytes()),'GT5Verified':False},ensure_ascii=False))
