#include <AjeTFT.h>

TFT screen(8, 10, 9);  // CS, DC, RESET; Uno hardware SPI D11, D13
AjeTFT font(screen);
KoreanFont::Cell changing(74, 104);
bool showFinal = true;

void setup() {
  screen.begin();
  screen.background(0);
  font.Print(4, 6,  "아안앉 오와완");
  font.Print(4, 27, "안녕, 반가워요!");
  font.Print(4, 48, "따뜻한 가을 햇살");
  font.Print(4, 69, "값 흙 닭 앉 뚫");
  font.Print(4, 104, "한 글자");
  font.UpdateCell(changing, "각");
}

void loop() {
  delay(1000);
  showFinal = !showFinal;
  font.UpdateCell(changing, showFinal ? "각" : "가");
}
