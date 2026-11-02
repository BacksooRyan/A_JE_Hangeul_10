#pragma once
#include <TFT.h>
#include "korean_font.h"

// Arduino TFT, RGB565. The controller holds the screen memory.
class AjeTFT : public KoreanFont {
public:
  explicit AjeTFT(TFT& screen, uint16_t ink=0xffff, uint16_t paper=0)
    : screen_(screen), ink_(ink), paper_(paper) {}

protected:
  void DrawPixels(uint16_t x, uint16_t y, bool on) override {
    screen_.drawPixel(x, y, on ? ink_ : paper_);
  }
  void DrawBitmap(uint16_t x, uint16_t y, const uint16_t* rows, uint8_t width) override {
    const uint16_t w=screen_.width(), h=screen_.height();
    if (x>=w || y>=h) return;
    const uint8_t cols = w-x < width ? w-x : width;
    const uint8_t lines = h-y < GlyphSize ? h-y : GlyphSize;
    screen_.setAddrWindow(x, y, x+cols-1, y+lines-1);
    for (uint8_t row=0; row<lines; ++row)
      for (uint8_t col=0; col<cols; ++col)
        screen_.pushColor((rows[row] & (1u << (GlyphSize-1-col))) ? ink_ : paper_);
  }

private:
  TFT& screen_;
  uint16_t ink_, paper_;
};
