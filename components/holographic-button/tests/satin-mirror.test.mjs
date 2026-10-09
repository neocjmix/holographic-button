import test from 'node:test';
import assert from 'node:assert/strict';
import {glsl,wgsl,scalarFunction,norm,dot,attitude,componentSource,models,distance} from './sticker-foil-reference.mjs';
const bindings={exp:Math.exp,step:(edge,x)=>x<edge?0:1};
const params={mirrorRect:['x','y','cx','cy','hx','hy'],mirrorRoom:['horizontal','vertical','forward','intensity'],mirrorWeight:['i'],mirrorHeight:['x','y']};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const basis=models[0][1].basis;
export const mirrorModels=[glsl,wgsl].map((source,i)=>{
 const m={};for(const [name,args]of Object.entries(params))m[name]=scalarFunction(source,`${i?'fn':'float'} ${name}(`,args,{...bindings,...m});
 m.reflection=(r,tangent,intensity)=>{
  const t=norm(tangent.map((v,i)=>v-r[i]*dot(tangent,r))),b=cross(r,t);let sum=0;
  for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++){
   const ray=norm(r.map((v,i)=>v+t[i]*x*.11+b[i]*y*.009));
   sum+=m.mirrorRoom(...basis.map(axis=>dot(ray,axis)),intensity)*m.mirrorWeight(x)*(2-Math.abs(y))/64;
  }return sum;
 };
 m.shade=({x=0,y=0,pose=[62.9,1.1,0],intensity=5,offset=0}={})=>{
  const matrix=attitude(pose),world=v=>[0,1,2].map(i=>matrix[i]*v[0]+matrix[i+3]*v[1]+matrix[i+6]*v[2]);
  const micro=[(m.mirrorHeight(x+.0005,y)-m.mirrorHeight(x-.0005,y))/.001,(m.mirrorHeight(x,y+.0005)-m.mirrorHeight(x,y-.0005))/.001];
  const uv=[x/4+.5,.5-y],eps=.00001,dx=(distance([uv[0]+eps/4,uv[1]],4)-distance([uv[0]-eps/4,uv[1]],4))/(2*eps),dy=(distance([uv[0],uv[1]-eps],4)-distance([uv[0],uv[1]+eps],4))/(2*eps),gd=norm([dx+.00001,dy+.00001]),slope=models[0][1].rim(Math.max(0,-distance(uv,4)))[1];
  const n=norm(world(norm([gd[0]*slope-micro[0],gd[1]*slope-micro[1],1]))),v=norm(world(norm([-x+offset,-y,5]))),r=n.map((c,i)=>2*dot(n,v)*c-v[i]);
  return .015+.78*m.reflection(r,world([1,0,0]),intensity);
 };
 return m;
});
test('sixth style is distinct and shares only the adaptive light frame and rim',()=>{
 assert.match(componentSource,/"satin-mirror":\{method:5/);
 assert.match(componentSource,/preset.method>=4\?retainFoilRecovery/);
 assert.match(componentSource,/preset.method>=4\?foilRecoveryMatrix/);
 for(const s of [glsl,wgsl]){
  assert.match(s,/if\s*\(method\s*>\s*4.5\)/);
  assert.match(s,/mirrorReflection\(r,\s*t,\s*(specularEnabled|specularIntensity)\)/);
  assert.match(s,/t \* \(x \* .11\) \+ b \* \(y \* .009\)/);
 }
});
test('bounded filter has unit weight and more than tenfold horizontal angular standard deviation',()=>{
 const m=mirrorModels[0];let sum=0,x2=0,y2=0;
 for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++){
  const w=m.mirrorWeight(x)*(2-Math.abs(y))/64;sum+=w;x2+=w*(x*.11)**2;y2+=w*(y*.009)**2;
 }assert.equal(sum,1);assert.ok(Math.sqrt(x2/y2)>10);
});
test('GLSL and WGSL room radiance, microscopic defects and reflection agree',()=>{
 const [a,b]=mirrorModels;
 for(let i=0;i<101;i++)for(const intensity of [0,1,5,10]){
  const x=-2+4*i/100,y=Math.sin(i)*.4;
  assert.equal(a.mirrorHeight(x,y),b.mirrorHeight(x,y));
  assert.equal(a.shade({x,y,intensity}),b.shade({x,y,intensity}));
 }
});
test('reflection follows viewer and attitude; baseline room remains gray at zero light',()=>{
 for(const m of mirrorModels){
  const values=Array.from({length:81},(_,i)=>m.shade({x:-1.8+i*.045}));
  assert.ok(Math.max(...values)-Math.min(...values)>.25);
  let viewDelta=0,poseDelta=0;
  for(let i=0;i<41;i++){const x=-1.8+i*.09,a=m.shade({x});viewDelta+=Math.abs(a-m.shade({x,offset:1}));poseDelta+=Math.abs(a-m.shade({x,pose:[80,10,0]}));}
  assert.ok(viewDelta/41>.08);assert.ok(poseDelta/41>.08);
  for(const pose of [[0,0,0],[62.9,1.1,0],[180,90,270],[-90,-90,180]])for(const intensity of [0,5,1000]){
   const c=m.shade({pose,intensity});assert.ok(Number.isFinite(c)&&c>0&&c<20);
  }
  const off=m.shade({intensity:0});assert.ok(off>.06&&off<.6);
  assert.ok(Math.max(...values)>1,'linear radiance must reach HDR');
 }
});
test('bubbles and scratches are subtle localized physical heights on a flat face',()=>{
 for(const m of mirrorModels){let maxH=0,maxSlope=0;
  for(let x=-2;x<2;x+=.01)for(let y=-.4;y<.4;y+=.01){
   maxH=Math.max(maxH,Math.abs(m.mirrorHeight(x,y)));
   maxSlope=Math.max(maxSlope,Math.hypot((m.mirrorHeight(x+.0005,y)-m.mirrorHeight(x-.0005,y))/.001,(m.mirrorHeight(x,y+.0005)-m.mirrorHeight(x,y-.0005))/.001));
  }
  assert.ok(maxH<=.000101&&maxH>.00009);assert.ok(maxSlope<.007);
  assert.ok(Math.abs(m.mirrorHeight(0,.4))<1e-10);
 }
});
