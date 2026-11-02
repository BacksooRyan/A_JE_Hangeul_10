#pragma once
#include <stdint.h>
#include "aje_font_config.h"

// Modern Hangul. Coordinates and the legacy Print callbacks match 1.0.
class KoreanFont {
public:
  enum : uint8_t { GlyphSize = AJE_GLYPH_SIZE, AsciiWidth = GlyphSize / 2 };
  void SetCursor(uint16_t x, uint16_t y) { _xpos = x; _ypos = y; }
  void SetHeight(int height) { _fontHeigh = height < 8 ? 8 : height; }
  void SetSpace(int advance) { _fontSpace = advance; }
  void Print(const char* message);
  void Print(uint16_t x, uint16_t y, const char* message);
  void Print(long value);
  void Print(unsigned long value);
  void Print(int value) { Print(static_cast<long>(value)); }
  void Print(unsigned int value) { Print(static_cast<unsigned long>(value)); }
  void Print(double value, uint8_t decimals = 2);

  enum class Align : uint8_t { Left, Center, Right };
  class TextField {
  public:
    void Invalidate();
    TextField(const TextField&) = delete;
    TextField& operator=(const TextField&) = delete;
  protected:
    TextField(uint16_t x, uint16_t y, uint8_t columns, Align align, uint16_t* cache)
      : x_(x), y_(y), columns_(columns), align_(align), cache_(cache) {}
  private:
    friend class KoreanFont;
    uint16_t x_, y_;
    uint8_t columns_;
    Align align_;
    uint16_t* cache_;
  };

  // One column is an ASCII half-cell. Keep the field between updates.
  template<uint8_t Columns>
  class Field : public TextField {
    static_assert(Columns > 0, "A field needs at least one half-cell");
  public:
    Field(uint16_t x, uint16_t y, Align align = Align::Left)
      : TextField(x, y, Columns, align, previous_) {}
  private:
    uint16_t previous_[Columns] = {};
  };

  bool UpdateField(TextField& field, const char* text);
  bool UpdateField(TextField& field, long value);
  bool UpdateField(TextField& field, unsigned long value);
  bool UpdateField(TextField& field, int value) { return UpdateField(field, static_cast<long>(value)); }
  bool UpdateField(TextField& field, unsigned int value) { return UpdateField(field, static_cast<unsigned long>(value)); }
  bool UpdateField(TextField& field, double value, uint8_t decimals = 2);
  // Opaque fixed area in half-cell columns and whole text rows.
  void PrintBox(uint16_t x, uint16_t y, uint8_t columns, uint8_t lines,
                const char* text, Align align = Align::Left);
  static bool RenderSyllable(uint16_t code, uint16_t (&rows)[GlyphSize]);
  // Printable ASCII, left-aligned in the same bit positions as RenderSyllable.
  static bool RenderAscii(uint8_t code, uint16_t (&rows)[GlyphSize]);

  // A single fixed text cell. Invalidate after erasing or painting over it.
  class Cell {
  public:
    Cell(uint16_t x, uint16_t y) : x_(x), y_(y) {}
    void Invalidate() { previous_ = 0; }
  private:
    friend class KoreanFont;
    uint16_t x_, y_, previous_ = 0;
  };
  // Accepts one precomposed syllable or printable ASCII. Space erases the cell.
  bool UpdateCell(Cell& cell, const char* text);

protected:
  uint16_t _xpos = 0, _ypos = 0;
  int _fontHeigh = GlyphSize, _fontSpace = GlyphSize;
  void ParseKor(uint16_t x, uint16_t y, uint16_t code);
  void ParseEng(uint16_t x, uint16_t y, uint8_t code) { DrawChar(x, y, code); }
  virtual void DrawPixels(uint16_t x, uint16_t y, bool value) = 0;
  virtual void DrawChar(uint16_t x, uint16_t y, uint8_t code);
  // For opaque fields the backend must write both foreground and background.
  virtual void DrawGlyph(uint16_t x, uint16_t y, const uint16_t* rows);
  virtual void DrawBitmap(uint16_t x, uint16_t y, const uint16_t* rows, uint8_t width);

private:
  bool DrawLine(uint16_t x, uint16_t y, uint8_t columns, Align align, const char*& text,
                bool lastLine, uint16_t* cache, bool numeric = false);
  bool UpdateNumber(TextField& field, const char* formatted);
};
