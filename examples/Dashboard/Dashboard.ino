#include <AjeTFT.h>

TFT screen(8, 10, 9);
AjeTFT font(screen);
using Align = KoreanFont::Align;
KoreanFont::Field<5> temperature(64, 32, Align::Right);
KoreanFont::Field<3> counter(80, 56, Align::Right);

uint8_t step = 0;
unsigned long lastChange = 0;

void setup() {
  screen.begin();
  screen.background(0);
  font.PrintBox(0, 5, 160 / KoreanFont::AsciiWidth, 1, "상태판", Align::Center);
  font.Print(8, 32, "온도");
  font.Print(112, 32, "C");
  font.Print(8, 56, "횟수");
  font.Print(112, 56, "회");
  font.PrintBox(8, 84, 18, 2, "센서 값을 한 자리씩 갱신합니다.");
  font.UpdateField(temperature, 23.4, 1);
  font.UpdateField(counter, 100);
}

void loop() {
  if (millis() - lastChange < 1200) return;
  lastChange = millis();
  step = (step + 1) % 4;
  const int counts[] = {100, 100, 99, 9};
  font.UpdateField(temperature, step == 0 ? 23.4 : 23.5, 1);
  font.UpdateField(counter, counts[step]);
}
