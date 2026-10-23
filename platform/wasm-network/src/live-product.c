/* One WASM runtime, two SERIAL native engines. The API engine and cookie jar
 * must actually close before the anonymous relay opens; no Module replacement. */
#define VOD_API_NO_MAIN
#include "live-api.c"
#define BILISOFA_LIVE_PRODUCT
#define LIVE_CAP 8388608
#define LIVE_RELAY_NO_MAIN
#include "live-relay.c"
LIVE_EXPORT int live_product_start(void) {
  if(vod_live||vod_api||vod_cdn||vod_multi||vod_bad_close||live||easy||multi||bad_close)return 0;
  if(!start())return 0;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(tick,40,0);
#endif
  return 1;
}
#ifndef LIVE_PRODUCT_NO_MAIN
int main(void) {
  if(live||easy||multi||bad_close||!vod_start())return 1;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(vod_tick,40,0);
#else
  while(vod_live){vod_tick();struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
#endif
  return 0;
}
#endif
