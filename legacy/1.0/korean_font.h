#pragma once

#include "string.h"
#include <avr/pgmspace.h> // AVR 계열시, 우노, 나노, 메가 등
// #include <pgmspace.h> // 기타 잡 보드

class KoreanFont
{
protected:
	int _xpos;
	int _ypos;
	int _fontHeigh = 16;
	int _fontSpace = 14;
protected:
	void ParseKor(uint16_t x, uint16_t y, uint16_t charNo);
	void ParseEng(uint16_t x, uint16_t y, uint8_t charNo)
	{
		DrawChar(x, y, charNo);
	}
	virtual void DrawPixels(uint16_t x, uint16_t y, bool value) = 0;
	virtual void DrawChar(uint16_t x, uint16_t y, uint8_t value) = 0;
	//virtual void DrawKorBit(uint16_t x, uint16_t y, uint16_t* bitImg) = 0;
public:
	void SetCursor(uint16_t xpos, uint16_t ypos)
	{
		_xpos = xpos;
		_ypos = ypos;
	}
	void SetHeight(int height)
	{
		if (height < 8) height = 8;
		_fontHeigh = height;
	}
	void SetSpace(int space)
	{
		_fontSpace = space;
	}
	void Print(const char* message);
	void Print(uint16_t x, uint16_t y, const char* message);
};