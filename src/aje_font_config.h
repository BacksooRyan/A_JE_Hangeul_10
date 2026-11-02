#pragma once
// Set this in the library header or as a global compiler flag for all .cpp files.
#ifndef AJE_GLYPH_SIZE
#define AJE_GLYPH_SIZE 14
#endif
#if AJE_GLYPH_SIZE != 14 && AJE_GLYPH_SIZE != 16
#error "AJE_GLYPH_SIZE must be 14 or 16"
#endif
