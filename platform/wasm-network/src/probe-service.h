/* Original cooperative Worker service lifecycle. Stop acknowledgement follows fd closure. */
#ifndef BILISOFA_PROBE_SERVICE_H
#define BILISOFA_PROBE_SERVICE_H
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
static int service_fd = -1, service_client = -1, service_kind = 0, service_connections = 0;
static int service_unconfirmed = 0;
static double service_deadline = 0;
static char service_report[3073];
static void service_end(const char *event) {
  int confirmed = !service_unconfirmed;
  if (service_client >= 0 && close(service_client) < 0) confirmed = 0;
  if (service_fd >= 0 && close(service_fd) < 0) confirmed = 0;
  service_fd = service_client = -1;
  if (!confirmed) service_unconfirmed = 1;
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
  if (!confirmed) event = service_kind == 1 ? "HTTP:failed:17" : "MPD:failed:17";
  if (event) { puts(event); fflush(stdout); }
}
static int service_begin(int kind, const char *report) {
  if (service_unconfirmed) return 17;
  service_kind = kind; service_connections = 0;
  if (kind != 1 && kind != 2) return 16;
  if (kind == 1 && (!report || strlen(report) > 3072)) return 16;
  if (kind == 1) snprintf(service_report, sizeof(service_report), "%s", report);
  service_fd = http_server_socket(); if (service_fd < 0) return 10;
  int reuse = 1, result = 0;
  struct sockaddr_in address; memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET; address.sin_port = htons(kind == 1 ? BILISOFA_HTTP_PORT : BILISOFA_MEDIA_PORT);
  address.sin_addr.s_addr = htonl(kind == 1 ? INADDR_ANY : INADDR_LOOPBACK);
  if (setsockopt(service_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) result = 11;
  else if (bind(service_fd, (struct sockaddr *)&address, sizeof(address)) < 0) result = 12;
  else if (listen(service_fd, 2) < 0) result = 13;
  double now = http_now(); if (now < 0) result = 14;
  if (result) { service_end(NULL); return result; }
  service_deadline = now + (kind == 1 ? BILISOFA_HTTP_SECONDS : BILISOFA_MEDIA_SECONDS);
  puts(kind == 1 ? "HTTP:ready" : "MPD:ready"); fflush(stdout); return 0;
}
static void service_tick(void) {
  if (service_fd < 0) return;
  if (http_now() >= service_deadline || service_connections >= (service_kind == 1 ? 16 : 128)) {
    service_end(service_kind == 1 ? "HTTP:timeout" : "MPD:closed"); return;
  }
  /* Zero-time poll yields the Worker event loop between ticks; stop messages can run. */
  struct pollfd item = { service_fd, POLLIN, 0 };
  if (poll(&item, 1, 0) <= 0 || !(item.revents & POLLIN)) return;
  service_client = http_accept(service_fd);
  if (service_client < 0) {
    if (errno != EAGAIN && errno != EWOULDBLOCK && errno != EINTR) service_end(service_kind == 1 ? "HTTP:failed:15" : "MPD:failed:15");
    return;
  }
  service_connections++;
#ifdef SO_NOSIGPIPE
  int no_signal = 1; setsockopt(service_client, SOL_SOCKET, SO_NOSIGPIPE, &no_signal, sizeof(no_signal));
#endif
  double deadline = http_now()+2; if (deadline > service_deadline) deadline = service_deadline;
  int served = service_kind == 1 ? http_request(service_client, service_report, deadline) : media_reply(service_client, deadline);
  int closed = close(service_client); service_client = -1;
  if (closed < 0) { service_unconfirmed = 1; service_end(service_kind == 1 ? "HTTP:failed:17" : "MPD:failed:17"); return; }
  if (served && service_kind == 1) service_end("HTTP:served");
  else if (served) { puts(media_asset_kind == 3 ? "MPD:asset_audio" : media_asset_kind == 2 ? "MPD:asset_video" : "MPD:asset_manifest"); fflush(stdout); }
}
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void probe_stop(void) { service_end(service_kind == 1 ? "HTTP:stopped" : "MPD:stopped"); }
#endif
