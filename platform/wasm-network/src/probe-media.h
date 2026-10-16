/* Original W01 loopback-only server for exact embedded synthetic DASH assets. */
#ifndef BILISOFA_PROBE_MEDIA_H
#define BILISOFA_PROBE_MEDIA_H
#ifndef BILISOFA_MEDIA_ROOT
#define BILISOFA_MEDIA_ROOT "/probe-media"
#endif
#ifndef BILISOFA_MEDIA_PORT
#define BILISOFA_MEDIA_PORT 40323
#endif
#ifndef BILISOFA_MEDIA_SECONDS
#define BILISOFA_MEDIA_SECONDS 60
#endif
static int media_asset_kind = 0;
static int media_reply(int client, double deadline) {
  char line[2049]; if (!http_read_line(client, line, deadline)) return 0;
  const char *file = NULL; int head = 0;
  const char *fixed[] = {"probe.mpd", "init-0.mp4", "init-1.mp4"};
  char name[48], expected[96];
  for (int index = 0; index < 17 && !file; index++) {
    if (index < 3) snprintf(name, sizeof(name), "%s", fixed[index]);
    else snprintf(name, sizeof(name), "segment-%d-%05d.m4s", (index-3)/7, (index-3)%7+1);
    for (int method = 0; method < 2 && !file; method++) {
      for (int version = 0; version < 2; version++) {
        snprintf(expected, sizeof(expected), "%s /%s HTTP/1.%d", method ? "HEAD" : "GET", name, version);
        if (!strcmp(line, expected)) { file = name; head = method; break; }
      }
    }
  }
  char path[256]; unsigned char *bytes = NULL; size_t size = 0; FILE *input = NULL;
  if (file) {
    int count = snprintf(path, sizeof(path), "%s/%s", BILISOFA_MEDIA_ROOT, file);
    if (count <= 0 || (size_t)count >= sizeof(path)) return 0;
    input = fopen(path, "rb");
    if (input) {
      if (fseek(input, 0, SEEK_END)) { fclose(input); return 0; }
      long length = ftell(input);
      if (length <= 0 || length > 256*1024 || fseek(input, 0, SEEK_SET)) { fclose(input); return 0; }
      size = (size_t)length; bytes = malloc(size);
      if (!bytes || fread(bytes, 1, size, input) != size) { free(bytes); fclose(input); return 0; }
      fclose(input);
    }
  }
  const int audio = file && (!strncmp(file,"init-1",6) || !strncmp(file,"segment-1",9));
  const char *mime = file && !strcmp(file,"probe.mpd") ? "application/dash+xml" : audio ? "audio/mp4" : "video/mp4";
  char header[512];
  int count = snprintf(header, sizeof(header), "HTTP/1.1 %s\r\nContent-Type: %s\r\nContent-Length: %zu\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n", bytes ? "200 OK" : "404 Not Found", mime, size);
  int sent = count > 0 && (size_t)count < sizeof(header) && http_write(client, header, (size_t)count, deadline);
  if (sent && bytes && !head) sent = http_write(client, (const char *)bytes, size, deadline);
  int served = sent && bytes && !head;
  media_asset_kind = served ? (!strcmp(file,"probe.mpd") ? 1 : (!strncmp(file,"init-1",6) || !strncmp(file,"segment-1",9)) ? 3 : 2) : 0;
  free(bytes); return served;
}
static int media_probe(void) {
  int server = http_server_socket(), result = 2;
  if (server < 0) return 10;
  struct sockaddr_in address; memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET; address.sin_port = htons(BILISOFA_MEDIA_PORT); address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  int reuse = 1;
  if (setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) { result = 11; goto done; }
  if (bind(server, (struct sockaddr *)&address, sizeof(address)) < 0) { result = 12; goto done; }
  if (listen(server, 2) < 0) { result = 13; goto done; }
  double start = http_now(); if (start < 0) { result = 14; goto done; }
  double deadline = start + BILISOFA_MEDIA_SECONDS;
  puts("MPD:ready"); fflush(stdout);
  for (int connections = 0; connections < 128 && http_now() < deadline;) {
    if (!http_wait(server, POLLIN, deadline)) continue;
    int client = http_accept(server);
    if (client < 0) { if (errno == EAGAIN || errno == EWOULDBLOCK || errno == EINTR) continue; result = 15; break; }
    connections++;
#ifdef SO_NOSIGPIPE
    int no_signal = 1; setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &no_signal, sizeof(no_signal));
#endif
    double client_deadline = http_now()+2; if (client_deadline > deadline) client_deadline = deadline;
    if (media_reply(client, client_deadline)) { puts("MPD:asset"); fflush(stdout); }
    close(client);
  }
done:
  close(server); return result;
}
#endif
