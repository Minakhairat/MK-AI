# Adds a test hook to a copy of an exported detector app: after the model loads it runs detect() once on a generated image and logs the result.
import sys
p=sys.argv[1];s=open(p,encoding='utf-8').read()
hook='''<script>
(function(){var t0=Date.now();var iv=setInterval(async function(){
 if(window.err){clearInterval(iv);console.log('MKAI_NATIVE_FAIL '+window.err);return;}
 if(!window.ready){if(Date.now()-t0>240000){clearInterval(iv);console.log('MKAI_NATIVE_FAIL timeout waiting for model');}return;}
 clearInterval(iv);
 try{var c=document.createElement('canvas');c.width=c.height=320;var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,320,320);g.fillStyle='#d00';g.fillRect(80,80,100,100);
  var im=new Image();await new Promise(function(r){im.onload=r;im.src=c.toDataURL();});
  var r=await window.detect(im);
  console.log('MKAI_NATIVE_OK secure='+window.isSecureContext+' origin='+location.origin+' cam='+(!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))+' detections='+r.length);
 }catch(e){console.log('MKAI_NATIVE_FAIL '+e);}
},1000);})();
</script></body>'''
assert '</body>' in s
open(p,'w',encoding='utf-8').write(s.replace('</body>',hook,1))
