# Replaces the default Capacitor launcher icons with the MK AI icon (legacy PNG icons; adaptive icon XML removed so they are used).
import sys,os,json,base64,shutil,glob
res,src=sys.argv[1],sys.argv[2]
png=base64.b64decode(json.load(open(src))['pwa-512x512.png'])
for d in glob.glob(os.path.join(res,'mipmap-*')):
    if d.endswith('anydpi-v26'):shutil.rmtree(d);continue
    for n in ('ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'):
        open(os.path.join(d,n),'wb').write(png)
print('icons replaced')
