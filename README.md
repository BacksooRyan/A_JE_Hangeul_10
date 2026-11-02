# 아재한글 2.1

[Arduino IDE용 라이브러리 ZIP 받기](dist/AjeHangeul-2.1.0.zip?raw=1) · [온도계와 카운터 예제](examples/Dashboard/Dashboard.ino) · [1.0 소스](legacy/1.0)

Arduino Uno에서 현대 한글 **가–힣 11,172자**와 **출력 가능한 ASCII 95자**를 표시하는 픽셀 글꼴입니다. 한글이 14×14일 때 공백·기호·영문·숫자는 7×14, 한글이 16×16일 때는 8×16입니다. ASCII 두 자의 폭은 한글 한 자의 폭과 같습니다. 각 빌드에는 선택한 크기의 도안만 들어갑니다.

## Arduino IDE에서 사용하기

1. Arduino IDE의 라이브러리 관리자에서 Arduino의 **TFT** 라이브러리 1.0.6을 설치합니다.
2. **스케치 → 라이브러리 포함하기 → .ZIP 라이브러리 추가**에서 `AjeHangeul-2.1.0.zip`을 선택합니다. 기존 스케치에서는 `#include <AjeTFT.h>`로 불러옵니다.
3. TFT의 CS는 D8, D/C는 D10, RESET은 D9, 하드웨어 SPI의 MOSI는 D11, SCK는 D13입니다.
4. 기본 크기는 14입니다. **src/aje_font_config.h**의 `AJE_GLYPH_SIZE` 값을 16으로 바꾸고 다시 빌드하면 16×16을 사용합니다. 전체 컴파일에 동일한 매크로를 지정해도 됩니다.
5. **파일 → 예제 → AjeHangeul**에서 `Dashboard`(온도·카운터), `HangulScreen`(한글), `SymbolCheck`(반각 문자표)를 열 수 있습니다.

```cpp
#include <AjeTFT.h>

TFT screen(8, 10, 9);
AjeTFT font(screen);
KoreanFont::Cell value(64, 0);

void setup() {
  screen.begin();
  screen.background(0);
  font.Print(0, 0, "상태");
  font.UpdateCell(value, "각");
}

void loop() {
  font.UpdateCell(value, "가");
}
```

`Print`는 UTF-8 완성 음절과 ASCII를 받고, 연속 호출하면 이전 커서에서 이어 씁니다. 개별 자모(`ㄱ`, `ㅏ`), 분해된 자모열, 옛한글과 이모지는 이 글꼴의 범위 밖입니다. 지원하지 않는 유니코드 문자는 `?`로 표시합니다. `SetSpace`는 한글 한 칸의 가로 이동량, `SetHeight`는 줄바꿈 시 세로 이동량입니다. 기본값은 둘 다 글자 한 칸 크기이며, 한글 사이에 추가 여백을 넣지 않습니다.

`UpdateCell`은 한글 한 자 또는 ASCII 한 자를 갱신합니다. 한글을 기호나 공백으로 바꾸면 기존 한글의 오른쪽 절반까지 지웁니다. 반각끼리 바꾸면 바로 오른쪽 반 칸을 건드리지 않습니다. 같은 값은 건너뜁니다. 외부에서 해당 영역을 지운 뒤에는 `value.Invalidate()`를 호출합니다. 화면 연결 코드를 직접 작성할 때는 `DrawPixels`에서 꺼진 픽셀도 배경색으로 그려야 합니다. 기본 반각 도안을 쓰려면 `DrawChar`는 재정의하지 않아도 됩니다.

## 2.1 숫자와 텍스트 필드

```cpp
KoreanFont::Field<5> temperature(64, 32, KoreanFont::Align::Right);
KoreanFont::Field<3> counter(80, 56, KoreanFont::Align::Right);

// setup() 또는 loop() 안에서 호출합니다.
// font.UpdateField(temperature, 23.5, 1);
// font.UpdateField(counter, 99);
```

