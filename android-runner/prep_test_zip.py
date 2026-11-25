# CI only: adds the native test hook to index.html inside a copy of an export zip (test-export.zip bundled in the runner APK).
import sys,zipfile,subprocess,os
src,dst=sys.argv[1],sys.argv[2]
zi=zipfile.ZipFile(src);zo=zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED)
for n in zi.namelist():
    d=zi.read(n)
    if n=='index.html':
        open('/tmp/ix.html','wb').write(d);subprocess.check_call([sys.executable,'android-runner/inject_hook.py','/tmp/ix.html']);d=open('/tmp/ix.html','rb').read()
    zo.writestr(n,d)
zo.close()
