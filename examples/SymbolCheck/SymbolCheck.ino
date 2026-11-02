#include <AjeTFT.h>

TFT screen(8, 10, 9);
AjeTFT font(screen);
bool showingChart = false;

void showSymbols() {
  screen.background(0);
  font.Print(4, 4,  "뭐야? 정말!");
  font.Print(4, 25, "~!@#$%^&**()-+|/*-+");
  font.Print(4, 44, "() [] [ ] {} <>");
  font.Print(4, 63, "/:; \" \" ` = \\");
  font.Print(4, 84, "!?.,:; '\"` |/\\");
  font.Print(4, 105, "값=0.5 (100%)");
}

void showChart() {
  screen.background(0);
  char single[2] = {0, 0};
  for (uint8_t c = 32; c <= 126; ++c) {
    const uint8_t i = c - 32;
    single[0] = c;
    font.Print(4 + (i % 16) * KoreanFont::AsciiWidth,
               8 + (i / 16) * (KoreanFont::GlyphSize + 2), single);
  }
}

void setup() {
  screen.begin();
  showSymbols();
}

void loop() {
  delay(5000);
  showingChart = !showingChart;
  if (showingChart) showChart();
  else showSymbols();
}
