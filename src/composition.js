import { Euler, MathUtils, Quaternion, Vector3 } from 'three';

export const fov = 66;
export const ratio = 16/9;
export const wallRows = [
  {y:7.30,r:12.6,pitch:.28},
  {y:4.87,r:13.2,pitch:.16},
  {y:2.43,r:13.35,pitch:.02},
  {y:-.01,r:13.02,pitch:-.15},
  {y:-2.42,r:11.95,pitch:-.43},
];
export function tilePose(row,col,mobile) {
  const columns=mobile ? 9 : 11, arc=MathUtils.degToRad(mobile ? 120 : 151);
  const spec=wallRows[row], angle=arc/(columns-1), theta=(col-(columns-1)/2)*angle;
  const width=2*spec.r*Math.sin(angle/2)*.935;
  return {
    position:new Vector3(Math.sin(theta)*spec.r,spec.y,-Math.cos(theta)*spec.r),
    rotation:new Euler(spec.pitch,-theta,0,'YXZ'),
    scale:new Vector3(width,width*1.126,1),
    tone:[.37,.46,.54,.51,.40][row]*(1-.16*Math.abs(theta)),
  };
}
export function cameraPose(camera,mobile,x=0,y=0) {
  camera.position.set(.65+x*.22,mobile ? .65 : .6,mobile ? -1.45 : -2.4);
  camera.rotation.set(-.047+y*.018,.045-x*.027,.015,'YXZ');
}
export function featurePose(camera,mobile,position=new Vector3(),rotation=new Quaternion()) {
  const depth=mobile ? 6.3 : 5.9;
  const halfH=depth*Math.tan(MathUtils.degToRad(camera.fov/2)), halfW=halfH*camera.aspect;
  position.set((mobile ? 0 : -.327)*halfW,(mobile ? .155 : .114)*halfH,-depth)
    .applyQuaternion(camera.quaternion).add(camera.position);
  rotation.setFromEuler(new Euler(mobile ? -.06 : .05,mobile ? .13 : .14,mobile ? -.022 : -.045,'YXZ'))
    .premultiply(camera.quaternion);
  const width=halfW*2*(mobile ? .875 : .5);
  return {position,rotation,width,heightScale:width*(mobile ? 1 : 1.08)};
}
