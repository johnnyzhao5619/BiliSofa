/* ADR-101 per-track CDN failover, included after the generated failover bridge.
 * Each track may carry one Bilibili backup on another host. An upstream range that
 * gets no response headers within 6 s, times out, or ends with anything but a
 * validated 206 moves that track to its backup once and continues the same range
 * (already forwarded bytes are never replayed; totals must still match). The move is
 * sticky for this bridge; afterwards the original bounded retry/error paths apply. */
#ifndef BILISOFA_VOD_BRIDGE_FAILOVER_H
#define BILISOFA_VOD_BRIDGE_FAILOVER_H
static const char *vod_transfer_url(struct bridge_client *c) {
  int i = (int)(c - bridge_clients), t = c->kind - 1;
  int alternate = t >= 0 && t < 2 && vod_on_alternate[t] && vod_alternates[t][0];
  if (i >= 0 && i < BRIDGE_CLIENTS) vod_client_alternate[i] = alternate;
  return alternate ? vod_alternates[t] : bridge_urls[t < 0 ? 0 : t];
}
static int vod_failover(struct bridge_client *c, double now) {
  int i = (int)(c - bridge_clients);
  if (i < 0 || i >= BRIDGE_CLIENTS || c->kind < 1 || c->kind > 2 || !c->streaming || c->head || bridge_unconfirmed || now < 0 || now + .25 >= bridge_deadline) return 0;
  int t = c->kind - 1;
  if (!vod_alternates[t][0] || vod_client_alternate[i]) return 0;
  int resumable = c->status == 206 && c->upstream_ready && c->valid_range && c->received < c->length;
  if (c->received && !resumable) return 0;
  if (c->easy) {
    if (curl_multi_remove_handle(bridge_multi, c->easy) != CURLM_OK) { bridge_unconfirmed = 1; return 0; }
    curl_easy_cleanup(c->easy); c->easy = NULL;
  }
  if (resumable) { c->start += c->received; c->resume_window = 1; }
  c->paused = c->next_window = 0; c->retry_at = now + .05;
  if (!vod_on_alternate[t]) { vod_on_alternate[t] = 1; printf("BRIDGE:failover:%d\n", c->kind); fflush(stdout); }
  return 1;
}
static double vod_url_remaining(const char *url) {
  const char *deadline = strstr(url, "?deadline="); if (!deadline) deadline = strstr(url, "&deadline=");
  return deadline ? (double)strtoull(deadline + 10, NULL, 10) - (double)time(NULL) - 5 : 0;
}
static int vod_alternates_valid(const char *video, const char *audio, int bits, int renewal) {
  const char *alternates[2] = { video, audio };
  for (int t = 0; t < 2; t++) {
    const char *a = alternates[t];
    if (!a || (strcmp(a, "-") && !guest_cdn_valid(a)) || ((bits >> t & 1) && !strcmp(a, "-"))) return 0;
    if (renewal && !strcmp(a, "-") != !vod_alternates[t][0]) return 0;
  }
  return 1;
}
static void vod_alternates_adopt(const char *video, const char *audio, int bits) {
  const char *alternates[2] = { video, audio };
  double until = bridge_deadline - http_now();
  for (int t = 0; t < 2; t++) {
    if (!strcmp(alternates[t], "-")) { vod_alternates[t][0] = 0; vod_on_alternate[t] = 0; continue; }
    strcpy(vod_alternates[t], alternates[t]);
    if (bits >> t & 1) vod_on_alternate[t] = 1;
    double remaining = vod_url_remaining(alternates[t]);
    if (remaining < until) until = remaining;
  }
  /* A backup can only shorten the signature-bound lease, never extend it. */
  bridge_deadline = http_now() + (until > 0 ? until : 0);
}
static int vod_failover_begin(const char *bvid, const char *token, const char *video, const char *audio, const char *metadata,
                              const char *video_alternate, const char *audio_alternate, const char *start) {
  if (!start || strlen(start) != 1 || start[0] < '0' || start[0] > '3') return 16;
  int bits = start[0] - '0';
  if (!vod_alternates_valid(video_alternate, audio_alternate, bits, 0)) return 16;
  memset(vod_alternates, 0, sizeof(vod_alternates)); memset(vod_on_alternate, 0, sizeof(vod_on_alternate)); memset(vod_client_alternate, 0, sizeof(vod_client_alternate));
  int result = bridge_begin(bvid, token, video, audio, metadata);
  if (result) return result;
  vod_alternates_adopt(video_alternate, audio_alternate, bits);
  return 0;
}
static int vod_failover_renew(const char *video, const char *audio, const char *metadata, const char *video_alternate, const char *audio_alternate) {
  if (bridge_fd < 0 || !vod_alternates_valid(video_alternate, audio_alternate, 0, 1)) return 0;
  double now = http_now(); const char *alternates[2] = { video_alternate, audio_alternate };
  for (int t = 0; t < 2; t++) if (strcmp(alternates[t], "-") && vod_url_remaining(alternates[t]) <= bridge_deadline - now) return 0;
  if (!vod_renew(video, audio, metadata)) return 0;
  vod_alternates_adopt(video_alternate, audio_alternate, (vod_on_alternate[0] ? 1 : 0) | (vod_on_alternate[1] ? 2 : 0));
  return 1;
}
#endif
