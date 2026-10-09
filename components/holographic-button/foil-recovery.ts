/** Foil and mirror adaptive light frame. Device motion is never smoothed or rewritten.
 * A bounded unit-quaternion light correction follows the current attitude over
 * seconds; C * device therefore responds immediately, then settles into the
 * centered colored emitter. No Euler headings, accumulated turns or timers.
 */
type Quaternion = [number, number, number, number];
type MatrixRef = { current: Float32Array };
const identity: Quaternion = [0, 0, 0, 1];
const normalize = (q: Quaternion): Quaternion => { const length = Math.hypot(...q); return q.map(v => v / length) as Quaternion; };
function multiply(a: Quaternion, b: Quaternion): Quaternion {
 const [x,y,z,w]=a,[X,Y,Z,W]=b;
 return normalize([w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z]);
}
function quaternion(m: ArrayLike<number>): Quaternion {
 const trace=m[0]+m[4]+m[8]; let q: Quaternion;
 if(trace>0){const s=Math.sqrt(trace+1)*2;q=[(m[5]-m[7])/s,(m[6]-m[2])/s,(m[1]-m[3])/s,s/4];}
 else if(m[0]>m[4]&&m[0]>m[8]){const s=Math.sqrt(1+m[0]-m[4]-m[8])*2;q=[s/4,(m[3]+m[1])/s,(m[6]+m[2])/s,(m[5]-m[7])/s];}
 else if(m[4]>m[8]){const s=Math.sqrt(1+m[4]-m[0]-m[8])*2;q=[(m[3]+m[1])/s,s/4,(m[7]+m[5])/s,(m[6]-m[2])/s];}
 else{const s=Math.sqrt(1+m[8]-m[0]-m[4])*2;q=[(m[6]+m[2])/s,(m[7]+m[5])/s,s/4,(m[1]-m[3])/s];}
 return normalize(q);
}
function matrix([x,y,z,w]: Quaternion): Float32Array {
 return new Float32Array([1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y)]);
}
function slerp(a: Quaternion,b: Quaternion,t:number): Quaternion {
 let dot=a.reduce((sum,v,i)=>sum+v*b[i],0);
 if(dot<0){b=b.map(v=>-v) as Quaternion;dot=-dot;}
 if(dot>1-1e-12)return normalize(a.map((v,i)=>v+(b[i]-v)*t) as Quaternion);
 const angle=Math.acos(Math.min(1,dot)),s=Math.sin(angle);
 return normalize(a.map((v,i)=>(v*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/s) as Quaternion);
}
// Orthonormal emitter basis used by both shaders, centered on the flat face.
const target=quaternion([.997884910,-.011350451,-.064006826,.062139647,.455690748,.887966557,.019088498,-.890065790,.455432235]);
export function createFoilRecovery() {
 let correction: Quaternion=[...identity],last: number | undefined;
 let output=matrix(identity);
 return {
  sample(raw: Float32Array,now:number,recoverySeconds=2.5): Float32Array {
   if(last===now)return output;
   const device=quaternion(raw),desired=multiply(target,[-device[0],-device[1],-device[2],device[3]]);
   const elapsed=last===undefined||!Number.isFinite(now)?0:Math.max(0,(now-last)/1000);
   // Hidden tabs do not accrue adaptation debt. First resumed frame retains the
   // old light but reflects any new device attitude immediately.
   const dt=elapsed>.25?0:Math.min(elapsed,.1);
   if(Number.isFinite(now))last=now;
   const seconds=Number.isFinite(recoverySeconds)?Math.min(30,Math.max(.1,recoverySeconds)):2.5;
   correction=slerp(correction,desired,-Math.expm1(-dt/seconds));
   output=matrix(multiply(correction,device));
   return output;
  },
 };
}
const shared=new WeakMap<MatrixRef,{ users:number; recovery:ReturnType<typeof createFoilRecovery> }>();
export function retainFoilRecovery(ref:MatrixRef):()=>void {
 const entry=shared.get(ref)??{users:0,recovery:createFoilRecovery()};
 shared.set(ref,entry);entry.users++;
 let released=false;
 return()=>{if(released)return;released=true;if(--entry.users===0)shared.delete(ref);};
}
export function foilRecoveryMatrix(ref:MatrixRef,now:number):Float32Array {
 return shared.get(ref)?.recovery.sample(ref.current,now)??ref.current;
}
