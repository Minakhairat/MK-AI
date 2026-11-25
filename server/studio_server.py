# Local-only studio server (binds 127.0.0.1): serves out/studio and runs the trainer on this computer. No cloud.
import http.server,json,os,subprocess,sys,threading,time,shutil
ROOT='studio';JOB={'state':'idle','log':[]};LOCK=threading.Lock()
def run(zp,ep):
    with LOCK:JOB.update(state='running',log=[]);JOB.pop('error',None)
    os.makedirs('build/job',exist_ok=True)
    p=subprocess.Popen([sys.executable,'trainer/rt_pipeline.py',zp,'build/job',str(ep)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    tail=[]
    for l in p.stdout:
        if l.startswith('PROGRESS'):JOB['log'].append(l.strip()[9:])
        else:tail=(tail+[l.rstrip()[:300]])[-12:]
    p.wait();ok=p.returncode==0 and os.path.exists('build/job/app.zip')
    if not ok:JOB['error']='trainer exit code %s (negative means killed by a signal, for example out of memory). Last output: %s'%(p.returncode,' | '.join(tail))
    JOB['state']='done' if ok else 'error'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k):super().__init__(*a,directory=ROOT,**k)
    def do_POST(s):
        if s.path.startswith('/api/train'):
            n=int(s.headers['content-length']);open('build/job_dataset.zip','wb').write(s.rfile.read(n))
            if JOB['state']=='running':s.send_response(409);s.end_headers();return
            ep=int(s.path.split('epochs=')[-1]) if 'epochs=' in s.path else 12
            if os.path.exists('build/job/app.zip'):os.remove('build/job/app.zip')
            threading.Thread(target=run,args=('build/job_dataset.zip',ep),daemon=True).start();s.send_response(202);s.end_headers()
    def do_GET(s):
        if s.path=='/api/status':
            b=json.dumps(JOB).encode();s.send_response(200);s.send_header('content-type','application/json');s.end_headers();s.wfile.write(b)
        elif s.path=='/api/result.zip' and os.path.exists('build/job/app.zip'):
            b=open('build/job/app.zip','rb').read();s.send_response(200);s.send_header('content-type','application/zip');s.send_header('content-disposition','attachment; filename=mkai-detector-app.zip');s.end_headers();s.wfile.write(b)
        else:super().do_GET()
http.server.ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),H).serve_forever()
