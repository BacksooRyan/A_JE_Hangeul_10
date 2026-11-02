#include "korean_font.h"
#include "text_decode.h"
#include <stdlib.h>
#include <string.h>

namespace {
// Cache entries are a printed code point, zero (invalid), or the right half of a syllable.
const uint16_t continuation = 0xffff;

uint16_t readLayoutChar(const char*& cursor, uint8_t columns) {
  const uint16_t code = aje_detail::nextCode(cursor);
  if (code == '\r') {
    if (*cursor == '\n') ++cursor;
    return '\n';
  }
  if (code == '\n') return code;
  if (code < 32 || code == 127) return 0;
  if (aje_detail::isSyllable(code)) return columns >= 2 ? code : '?';
  return code < 127 ? code : '?';
}

uint8_t widthOf(uint16_t code) { return aje_detail::isSyllable(code) ? 2 : 1; }

struct Line {
  const char* end;   // First byte that isn't painted.
  const char* next;  // First byte on the following line, after any line break.
  uint8_t used;
};

Line measureLine(const char* text, uint8_t limit, uint8_t boxColumns) {
  uint8_t used = 0;
  while (*text) {
    const char* before = text;
    const uint16_t code = readLayoutChar(text, boxColumns);
    if (!code) continue;
    if (code == '\n') return {before, text, used};
    const uint8_t width = widthOf(code);
    if (width > limit - used) return {before, before, used};
    used += width;
  }
  return {text, text, used};
}

// An AVR double is a 32-bit float. Sign + 39 integer digits + dot + 6 decimals + NUL.
const uint8_t decimalBufferSize = 48;
void formatDecimal(char (&out)[decimalBufferSize], double value, uint8_t decimals) {
  dtostrf(value, 0, decimals > 6 ? 6 : decimals, out);
}
}

void KoreanFont::TextField::Invalidate() {
  memset(cache_, 0, columns_ * sizeof(*cache_));
}

bool KoreanFont::DrawLine(uint16_t x, uint16_t y, uint8_t columns, Align align,
                          const char*& text, bool lastLine, uint16_t* cache, bool numeric) {
  Line line = measureLine(text, columns, columns);
  uint8_t suffix = 0;
  if (lastLine && *line.next) {
    suffix = numeric || columns < 3 ? columns : 3;
    line = measureLine(text, columns - suffix, columns);
  }

  uint8_t slack = columns - line.used - suffix;
  const uint8_t left = align == Align::Right ? slack : align == Align::Center ? slack / 2 : 0;
  uint8_t column = 0;
  bool changed = false;
  auto paint = [&](uint16_t code) {
    const uint8_t width = widthOf(code);
    if (!cache || cache[column] != code) {
      const uint32_t target = static_cast<uint32_t>(x) + column * AsciiWidth;
      if (target <= UINT16_MAX) {
        uint16_t pixels[GlyphSize];
        if (width == 2) {
          RenderSyllable(code, pixels);
          DrawGlyph(target, y, pixels);
        } else {
          RenderAscii(code, pixels);
          DrawBitmap(target, y, pixels, AsciiWidth);
        }
      }
      if (cache) {
        cache[column] = code;
        if (width == 2) cache[column + 1] = continuation;
      }
      changed = true;
    }
    column += width;
  };

  while (column < left) paint(' ');
  while (text < line.end) {
    const uint16_t code = readLayoutChar(text, columns);
    if (code) paint(code);
  }
  for (uint8_t i = 0; i < suffix; ++i) paint(numeric ? '#' : '.');
  while (column < columns) paint(' ');
  text = line.next;
  return changed;
}

void KoreanFont::PrintBox(uint16_t x, uint16_t y, uint8_t columns, uint8_t lines,
                          const char* text, Align align) {
  if (!text || !columns) return;
  for (uint8_t row = 0; row < lines; ++row) {
    const uint32_t top = static_cast<uint32_t>(y) + row * GlyphSize;
    if (top > UINT16_MAX) break;
    DrawLine(x, top, columns, align, text, row == lines - 1, nullptr);
  }
}

bool KoreanFont::UpdateField(TextField& field, const char* text) {
  if (!text) return false;
  return DrawLine(field.x_, field.y_, field.columns_, field.align_, text, true, field.cache_);
}

bool KoreanFont::UpdateNumber(TextField& field, const char* text) {
  return DrawLine(field.x_, field.y_, field.columns_, field.align_, text, true, field.cache_, true);
}

void KoreanFont::Print(long value) {
  char text[12];
  Print(ltoa(value, text, 10));
}

void KoreanFont::Print(unsigned long value) {
  char text[11];
  Print(ultoa(value, text, 10));
}

void KoreanFont::Print(double value, uint8_t decimals) {
  char text[decimalBufferSize];
  formatDecimal(text, value, decimals);
  Print(text);
}

bool KoreanFont::UpdateField(TextField& field, long value) {
  char text[12];
  return UpdateNumber(field, ltoa(value, text, 10));
}

bool KoreanFont::UpdateField(TextField& field, unsigned long value) {
  char text[11];
  return UpdateNumber(field, ultoa(value, text, 10));
}

bool KoreanFont::UpdateField(TextField& field, double value, uint8_t decimals) {
  char text[decimalBufferSize];
  formatDecimal(text, value, decimals);
  return UpdateNumber(field, text);
}