필드는 전역 또는 `static`으로 두어 이전 내용을 보관합니다. 폭의 단위는 반각 한 칸이며 한글은 두 칸을 씁니다. 첫 호출은 배경을 포함해 필드 전체를 그리고 이후에는 달라진 글자만 그립니다. `UpdateField`는 내용이 달라졌을 때 `true`를 반환합니다. 빈 문자열은 필드를 지웁니다. 화면을 외부에서 다시 칠했다면 `counter.Invalidate()` 후 다시 출력합니다.

문자열과 정수, 실수를 받을 수 있습니다. 실수는 기본 소수 둘째 자리이며 0~6자리를 지정할 수 있습니다. 숫자가 필드보다 길면 모든 칸에 `#`를 표시합니다. 커서 위치에 바로 쓰려면 `font.Print(23.5, 1)`처럼 호출합니다.

`font.PrintBox(x, y, 18, 2, "안내 문구", KoreanFont::Align::Center)`는 반각 18칸, 두 줄 안에서 글자 단위로 줄을 바꾸고 각 줄을 정렬합니다. 정렬은 `Left`, `Center`, `Right` 중에서 고릅니다. 남은 줄에 담지 못한 글은 마지막 줄에 `...`로 표시합니다. 폭이 1~2칸이면 들어가는 만큼 점을 찍습니다. 한글이 들어갈 수 없는 1칸짜리 영역에서는 해당 음절을 `?`로 표시합니다. 상자는 여백까지 배경색으로 그리며 커서를 이동하지 않습니다. 필드와 상자는 고정 격자를 사용합니다.

## 도안과 검증

초성 19자에 각 6벌, 중성 21자에 각 3벌, 종성 27자에 각 1벌을 둡니다. 모음의 가로·세로 배치와 받침 유무에 맞춰 초성을 고릅니다. 중성에는 받침이 없을 때, ㄴ일 때, 다른 받침일 때의 도안이 있습니다. 2.0의 픽셀 도안은 `extras/design-font.mjs`에 있습니다. 이를 수정하고 Node로 실행하면 두 크기의 플래시 테이블이 생성됩니다.

| Uno의 HangulScreen 예제 | 14×14 | 16×16 |
| --- | ---: | ---: |
| 한글 그림 (한 행은 16비트) | 5,712 B | 6,528 B |
| ASCII 그림 (한 행은 8비트) | 1,330 B | 1,520 B |
| 예제 전체 플래시 | 15,208 B | 16,194 B |
| 예제 정적 SRAM | 232 B | 232 B |
| 한글 한 칸 변경 시 SPI 전송 | 403 B | 523 B |
| 반각 한 칸 변경 시 SPI 전송 | 207 B | 267 B |
| 같은 음절을 같은 칸에 다시 요청 | 0 B | 0 B |

Arduino AVR 코어 1.8.8과 TFT 1.0.6으로 빌드하고 AVR8js에서 두 펌웨어를 실행했습니다. 각 크기에서 11,172개 음절을 예외 없이 출력하여 서로 다른 비트맵인지, 자소 획이 다른 자소와 겹치거나 상하좌우로 맞닿지 않는지 검사했습니다. 예제 화면은 가상 Uno의 TFT 전송 기록에서 복원했습니다.

반각 도안은 `extras/design-ascii.mjs`를 Node로 실행하면 재생성됩니다. 2.0.1에서는 두 크기 모두 기호 예문의 모든 픽셀과 ASCII 95자의 표시 영역을 TFT 전송 결과와 대조했습니다. 공백만 비어 있고 나머지 94자가 각각 다른지, `가[]나`·`가  나`·`가?!나`의 마지막 글자 위치가 같은지도 확인했습니다.

[아재한글 1.0 원본](https://github.com/BacksooRyan/A_JE_Hangeul_10) · [참고한 6/3/1 조합 방식](https://www.unifoundry.com/hangul/hangul-generation.html)
