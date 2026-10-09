// Optional CPU diagnostic. Run from repository root; outputs PPM + JSON to the
// requested directory. No GPU, font, image or browser dependency is required.
import {writeFile,mkdir} from 'node:fs/promises';
import {opticalModel,options} from '../components/holographic-button/tests/optical-reference.mjs';
const out=process.argv[2]??'/tmp/optical-presets';await mkdir(out,{recursive:true});
const poses=[[62.9,1.1,0],[50,-15,0],[75,15,0],[0,0,0]];
const width=320,height=80,gap=12,W=width*poses.length+gap*(poses.length-1),H=height*options.OPTICAL_PRESETS.length+gap*(options.OPTICAL_PRESETS.length-1);
const pixels=Buffer.alloc(W*H*3,18),report=[];
for(const [row,preset]of options.OPTICAL_PRESETS.entries()){
 const model=opticalModel(undefined,undefined,preset.options);
 for(const [column,pose]of poses.entries()){
  let chroma=0,luma=0,count=0,peak=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const s=model.shade({pose,x:(x+.5)/height-2,y:.5-(y+.5)/height,height:148,intensity:preset.specular});
   if(s.alpha>.99){count++;chroma+=Math.max(...s.color)-Math.min(...s.color);luma+=s.color[0]*.2126+s.color[1]*.7152+s.color[2]*.0722;peak=Math.max(peak,...s.radiance)}
   const index=((row*(height+gap)+y)*W+column*(width+gap)+x)*3;
   for(let c=0;c<3;c++)pixels[index+c]=Math.round(s.color[c]*s.alpha*255+18*(1-s.alpha));
  }
  report.push({preset:preset.id,pose,meanChroma:chroma/count,meanEncodedLuma:luma/count,peakLinear:peak});
 }
}
await writeFile(out+'/presets.ppm',Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`),pixels]));
await writeFile(out+'/metrics.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({out,rows:options.OPTICAL_PRESETS.map(p=>p.label),columns:poses,metrics:report}));
