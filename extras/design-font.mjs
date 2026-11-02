// Aje Hangeul 2.0. Each optical size has its own layout on an integer grid.
// Run "node extras/design-font.mjs" to regenerate the flash tables.
import { writeFileSync } from 'node:fs';

const initials = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const vowels = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const finals = [...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
const pairs = {ㄲ:'ㄱㄱ', ㄸ:'ㄷㄷ', ㅃ:'ㅂㅂ', ㅆ:'ㅅㅅ', ㅉ:'ㅈㅈ',
  ㄳ:'ㄱㅅ', ㄵ:'ㄴㅈ', ㄶ:'ㄴㅎ', ㄺ:'ㄹㄱ', ㄻ:'ㄹㅁ', ㄼ:'ㄹㅂ',
  ㄽ:'ㄹㅅ', ㄾ:'ㄹㅌ', ㄿ:'ㄹㅍ', ㅀ:'ㄹㅎ', ㅄ:'ㅂㅅ'};
let size;
const blank = () => Array(size).fill(0);

function stroke(rows, x, y, endX, endY) {
  // Integer Bresenham. Each master is one bit per dot, without antialiasing.
  const dx = Math.abs(endX-x), dy = -Math.abs(endY-y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    if (x<0 || x>=size || y<0 || y>=size) throw Error('Stroke outside the cell');
    rows[y] |= 1 << (size-1-x);
    if (x === endX && y === endY) return;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}

function consonant(rows, letter, left, top, right, bottom) {
  const width = right-left+1, height = bottom-top+1;
  if (pairs[letter]) {
    const gap = width >= 11 ? 2 : 1;
    const leftWidth = Math.ceil((width-gap)/2);
    consonant(rows, pairs[letter][0], left, top, left+leftWidth-1, bottom);
    consonant(rows, pairs[letter][1], left+leftWidth+gap, top, right, bottom);
    return;
  }
  const line = (x,y,X,Y) => stroke(rows,x,y,X,Y);
  const hor = (y,x=left,X=right) => line(x,y,X,y);
  const ver = (x,y=top,Y=bottom) => line(x,y,x,Y);
  const cx = Math.floor((left+right)/2), cy = Math.floor((top+bottom)/2);
  function ieung(y, inset=0) {
    const x=left+inset, X=right-inset;
    const cut = width >= 7 && bottom-y >= 5 ? 2 : 1;
    hor(y,x+cut,X-cut); hor(bottom,x+cut,X-cut);
    line(x+cut,y,x,y+cut); line(X-cut,y,X,y+cut);
    line(x,bottom-cut,x+cut,bottom); line(X,bottom-cut,X-cut,bottom);
    ver(x,y+cut,bottom-cut); ver(X,y+cut,bottom-cut);
  }
  function siot(y) {
    const join = y + (bottom-y >= 6 ? 2 : 0);
    ver(cx,y,join);
    line(cx,join,left,bottom);
    line(cx,join,right,bottom);
  }
  switch (letter) {
    case 'ㄱ': case 'ㅋ': {
      hor(top); const hook=height>=7 && width>=5 ? 1 : 0;
      ver(right,top,bottom-hook);
      if (hook) line(right,bottom-1,right-1,bottom);
      if (letter==='ㅋ') hor(cy,left+1,right);
      break;
    }
    case 'ㄴ': ver(left,top,bottom-1); hor(bottom,left+1,right); break;
    case 'ㄷ': case 'ㅌ':
      hor(top); ver(left); hor(bottom,left+1,right);
      if (letter==='ㅌ') hor(cy,left,right-1);
      break;
    case 'ㄹ':
      hor(top); ver(right,top,cy); hor(cy); ver(left,cy,bottom); hor(bottom); break;
    case 'ㅁ':
      hor(top); ver(left); ver(right); hor(bottom); break;
    case 'ㅂ':
      ver(left); ver(right); hor(cy); hor(bottom); break;
    case 'ㅅ': siot(top); break;
    case 'ㅇ': ieung(top); break;
    case 'ㅈ': hor(top); siot(top+1); break;
    case 'ㅊ':
      hor(top,cx,Math.min(right,cx+(width>=8?1:0)));
      hor(top+2); siot(top+2); break;
    case 'ㅍ': {
      const inset=width>=5?1:0;
      hor(top); hor(bottom); ver(left+inset); ver(right-inset); break;
    }
    case 'ㅎ':
      hor(top,cx,Math.min(right,cx+(width>=8?1:0)));
      if (height>=7) { hor(top+2); ieung(top+4,1); }
      else { hor(top+1); ieung(bottom-2,width>=7?2:0); }
      break;
    default: throw Error('Unknown consonant '+letter);
  }
}

function initial(letter, form) {
  const rows=blank();
  // Left of a vertical vowel, above a horizontal vowel, or in the mixed upper-left.
  const boxes=size===14 ? [[0,2,7,11],[2,0,10,6],[0,0,7,6],
                            [0,1,7,6],[2,0,10,4],[0,0,7,4]]
                        : [[1,2,8,12],[2,0,12,7],[0,0,8,7],
                           [1,1,8,7],[2,0,12,5],[0,0,8,5]];
  consonant(rows,letter,...boxes[form]);
  return rows;
}

function vowel(letter, form) {
  const rows=blank();
  const noFinal=form===0, nieun=form===2;
  const big=size===16;
  const end=noFinal?size-1:(nieun?size-3:(big?8:7));
  const center=noFinal?(big?7:6):4;
  const h = (y,x,X) => stroke(rows,x,y,X,y);
  const v = (x,y,Y) => stroke(rows,x,y,x,Y);
  function upright(kind) {
    if (kind==='ㅣ') { v(big?13:11,0,end); return; }
    const west='ㅓㅕㅔㅖ'.includes(kind);
    const twin='ㅐㅒㅔㅖ'.includes(kind);
    const stem=(west?(twin?10:12):(twin?9:10))+(big?2:0);
    v(stem,0,end);
    if(twin) v(size-2,0,end);
    const from=west?(big?10:9):stem, to=west?stem:size-2;
    if('ㅑㅒㅕㅖ'.includes(kind)){
      h(center-1,from,to); h(center+1,from,to);
    } else h(center,from,to);
  }
  function horizontal(kind, mixed) {
    const left=mixed?0:1, right=mixed?(big?8:7):size-2;
    const up='ㅗㅛ'.includes(kind), down='ㅜㅠ'.includes(kind);
    const y=(noFinal?(up?11:down?9:10):(down?6:7))+(big?1:0);
    h(y,left,right);
    if (!up && !down) return;
    const stemEnd=(noFinal?(up?8:12):(up?6:(nieun?(mixed||big?8:9):7)))+(big?1:0);
    const stems='ㅛㅠ'.includes(kind)?[left+3,right-3]:[Math.floor((left+right)/2)];
    for (const x of stems) v(x,Math.min(y,stemEnd),Math.max(y,stemEnd));
  }
  const mixed={ㅘ:'ㅗㅏ',ㅙ:'ㅗㅐ',ㅚ:'ㅗㅣ',ㅝ:'ㅜㅓ',ㅞ:'ㅜㅔ',ㅟ:'ㅜㅣ',ㅢ:'ㅡㅣ'};
  if (mixed[letter]) {
    horizontal(mixed[letter][0],true);
    upright(mixed[letter][1]);
  } else if ('ㅗㅛㅜㅠㅡ'.includes(letter)) horizontal(letter,false);
  else upright(letter);
  return rows;
}

function final(letter) {
  const rows=blank();
  const box=size===14 ? (pairs[letter]?[1,9,12,13]:[2,9,10,13])
                      : (pairs[letter]?[1,10,13,15]:[3,10,11,15]);
  consonant(rows,letter,...box);
  return rows;
}

function table(name,tiles,names,variants) {
  return 'static const uint16_t '+name+'[]['+size+'] PROGMEM = {\n'+tiles.map((rows,i)=>
    '  { '+rows.map(n=>'0x'+n.toString(16).padStart(4,'0')).join(', ')+' }, // '+
      names[Math.floor(i/variants)]+' '+(i%variants+1)).join('\n')+'\n};\n';
}
for (size of [14,16]) {
  const leading=initials.flatMap(c=>Array.from({length:6},(_,i)=>initial(c,i)));
  const medial=vowels.flatMap(c=>Array.from({length:3},(_,i)=>vowel(c,i)));
  const trailing=finals.map(final);
  const output='// Generated by extras/design-font.mjs. Bit '+(size-1)+' is the left dot.\n'+
    table('initials',leading,initials,6)+'\n'+table('vowels',medial,vowels,3)+'\n'+table('finals',trailing,finals,1);
  writeFileSync(new URL('../src/aje'+size+'.inc',import.meta.url),output);
}
