/* Original bounded, foreground-only W01 diagnostic endpoint. No proxy/files/account writes. */
#ifndef BILISOFA_PROBE_HTTP_H
#define BILISOFA_PROBE_HTTP_H
#include <time.h>
#ifndef BILISOFA_HTTP_SECONDS
#define BILISOFA_HTTP_SECONDS 120
#endif
#ifndef BILISOFA_HTTP_PORT
#define BILISOFA_HTTP_PORT 40322
#endif
static double http_now(void) {
  struct timespec value;
  if (clock_gettime(CLOCK_MONOTONIC, &value) < 0) return -1;
  return (double)value.tv_sec + (double)value.tv_nsec / 1000000000.0;
}
static int http_wait(int fd, short events, double deadline) {
  double remaining = deadline - http_now();
  if (remaining <= 0) return 0;
  int milliseconds = remaining >= 1.0 ? 1000 : (int)(remaining * 1000);
  struct pollfd item = { fd, events, 0 };
  int rc = poll(&item, 1, milliseconds > 0 ? milliseconds : 1);
  return rc > 0 && (item.revents & events);
}
static int http_write(int fd, const char *bytes, size_t size, double deadline) {
  size_t written = 0;
  while (written < size && http_now() < deadline) {
    if (!http_wait(fd, POLLOUT, deadline)) continue;
    int flags = 0;
#ifdef MSG_NOSIGNAL
    flags = MSG_NOSIGNAL;
#endif
    ssize_t count = send(fd, bytes + written, size - written, flags);
    if (count > 0) written += (size_t)count;
    else if (count == 0 || (errno != EAGAIN && errno != EWOULDBLOCK && errno != EINTR)) return 0;
  }
  return written == size;
}
static int http_read_line(int client, char request[2049], double deadline) {
  size_t used = 0;
  memset(request, 0, 2049);
  while (used < 2048 && http_now() < deadline) {
    if (!http_wait(client, POLLIN, deadline)) continue;
    ssize_t count = recv(client, request + used, 2048 - used, 0);
    if (count > 0) {
      /* Binary/NUL requests cannot smuggle a valid prefix. */
      if (memchr(request + used, 0, (size_t)count)) return 0;
      used += (size_t)count; request[used] = 0;
      if (strstr(request, "\r\n\r\n")) break;
    } else if (count == 0 || (errno != EAGAIN && errno != EWOULDBLOCK && errno != EINTR)) return 0;
  }
  if (!strstr(request, "\r\n\r\n")) return 0;
  char *line = strstr(request, "\r\n"); if (!line) return 0; *line = 0;
  return 1;
}
static int http_request(int client, const char *report, double deadline) {
  char request[2049]; if (!http_read_line(client, request, deadline)) return 0;
  int valid = !strcmp(request, "GET /report HTTP/1.1") || !strcmp(request, "GET /report HTTP/1.0");
  int head = !strcmp(request, "HEAD /report HTTP/1.1") || !strcmp(request, "HEAD /report HTTP/1.0");
  const char *body = (valid || head) ? report : "{}";
  char header[512];
  int length = snprintf(header, sizeof(header), "HTTP/1.1 %s\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: %zu\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: default-src 'none'; frame-ancestors 'none'\r\nConnection: close\r\n\r\n", valid || head ? "200 OK" : "404 Not Found", strlen(body));
  if (length <= 0 || (size_t)length >= sizeof(header) || !http_write(client, header, (size_t)length, deadline)) return 0;
  if (!head && !http_write(client, body, strlen(body), deadline)) return 0;
  return valid; /* HEAD/listen alone cannot prove a transferred report. */
}
static int http_server_socket(void) {
#if defined(__EMSCRIPTEN__) || defined(__linux__)
  // Samsung host bindings abort on F_SETFL; create the native fd nonblocking.
  return socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0);
#else
  int fd = socket(AF_INET, SOCK_STREAM, 0);
  if (fd >= 0 && fcntl(fd, F_SETFL, O_NONBLOCK) < 0) { close(fd); return -1; }
  return fd;
#endif
}
static int http_accept(int server) {
#if defined(__EMSCRIPTEN__) || defined(__linux__)
  return accept4(server, NULL, NULL, SOCK_NONBLOCK);
#else
  int fd = accept(server, NULL, NULL);
  if (fd >= 0 && fcntl(fd, F_SETFL, O_NONBLOCK) < 0) { close(fd); return -1; }
  return fd;
#endif
}
static int http_probe(const char *report) {
  if (!report || strlen(report) > 3072 || report[0] != '{') return 16;
  int server = http_server_socket(), result = 2;
  if (server < 0) return 10;
  struct sockaddr_in address; memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET; address.sin_port = htons(BILISOFA_HTTP_PORT); address.sin_addr.s_addr = htonl(INADDR_ANY);
  int reuse = 1;
  if (setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) { result = 11; goto done; }
  if (bind(server, (struct sockaddr *)&address, sizeof(address)) < 0) { result = 12; goto done; }
  if (listen(server, 2) < 0) { result = 13; goto done; }
  double start = http_now(); if (start < 0) { result = 14; goto done; }
  double deadline = start + BILISOFA_HTTP_SECONDS;
  puts("HTTP:ready"); fflush(stdout);
  for (int connections = 0; connections < 16 && http_now() < deadline;) {
    if (!http_wait(server, POLLIN, deadline)) continue;
    int client = http_accept(server);
    if (client < 0) { if (errno == EAGAIN || errno == EWOULDBLOCK || errno == EINTR) continue; result = 15; break; }
    connections++;
#ifdef SO_NOSIGPIPE
    int no_signal = 1; setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &no_signal, sizeof(no_signal));
#endif
    double client_deadline = http_now() + 2;
    if (client_deadline > deadline) client_deadline = deadline;
    int served = http_request(client, report, client_deadline);
    close(client);
    if (served) { result = 0; break; }
  }
done:
  close(server); return result;
}
#endif
