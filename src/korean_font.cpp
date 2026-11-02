#include "korean_font.h"
#include "text_decode.h"
#include <avr/pgmspace.h>

using aje_detail::isSyllable;
using aje_detail::nextCode;

namespace {
#if AJE_GLYPH_SIZE == 14
#include "aje14.inc"
#include "ascii14.inc"
#else
#include "aje16.inc"
#include "ascii16.inc"
#endif

// Initial variants: vertical, horizontal, mixed; then the three with a final.
const uint8_t layouts[21] PROGMEM = {
  0,0,0,0,0,0,0,0, 1,2,2,2,1,1,2,2,2,1,1,2,0
};

}

bool KoreanFont::RenderSyllable(uint16_t code, uint16_t (&rows)[GlyphSize]) {
  if (!isSyllable(code)) return false;
  const uint16_t n = code - 0xAC00;
  const uint8_t tail = n % 28;
  const uint16_t pair = n / 28;
  const uint8_t vowel = pair % 21, initial = pair / 21;
  const uint8_t layout = pgm_read_byte(layouts + vowel) + (tail ? 3 : 0);
  const uint8_t form = tail == 0 ? 0 : tail == 4 ? 2 : 1;
  const uint16_t* l = initials[initial * 6 + layout];
  const uint16_t* v = vowels[vowel * 3 + form];
  for (uint8_t y = 0; y < GlyphSize; ++y) {
    rows[y] = pgm_read_word(l + y) | pgm_read_word(v + y);
    if (tail) rows[y] |= pgm_read_word(&finals[tail - 1][y]);
  }
  return true;
}

void KoreanFont::DrawGlyph(uint16_t x, uint16_t y, const uint16_t* rows) {
  DrawBitmap(x, y, rows, GlyphSize);
}

bool KoreanFont::RenderAscii(uint8_t code, uint16_t (&rows)[GlyphSize]) {
  if (code < 32 || code > 126) return false;
  const uint8_t* glyph = asciiRows[code - 32];
  for (uint8_t i = 0; i < GlyphSize; ++i)
    rows[i] = uint16_t(pgm_read_byte(glyph + i)) << (GlyphSize - 8);
  return true;
}

void KoreanFont::DrawChar(uint16_t x, uint16_t y, uint8_t code) {
  uint16_t rows[GlyphSize];
  if (RenderAscii(code, rows)) DrawBitmap(x, y, rows, AsciiWidth);
}

void KoreanFont::DrawBitmap(uint16_t x, uint16_t y, const uint16_t* rows, uint8_t width) {
  for (uint8_t row = 0; row < GlyphSize; ++row)
    for (uint8_t col = 0; col < width; ++col)
      DrawPixels(x + col, y + row, (rows[row] & (1u << (GlyphSize-1-col))) != 0);
}

void KoreanFont::ParseKor(uint16_t x, uint16_t y, uint16_t code) {
  uint16_t rows[GlyphSize];
  if (RenderSyllable(code, rows)) DrawGlyph(x, y, rows);
}

void KoreanFont::Print(const char* text) {
  if (!text) return;
  while (*text) {
    const uint16_t code = nextCode(text);
    if (code == '\n') { _xpos = 0; _ypos += _fontHeigh; }
    else if (code == '\r') { _xpos = 0; }
    else if (isSyllable(code)) {
      ParseKor(_xpos, _ypos, code);
      _xpos += _fontSpace;
    } else if (code >= 32 && code != 127) {
      ParseEng(_xpos, _ypos, code < 128 ? code : '?');
      _xpos += AsciiWidth;
    }
  }
}

void KoreanFont::Print(uint16_t x, uint16_t y, const char* text) {
  SetCursor(x, y);
  Print(text);
}

bool KoreanFont::UpdateCell(Cell& cell, const char* text) {
  if (!text || !*text) return false;
  const uint16_t code = nextCode(text);
  if (*text || code == cell.previous_) return false;
  uint16_t rows[GlyphSize] = {};
  if (!RenderSyllable(code, rows) && (code > 126 || !RenderAscii(code, rows))) return false;
  if (isSyllable(code) || isSyllable(cell.previous_)) DrawGlyph(cell.x_, cell.y_, rows);
  else DrawBitmap(cell.x_, cell.y_, rows, AsciiWidth);
  cell.previous_ = code;
  return true;
}
