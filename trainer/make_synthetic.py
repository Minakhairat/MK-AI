"""Writes a tiny synthetic detection dataset (colored shapes drawn with PIL, no photos) as a Studio-format zip.
Used only for self-tests: it needs no external images, so it carries no data-license questions."""
import sys,io,json,random,zipfile
from PIL import Image,ImageDraw
def make(path,n=12,seed=0):
    random.seed(seed);z=zipfile.ZipFile(path,'w');meta={'classes':['square','circle'],'images':[]}
    for i in range(n):
        im=Image.new('RGB',(320,320),tuple(random.randint(150,230) for _ in range(3)));d=ImageDraw.Draw(im);boxes=[]
        for _ in range(random.randint(1,3)):
            c=random.randint(0,1);s=random.randint(60,110);x=random.randint(0,320-s);y=random.randint(0,320-s)
            (d.rectangle if c==0 else d.ellipse)([x,y,x+s,y+s],fill=(200,30,30) if c==0 else (30,30,200));boxes.append([x,y,x+s,y+s,c])
        b=io.BytesIO();im.save(b,'JPEG');name=f'images/{i}.jpg';z.writestr(name,b.getvalue());meta['images'].append({'file':name,'width':320,'height':320,'boxes':boxes})
    z.writestr('annotations.json',json.dumps(meta));z.close()
if __name__=='__main__':make(sys.argv[1],int(sys.argv[2]) if len(sys.argv)>2 else 12)
