import React from 'react';

/** Small code-native crop pictograms; text labels remain the accessible names. */
export default function CropIcon({crop}:{crop:string}){
 let drawing:React.ReactNode;
 switch(crop){
  case 'Onion':drawing=<><path d="M23 5c0 8-13 13-13 24a14 14 0 0 0 28 0C38 18 25 13 25 5" fill="#d8b4cb"/><path d="M24 14c-7 12-8 20 0 27m0-27c7 12 8 20 0 27M20 7l4 5 4-5"/></>;break;
  case 'Tomato':drawing=<><path d="M24 17c-18-8-25 21-7 25 5 1 7-1 7-1s3 2 8 1c18-4 11-33-8-25" fill="#de7868"/><path d="m24 11-1 10-8-3 6 7 4-3 7 2-5-6M24 11l4-5"/></>;break;
  case 'Grape':drawing=<><path d="M26 6c0 8-5 8-6 13m6-10c9-5 14-3 14 3-7 2-11 2-14-3" fill="#87ad72"/>{[[17,20],[29,20],[13,29],[24,29],[35,29],[19,38],[29,38],[24,44]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#b298cc"/>)}</>;break;
  case 'Wheat':drawing=<><path d="M24 44V8"/>{[13,23,33].map(y=><g key={y}><path d={`M24 ${y+7}C12 ${y+7} 11 ${y} 12 ${y-3}c9 0 12 6 12 10`} fill="#e1bc60"/><path d={`M24 ${y+7}c12 0 13-7 12-10-9 0-12 6-12 10`} fill="#e1bc60"/></g>)}</>;break;
  case 'Rice':drawing=<><path d="M15 44c16-18 21-30 7-37M20 9C10 20 11 26 8 32"/>{[[22,12],[25,18],[25,25],[21,32],[17,37],[13,18],[10,26]].map(([cx,cy])=><ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="3" ry="5" fill="#e8d8a0" transform={`rotate(30 ${cx} ${cy})`}/>)}</>;break;
  case 'Maize':drawing=<><ellipse cx="24" cy="25" rx="10" ry="19" fill="#ecc65e"/><path d="M19 10v27m10-27v27M15 18h18M14 25h20M15 32h18M24 44C11 41 7 32 7 23c11 4 15 12 17 21m0 0c13-3 17-12 17-21-11 4-15 12-17 21" fill="#a5be7e"/></>;break;
  case 'Pomegranate':drawing=<><path d="m19 14-4-9 9 4 9-4-4 9a16 16 0 1 1-10 0" fill="#cb7779"/><path d="M15 24c-4 6-2 10 0 12" stroke="#f2c9b7"/></>;break;
  case 'Cotton':drawing=<><path d="M24 43V28m0 8-11-5m11 5 11-5"/><path d="M14 31C2 28 7 13 17 16c0-14 16-14 16 0 13-2 14 14 3 17-8 8-13 7-22-2" fill="#fffdf3"/><path d="m13 31 11 9 12-7" fill="#9eaf6e"/></>;break;
  case 'Soybean':drawing=<><path d="M10 38C10 20 17 8 36 8c2 18-8 32-26 30" fill="#9cbd70"/>{[[29,17],[23,25],[16,32]].map(([cx,cy])=><circle key={cx} cx={cx} cy={cy} r="4" fill="#e6d99c"/>)}</>;break;
  default:drawing=<><path d="M24 43V14m0 19-12-7m12 2 12-9"/>{[[24,12],[12,23],[35,17]].map(([cx,cy])=><g key={cx}><circle cx={cx} cy={cy} r="7" fill="#e7ca5d"/><circle cx={cx} cy={cy} r="2" fill="#9e793e"/></g>)}</>;
 }
 return <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#526842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{drawing}</svg>;
}
