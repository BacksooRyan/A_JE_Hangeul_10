#pragma once
#include <stdint.h>

namespace aje_detail {
inline bool isSyllable(uint16_t code) { return code >= 0xAC00 && code <= 0xD7A3; }

// Consume a UTF-8 scalar. Non-BMP and malformed input use one fallback glyph.
inline uint16_t nextCode(const char*& text) {
  const uint8_t lead = static_cast<uint8_t>(*text++);
  if (lead < 0x80) return lead;
  if (lead < 0xC2 || lead > 0xF4) return '?';
  const uint8_t count = lead < 0xE0 ? 1 : lead < 0xF0 ? 2 : 3;
  uint16_t code = lead & (0x3F >> count);
  for (uint8_t i = 0; i < count; ++i) {
    const uint8_t b = static_cast<uint8_t>(*text);
    if ((b & 0xC0) != 0x80) return '?';
    if (i == 0 && ((lead == 0xE0 && b < 0xA0) || (lead == 0xED && b >= 0xA0) ||
                   (lead == 0xF0 && b < 0x90) || (lead == 0xF4 && b >= 0x90))) return '?';
    ++text;
    code = (code << 6) | (b & 0x3F);
  }
  return count == 3 ? '?' : code;
}
}
