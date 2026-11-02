// Original 1-bit ASCII strokes for the 14- and 16-pixel Hangul baselines.
// A vertex is x followed by a hexadecimal y. Spaces join vertices; / lifts the pen.
// Draw at the destination grid so slants keep a single-pixel stroke at either size.
import {writeFileSync} from 'node:fs';

const glyphs = {
  ' ': '',
  '!': '31 37',
  '"': '11 14 / 51 54',
  '#': '31 1b / 61 4b / 05 65 / 08 68',
  '$': '62 52 22 03 05 16 56 67 69 5a 1a 09 / 30 3c',
  '%': '11 21 32 33 24 14 03 02 11 / 61 0b / 48 58 69 6a 5b 4b 3a 39 48',
  '&': '6b 14 13 22 32 43 44 17 08 0a 1b 3b 4a 67',
  "'": '31 33 24',
  '(': '51 33 25 28 3a 5c',
  ')': '11 33 45 48 3a 1c',
  '*': '32 36 / 04 36 64 / 18 36 58',
  '+': '34 3a / 07 67',
  ',': '3a 4a 4b 1d',
  '-': '17 57',
  '.': '3a 4a 4b 3b 3a',
  '/': '61 0c',
  '0': '21 41 62 6a 4b 2b 0a 02 21 / 18 54',
  '1': '14 31 3b / 1b 5b',
  '2': '03 12 21 41 52 63 65 0a 0b 6b',
  '3': '02 21 41 62 64 46 26 / 46 67 69 4b 2b 0a',
  '4': '51 07 08 68 / 51 5b',
  '5': '61 11 16 46 67 69 4b 2b 0a',
  '6': '51 31 12 04 09 2b 4b 6a 67 56 26 07',
  '7': '01 61 35 1b',
  '8': '21 41 62 64 46 26 04 02 21 / 26 07 09 2b 4b 69 67 46',
  '9': '69 67 63 41 21 03 05 27 47 66 / 69 4b 1b',
  ':': '34 44 45 35 34 / 3a 4a 4b 3b 3a',
  ';': '34 44 45 35 34 / 3a 4a 4b 1d',
  '<': '54 17 5a',
  '=': '05 65 / 09 69',
  '>': '14 57 1a',
  '?': '03 12 21 41 52 63 64 36 37',
  '@': '', // Drawn on each grid below to preserve both counters.
  'A': '0b 04 21 41 64 6b / 07 67',
  'B': '01 0b 4b 69 68 46 06 / 01 41 62 64 46',
  'C': '62 51 21 03 09 2b 5b 6a',
  'D': '01 0b 3b 5a 69 63 52 31 01',
  'E': '61 01 0b 6b / 06 56',
  'F': '61 01 0b / 06 56',
  'G': '62 51 21 03 09 2b 5b 6a 67 37',
  'H': '01 0b / 61 6b / 06 66',
  'I': '11 51 / 31 3b / 1b 5b',
  'J': '21 61 / 51 59 3b 2b 0a 09',
  'K': '01 0b / 61 07 / 35 6b',
  'L': '01 0b 6b',
  'M': '0b 01 36 61 6b',
  'N': '0b 01 6b 61',
  'O': '21 41 63 69 4b 2b 09 03 21',
  'P': '0b 01 41 62 65 47 07',
  'Q': '21 41 63 69 4b 2b 09 03 21 / 38 6c',
  'R': '0b 01 41 62 64 46 06 / 36 6b',
  'S': '62 51 21 03 05 16 56 67 69 4b 2b 0a',
  'T': '01 61 / 31 3b',
  'U': '01 09 2b 4b 69 61',
  'V': '01 06 3b 66 61',
  'W': '01 1b 36 5b 61',
  'X': '01 6b / 61 0b',
  'Y': '01 36 61 / 36 3b',
  'Z': '01 61 0b 6b',
  '[': '51 21 2c 5c',
  '\\': '01 6c',
  ']': '11 41 4c 1c',
  '^': '05 31 65',
  '_': '0d 6d',
  '\x60': '21 43',
  'a': '15 24 44 65 6b / 67 27 08 0a 1b 4b 6a',
  'b': '01 0b / 06 24 44 65 69 4b 2b 0a',
  'c': '65 54 24 06 09 2b 5b 6a',
  'd': '61 6b / 65 44 24 06 09 2b 4b 6a',
  'e': '08 68 66 44 24 06 09 2b 5b 6a',
  'f': '5b 2b / 3b 33 51 61 / 15 55',
  'g': '64 6b 4d 1d / 65 44 24 06 08 2a 4a 69',
  'h': '01 0b / 06 24 44 65 6b',
  'i': '31 32 / 15 35 3b / 1b 5b',
  'j': '41 42 / 25 45 4b 2d 1d 0c',
  'k': '01 0b / 64 08 / 37 6b',
  'l': '11 31 39 4b 5b',
  'm': '0b 04 / 05 14 24 35 3b / 35 44 54 65 6b',
  'n': '0b 04 / 06 24 44 65 6b',
  'o': '24 44 66 69 4b 2b 09 06 24',
  'p': '0d 04 / 05 24 44 66 68 4a 2a 09',
  'q': '6d 64 / 65 44 24 06 08 2a 4a 69',
  'r': '0b 04 / 07 25 44 54 65',
  's': '65 54 24 05 06 17 58 69 6a 5b 1b 0a',
  't': '31 39 4b 5b 6a / 05 55',
  'u': '04 09 2b 4b 69 / 64 6b',
  'v': '04 07 3b 67 64',
  'w': '04 1b 37 5b 64',
  'x': '04 6b / 64 0b',
  'y': '04 3a / 64 3a 1d 0d',
  'z': '04 64 0b 6b',
  '{': '51 41 32 35 26 17 28 39 3b 4c 5c',
  '|': '30 3d',
  '}': '11 21 32 35 46 57 48 39 3b 2c 1c',
  '~': '08 16 25 36 47 57 65',
};

