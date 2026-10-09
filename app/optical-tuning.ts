/** UI mapping only: renderers always receive the actual optical option values. */
export type SliderRange={min:number;max:number;step:number;scale?:"log"|"power"};

export function toSliderValue(value:number,control:SliderRange):number{
 const clamped=Math.min(control.max,Math.max(control.min,value));
 return control.scale==="log"&&control.min>0
  ? Math.log(clamped/control.min)/Math.log(control.max/control.min)
  : control.scale==="power"
   ? Math.cbrt((clamped-control.min)/(control.max-control.min))
   : clamped;
}

export function fromSliderValue(value:number,control:SliderRange):number{
 const actual=control.scale==="log"&&control.min>0
  ? control.min*Math.pow(control.max/control.min,Math.min(1,Math.max(0,value)))
  : control.scale==="power"
   ? control.min+(control.max-control.min)*Math.pow(Math.min(1,Math.max(0,value)),3)
   : value;
 // Remove floating-point noise without snapping wide logarithmic ranges to a linear step.
 return Number(Math.min(control.max,Math.max(control.min,actual)).toPrecision(7));
}

export function formatOpticalValue(value:number,unit="×"):string{
 return value.toLocaleString("en-US",{maximumFractionDigits:Math.abs(value)<1?4:2})+unit;
}

export function matchesPreset<T extends Record<string,number>>(options:T,specular:number,preset:{options:T;specular:number}):boolean{
 return specular===preset.specular&&Object.keys(preset.options).every(key=>options[key]===preset.options[key]);
}
