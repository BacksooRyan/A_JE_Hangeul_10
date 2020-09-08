/*
 Name:		Korean_Font.ino
 Created:	2020-09-08 오후 9:27:55
 Author:	Ryanahje
*/
#include <TFT.h>
#include <avr/pgmspace.h>
#include "korean_font.h"

const int PIN_DC = 10;
const int PIN_RST = 9;
const int PIN_CS = 8;

TFT display = TFT(PIN_CS, PIN_DC, PIN_RST);

class KorSys : public KoreanFont
{
	virtual void DrawPixels(uint16_t x, uint16_t y, bool value)
	{
		if (value) display.drawPixel(x, y, 0xffff);
	}
	virtual void DrawChar(uint16_t x, uint16_t y, uint8_t value)
	{
		display.setCursor(x, y);
		display.write(value);
	}
};

KorSys korSys = KorSys();

int xpos = 6;
int ypos = 10;
void PrintHello();

// the setup function runs once when you press reset or power the board
void setup() 
{
	display.begin();
	display.background(0x0000);
	PrintHello();
	delay(3000);
}

// the loop function runs over and over again until power down or reset
void loop() 
{
	display.background(0);
	xpos += 2;
	ypos += 3;
	if (xpos >= 30)
	{
		xpos = 6;
		ypos = 10;
	}
	PrintHello();
	delay(1000);
}

void PrintHello()
{
	korSys.Print(xpos, ypos, "안녕 월드!");
	korSys.Print("\n완연한 가을!");
	korSys.Print("\n날씨가 많이\n쌀살해졌어요!");
}