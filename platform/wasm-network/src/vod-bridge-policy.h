/* Original production DASH policy. Included after the shared bridge structs.
 * Metadata and the two sources are Worker-owned, never HTTP/parent arguments. */
#ifndef BILISOFA_VOD_BRIDGE_POLICY_H
#define BILISOFA_VOD_BRIDGE_POLICY_H
/* ADR-115: media up to seven days (packages/contracts/src/media-limits.ts); below the 32-bit unsigned limit. */
#define VOD_MAX_MEDIA_MS 604800000U
static unsigned long long vod_totals[2];
static char vod_metadata[384];
static int vod_codec(const char *codec, int audio) {
  size_t n = codec ? strlen(codec) : 0;
  if (audio) return !strcmp(codec, "mp4a.40.2") || !strcmp(codec, "ec-3") || !strcmp(codec, "fLaC");
  if (n == 11 && !strncmp(codec, "avc1.", 5) && strspn(codec + 5, "0123456789abcdefABCDEF") == 6) return 1;
  if (n < 6 || n > 64 || strspn(codec, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.") != n) return 0;
  return !strncmp(codec, "hev1.", 5) || !strncmp(codec, "hvc1.", 5) || !strncmp(codec, "av01.", 5);
}
static int vod_manifest(const char *metadata) {
  unsigned ms, w, h, vb, ab, vi, vx, ai, ax;
  unsigned long long vt, at;
  char vc[65], ac[16], canonical[384];
  int end = 0;
  if (!metadata || strlen(metadata) >= sizeof(canonical) ||
      sscanf(metadata, "%u,%u,%u,%u,%u,%u,%u,%u,%u,%13llu,%13llu,%64[A-Za-z0-9.],%15[A-Za-z0-9.-]%n",
             &ms, &w, &h, &vb, &ab, &vi, &vx, &ai, &ax, &vt, &at, vc, ac, &end) != 13 || metadata[end]) return 0;
  if (!ms || ms > VOD_MAX_MEDIA_MS || !w || w > 16384 || !h || h > 8640 || !vb || vb > 200000000 || !ab || ab > 16000000 ||
      vi < 8 || vx <= vi || vx > 16777216 || ai < 8 || ax <= ai || ax > 16777216 || vt <= vx || at <= ax ||
      vt > 1099511627776ULL || at > 1099511627776ULL || !vod_codec(vc, 0) || !vod_codec(ac, 1)) return 0;
  int size = snprintf(canonical, sizeof(canonical), "%u,%u,%u,%u,%u,%u,%u,%u,%u,%llu,%llu,%s,%s", ms, w, h, vb, ab, vi, vx, ai, ax, vt, at, vc, ac);
  if (size < 1 || (size_t)size >= sizeof(canonical) || strcmp(canonical, metadata)) return 0;
  size = snprintf(bridge_mpd, sizeof(bridge_mpd),
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?><MPD xmlns=\"urn:mpeg:dash:schema:mpd:2011\" type=\"static\" profiles=\"urn:mpeg:dash:profile:isoff-on-demand:2011\" mediaPresentationDuration=\"PT%u.%03uS\" minBufferTime=\"PT1.5S\"><Period start=\"PT0S\">"
    "<AdaptationSet contentType=\"video\" mimeType=\"video/mp4\"><Representation id=\"v1\" bandwidth=\"%u\" codecs=\"%s\" width=\"%u\" height=\"%u\"><BaseURL>http://127.0.0.1:%d/%s/video.mp4</BaseURL><SegmentBase indexRange=\"%u-%u\"><Initialization range=\"0-%u\"/></SegmentBase></Representation></AdaptationSet>"
    "<AdaptationSet contentType=\"audio\" mimeType=\"audio/mp4\"><Representation id=\"a1\" bandwidth=\"%u\" codecs=\"%s\"><BaseURL>http://127.0.0.1:%d/%s/audio.mp4</BaseURL><SegmentBase indexRange=\"%u-%u\"><Initialization range=\"0-%u\"/></SegmentBase></Representation></AdaptationSet></Period></MPD>",
    ms / 1000, ms % 1000, vb, vc, w, h, BILISOFA_BRIDGE_PORT, bridge_token, vi + 1, vx, vi, ab, ac, BILISOFA_BRIDGE_PORT, bridge_token, ai + 1, ax, ai);
  if (size < 1 || (size_t)size >= sizeof(bridge_mpd)) return 0;
  vod_totals[0] = vt; vod_totals[1] = at; bridge_duration_ms = ms;
  memcpy(vod_metadata, canonical, (size_t)strlen(canonical) + 1);
  return 1;
}
static double vod_lease(unsigned int ms, double remaining_video, double remaining_audio) {
  (void)ms;
  if (!(remaining_video > 0) || !(remaining_audio > 0)) return 0;
  return remaining_video < remaining_audio ? remaining_video : remaining_audio;
}
static int vod_range(const char *value, unsigned long long *start, unsigned long long *end, int track) {
  if (track < 0 || track > 1 || strncasecmp(value, "bytes=", 6)) return 0;
  const char *p = value + 6;
  unsigned long long total = vod_totals[track], a, b;
  if (*p == '-') {
    p++; size_t n = strspn(p, "0123456789");
    if (!n || n > 13 || strcmp(p + n, "\r\n")) return 0;
    a = strtoull(p, NULL, 10);
    if (!a || a > 1099511627776ULL) return 0;
    *start = a >= total ? 0 : total - a; *end = total - 1; return 1;
  }
  size_t n = strspn(p, "0123456789");
  if (!n || n > 13 || p[n] != '-') return 0;
  a = strtoull(p, NULL, 10);
  if (a >= total) return 0;
  p += n + 1;
  if (!strcmp(p, "\r\n")) b = total - 1;
  else {
    n = strspn(p, "0123456789");
    if (!n || n > 13 || strcmp(p + n, "\r\n")) return 0;
    b = strtoull(p, NULL, 10);
    if (b < a || b > 1099511627776ULL) return 0;
    if (b >= total) b = total - 1;
  }
  *start = a; *end = b; return 1;
}
static int vod_request_media(struct bridge_client *c, int ranged) {
  if (c->kind < 1 || c->kind > 2) return 0;
  const char *mime = c->kind == 1 ? "video/mp4" : "audio/mp4";
  if (c->head) {
    int size = snprintf(c->header, sizeof(c->header), "HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %llu\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n", mime, vod_totals[c->kind - 1]);
    if (size < 1 || (size_t)size >= sizeof(c->header)) return 0;
    c->header_size = (size_t)size; c->header_done = c->done = 1; c->status = 200; return 1;
  }
  if (!ranged) return 0;
  c->streaming = 1; c->response_start = c->start; c->response_end = c->end; c->response_length = c->end - c->start + 1;
  return 1;
}
/* Refresh only a still-owned, unchanged representation. Never revives a closed
 * listener or changes codec/index/byte identity underneath an active decoder. */
static int vod_renew(const char *video, const char *audio, const char *metadata) {
  if (bridge_fd < 0 || bridge_unconfirmed || bridge_progressive || !metadata || strcmp(metadata, vod_metadata) ||
      !guest_cdn_valid(video) || !guest_cdn_valid(audio)) return 0;
  double now = http_now();
  if (now < 0 || now >= bridge_deadline) return 0;
  const char *urls[2] = { video, audio };
  double until = 86400;
  for (int i = 0; i < 2; i++) {
    const char *deadline = strstr(urls[i], "?deadline=");
    if (!deadline) deadline = strstr(urls[i], "&deadline=");
    double remaining = (double)strtoull(deadline + 10, NULL, 10) - (double)time(NULL) - 5;
    if (remaining < until) until = remaining;
  }
  if (until <= bridge_deadline - now) return 0;
  strcpy(bridge_urls[0], video); strcpy(bridge_urls[1], audio); bridge_deadline = now + until;
  puts("VOD:renewed"); fflush(stdout); return 1;
}
#endif
