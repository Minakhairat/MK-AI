# Writes the MK AI icon as the single 1024x1024 iOS app icon (upscaled from the 512 px brand PNG, flattened to RGB because iOS rejects alpha).
import sys,json,base64,io
from PIL import Image
out,src=sys.argv[1],sys.argv[2]
im=Image.open(io.BytesIO(base64.b64decode(json.load(open(src))['pwa-512x512.png']))).convert('RGBA')
bg=Image.new('RGBA',im.size,(30,33,39,255));bg.alpha_composite(im);bg.convert('RGB').resize((1024,1024),Image.LANCZOS).save(out)
print('icon ok')