function mask(c,size) {
  const rows=Array(size).fill(0), width=size/2;
  const mirror={')':'(',']':'[','}':'{','>':'<','\\':'/'};
  if(mirror[c]){
    return mask(mirror[c],size).map(r=>{
      let reverse=0;
      for(let x=0;x<width-1;x++) if(r&(1<<(width-1-x)))reverse|=1<<(1+x);
      return reverse;
    });
  }
  if(c==='@'){
    const art=size===14 ? [
      '......','..###.','.#...#','#....#','#..###','#.#..#','#.#..#',
      '#.#..#','#.#.##','#..#.#','#.....','.#....','..###.','......',
    ] : [
      '.......','..###..','.#...#.','#.....#','#.....#','#..##.#','#.#.#.#','#.#.#.#',
      '#.#.#.#','#.#.#.#','#..#.##','#......','#......','.#.....','..####.','.......',
    ];
    return art.map(s=>parseInt(s.replaceAll('.','0').replaceAll('#','1')+'0',2));
  }
  if(size===14 && c==='%'){
    const art=['......','.#...#','#.#..#','#.#.#.','.#..#.','...#..','...#..',
      '..#...','..#.#.','.#.#.#','.#.#.#','#...#.','......','......'];
    return art.map(s=>parseInt(s.replaceAll('.','0').replaceAll('#','1')+'0',2));
  }
  if(c==='*'){
    const star=size===14?['#...#.','.#.#..','..#...','#####.','..#...','.#.#..','#...#.']
      :['.#...#.','..#.#..','...#...','#######','...#...','..#.#..','.#...#.'];
    star.forEach((s,i)=>rows[i+(size===14?2:3)]=parseInt(s.replaceAll('.','0').replaceAll('#','1')+'0',2));
    return rows;
  }
  const xs=size===14?[0,1,2,2,3,4,5]:[0,1,2,3,4,5,6];
  const ys=size===14?[0,1,2,3,4,5,6,7,8,9,10,11,12,13]:[0,1,2,3,5,6,7,8,9,10,12,13,14,15];
  function vertex(v) {return [xs[Number(v[0])],ys[parseInt(v[1],16)]]}
  function line([x,y],[ex,ey]) {
    const dx=Math.abs(ex-x),dy=-Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1;
    let err=dx+dy;
    for(;;){
      rows[y]|=1<<(width-1-x);
      if(x===ex && y===ey)break;
      const e=err*2;
      if(e>=dy){err+=dy;x+=sx}
      if(e<=dx){err+=dx;y+=sy}
    }
  }
  if(glyphs[c])for(const path of glyphs[c].split(' / ')) {
    const p=path.split(' ').map(vertex);for(let i=1;i<p.length;i++)line(p[i-1],p[i]);
  }
  if(c==='?' || c==='!'){
    const x=xs[3],y=ys[11],dot=(3<<(width-2-x));
    rows[y-1]|=dot;rows[y]|=dot;
  }
  return rows;
}
for(const size of [14,16]){
  const seen=new Set();
  const body=Array.from({length:95},(_,i)=>{
    const c=String.fromCharCode(32+i);
    if(!Object.hasOwn(glyphs,c))throw Error('Missing ASCII '+c);
    const rows=mask(c,size), width=size/2;
    if(rows.some(r=>r&1))throw Error('Missing right bearing');
    if(seen.has(rows.join(',')))throw Error('Duplicate glyph '+c);
    seen.add(rows.join(','));
    return '  {'+rows.map(r=>'0x'+(r<<(8-width)).toString(16).padStart(2,'0')).join(',')+'}, // U+'+(32+i).toString(16).toUpperCase().padStart(4,'0');
  });
  writeFileSync(new URL('../src/ascii'+size+'.inc',import.meta.url),'// Generated by extras/design-ascii.mjs. Bit 7 is leftmost.\nstatic const uint8_t asciiRows[95]['+size+'] PROGMEM = {\n'+body.join('\n')+'\n};\n');
}
