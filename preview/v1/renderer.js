export const shader=`
struct U { rotation:mat4x4f, params:vec4f, size:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(xy[i],0.,1.);
}
fn encode(c:vec3f)->vec3f {return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
fn film(x:f32)->vec3f {return .5+.5*cos(vec3f(0.,2.1,4.2)+x);}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let kind=u.params.x;let hdr=u.params.y;let peak=u.params.z;let press=u.params.w;
 let uv=pixel.xy/u.size.xy;let aspect=u.size.x/u.size.y;
 if(kind>9.) {let idx=min(u32(uv.x*4.),3u);let levels=array<f32,4>(1.,1.5,2.,4.);var v=levels[idx];if(hdr<.5){v=min(v,1.);}return vec4f(encode(vec3f(v)),1.);}
 let p=(uv-.5)*vec2f(aspect,1.);let q=vec2f(max(abs(p.x)-(aspect*.5-.48),0.),p.y);
 let sd=length(q)-.34;let aa=max(fwidth(sd),.001);let body=1.-smoothstep(-aa,aa,sd);
 let edge=exp(-pow(abs((sd+.025)/.045),2.));
 let nLocal=normalize(vec3f(q.x*.6+sign(p.x)*edge*.55,p.y*.8+sign(p.y)*edge*.55,1.));
 let n=normalize((u.rotation*vec4f(nLocal,0.)).xyz);let view=normalize((u.rotation*vec4f(0.,0.,1.,0.)).xyz);
 let light=normalize(vec3f(-.32,-.42,1.));let halfV=normalize(view+light);let ndh=clamp(dot(n,halfV),0.,1.);let ndv=clamp(dot(n,view),0.,1.);
 let refl=reflect(-view,n);let stripe=exp(-pow(abs((refl.x+.26)/(.09+press*.025)),2.)-pow(abs((refl.y+.35)/.48),4.));let glint=pow(ndh,180.-press*45.);
 let grain=sin(p.x*240.+p.y*19.)*.5+.5;var base=vec3f(.035,.045,.055);var rough:f32=.16;var tint=film(dot(n,light)*13.+p.x*.35);
 if(kind<.5){base+=tint*.09*(.3+stripe);}else if(kind<1.5){base=vec3f(.18,.20,.23)*(.94+.06*grain);tint=film(p.x*9.+dot(n,light)*17.);rough=.32;}else if(kind<2.5){base=vec3f(.48,.45,.52)+film(ndv*7.)*.12;rough=.45;tint=mix(vec3f(1.),film(ndv*12.),.3);}else{base=vec3f(.07,.1,.12)+film(dot(n,light)*19.+p.x*3.)*.23;rough=.12;}
 let spec=(stripe*(1.-rough)+glint*.55+edge*.2*stripe)*(1.+peak*3.);
 var radiance=base*(.45+.55*pow(max(dot(n,light),0.),3.))+mix(vec3f(.92,.96,1.),tint,.22)*spec;
 radiance+=pow(1.-ndv,5.)*vec3f(.10,.15,.21);if(hdr<.5){radiance=radiance/(vec3f(1.)+radiance);}
 return vec4f(encode(mix(vec3f(.012,.015,.020),radiance,body)),1.);
}`;
let promise;
export function getDevice(){return promise??=(async()=>{if(!navigator.gpu)throw Error('WebGPU 미지원');const a=await navigator.gpu.requestAdapter();if(!a)throw Error('GPU 어댑터 없음');return a.requestDevice();})();}
let initQueue=Promise.resolve();
export function createRenderer(canvas,o){const next=initQueue.then(()=>initialize(canvas,o));initQueue=next.catch(()=>{});return next;}
async function initialize(canvas,o){
 const device=await getDevice(),context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas 없음');
 let buffer,scopeOpen=true,ok=false; device.pushErrorScope('validation');try { context.configure({device,format:'rgba16float',colorSpace:'srgb',alphaMode:'opaque',toneMapping:{mode:o.hdr?'extended':'standard'}});
 const module=device.createShaderModule({code:shader});const info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(m=>m.message).join('\n'));
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
 buffer=device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
 const err=await device.popErrorScope();scopeOpen=false;if(err){buffer.destroy();context.unconfigure();throw Error(err.message);}
 if(o.hdr&&context.getConfiguration?.()?.toneMapping?.mode!=='extended'){buffer.destroy();context.unconfigure();throw Error('extended 설정 확인 불가');}
 let stopped=false,raf=0,press=0;const values=new Float32Array(24);
 const frame=()=>{if(stopped)return;try {if(!document.hidden){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}
 const m=o.matrix();values.set([m[0],m[1],m[2],0,m[3],m[4],m[5],0,m[6],m[7],m[8],0,0,0,0,1]);press+=(o.pressed()-press)*.2;values.set([o.kind,o.hdr?1:0,o.peak(),press,w,h,0,0],16);device.queue.writeBuffer(buffer,0,values);
 const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);}raf=requestAnimationFrame(frame);}catch(e){stopped=true;buffer.destroy();context.unconfigure();o.error(String(e.message));}};raf=requestAnimationFrame(frame);
 device.lost.then(info=>{if(!stopped){cancelAnimationFrame(raf);o.error('GPU 연결 종료: '+info.reason);}});ok=true;return()=>{stopped=true;cancelAnimationFrame(raf);buffer.destroy();context.unconfigure();};
 } finally {if(scopeOpen)await device.popErrorScope();if(!ok){buffer?.destroy();context.unconfigure();}}
}
