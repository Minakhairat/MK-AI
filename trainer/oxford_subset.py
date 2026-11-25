"""CI only. Writes a small real-photo classification set from Oxford-IIIT Pet (CC BY-SA 4.0, timm parquet mirror, official train/test split):
build/oxs/train/<breed>/*.jpg (30 per breed) and build/oxs/test/<breed>/*.jpg (20 per breed), plus build/oxs/test/truth.json."""
import io,json,os,pyarrow.parquet as pq
from huggingface_hub import hf_hub_download
B=['pug','siamese','samoyed','persian','beagle'];N=['abyssinian','american_bulldog','american_pit_bull_terrier','basset_hound','beagle','bengal','birman','bombay','boxer','british_shorthair','chihuahua','egyptian_mau','english_cocker_spaniel','english_setter','german_shorthaired','great_pyrenees','havanese','japanese_chin','keeshond','leonberger','maine_coon','miniature_pinscher','newfoundland','persian','pomeranian','pug','ragdoll','russian_blue','saint_bernard','samoyed','scottish_terrier','shiba_inu','siamese','sphynx','staffordshire_bull_terrier','wheaten_terrier','yorkshire_terrier']
want={N.index(b):i for i,b in enumerate(B)};T=[]
for split,n in (('train',30),('test',20)):
    rows=pq.read_table(hf_hub_download('timm/oxford-iiit-pet',f'data/{split}-00000-of-00001.parquet',repo_type='dataset')).to_pylist();cnt={}
    for r in rows:
        if r['label'] in want and cnt.get(r['label'],0)<n:
            b=B[want[r['label']]];d=f'build/oxs/{split}/{b}';os.makedirs(d,exist_ok=True);k=cnt.get(r['label'],0);cnt[r['label']]=k+1
            f=f'{d}/{k:02d}.jpg';open(f,'wb').write(r['image']['bytes'])
            if split=='test':T.append({'file':f'{b}/{k:02d}.jpg','label':want[r['label']]})
json.dump({'classes':B,'images':T},open('build/oxs/test/truth.json','w'));print('classes',B,'train 30 each, test',len(T))
