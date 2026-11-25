"""Exports the image feature extractor used by the classify Studio to ONNX.
Model: timm/mobilenetv3_small_100.lamb_in1k (Hugging Face model card license: apache-2.0, trained on ImageNet-1k).
Pinned to the revision below. See NOTICE-MODEL.txt (written next to the model) for attribution."""
import os,sys,torch,timm
REV='76b303ec28c466e9df37f4745dfb7aef20ab87ae'
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY','1')
m=timm.create_model('hf_hub:timm/mobilenetv3_small_100.lamb_in1k',pretrained=True,num_classes=0,pretrained_cfg_overlay=dict(hf_hub_id='timm/mobilenetv3_small_100.lamb_in1k')).eval()
out=sys.argv[1] if len(sys.argv)>1 else 'studio/base'
os.makedirs(out,exist_ok=True)
torch.onnx.export(m,(torch.rand(1,3,224,224),),out+'/feat.onnx',opset_version=17,input_names=['image'],output_names=['feat'],dynamic_axes={'image':{0:'b'},'feat':{0:'b'}},dynamo=False)
open(out+'/NOTICE-MODEL.txt','w').write("""Model: mobilenetv3_small_100.lamb_in1k, from https://huggingface.co/timm/mobilenetv3_small_100.lamb_in1k
Revision: %s
Model card license: Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0). Pretrained on ImageNet-1k.
Converted to ONNX (feature extractor, classifier layer removed) by MK AI. Weights are otherwise unmodified.
Credits: timm by Ross Wightman; architecture: Howard et al., Searching for MobileNetV3 (2019).
Effect of the ImageNet-1k dataset terms on the weights is an open uncertainty, not assessed here.
"""%REV)
import urllib.request
open(out+'/LICENSE-APACHE-2.0.txt','wb').write(urllib.request.urlopen('https://www.apache.org/licenses/LICENSE-2.0.txt',timeout=30).read())
print('backbone exported')
