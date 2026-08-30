/**
 * Ojos vía Navegador Pro (Chrome vivo en Hetzner, CDP :9222).
 * Abre pestaña nueva, fotografía, cierra. No usa el perfil aislado.
 */
export const CDP_CONTAINER = "vulcano-browser";

export function quoteArg(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const CDP_PY = `import json, os, sys, time, socket, struct, base64, urllib.request, urllib.parse

CDP = "http://127.0.0.1:9222"

def http(method, url, timeout=15):
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def ws_connect(url, timeout=20):
    u = urllib.parse.urlparse(url)
    host = u.hostname
    port = u.port or 80
    path = u.path + (("?" + u.query) if u.query else "")
    key = base64.b64encode(os.urandom(16)).decode()
    s = socket.create_connection((host, port), timeout)
    s.settimeout(timeout)
    s.sendall((
        "GET " + path + " HTTP/1.1\\r\\n"
        "Host: " + host + ":" + str(port) + "\\r\\n"
        "Upgrade: websocket\\r\\n"
        "Connection: Upgrade\\r\\n"
        "Sec-WebSocket-Key: " + key + "\\r\\n"
        "Sec-WebSocket-Version: 13\\r\\n"
        "\\r\\n"
    ).encode())
    buf = b""
    while b"\\r\\n\\r\\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            raise RuntimeError("ws handshake closed")
        buf += chunk
    if b"101" not in buf.split(b"\\r\\n", 1)[0]:
        raise RuntimeError("ws handshake failed")
    return s

def ws_send(s, payload):
    data = payload.encode("utf-8")
    mask = os.urandom(4)
    header = bytearray([0x81])
    n = len(data)
    if n < 126:
        header.append(0x80 | n)
    elif n < 65536:
        header.append(0x80 | 126)
        header.extend(struct.pack(">H", n))
    else:
        header.append(0x80 | 127)
        header.extend(struct.pack(">Q", n))
    header.extend(mask)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    s.sendall(bytes(header) + masked)

def recvn(s, n):
    buf = b""
    while len(buf) < n:
        chunk = s.recv(n - len(buf))
        if not chunk:
            raise RuntimeError("ws closed")
        buf += chunk
    return buf

def ws_recv(s):
    b1, b2 = recvn(s, 2)
    fin = b1[0] & 0x80
    opcode = b1[0] & 0x0F
    masked = b2[0] & 0x80
    n = b2[0] & 0x7F
    if n == 126:
        n = struct.unpack(">H", recvn(s, 2))[0]
    elif n == 127:
        n = struct.unpack(">Q", recvn(s, 8))[0]
    mask = recvn(s, 4) if masked else None
    data = recvn(s, n)
    if mask:
        data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    while not fin:
        b1, b2 = recvn(s, 2)
        fin = b1[0] & 0x80
        n = b2[0] & 0x7F
        if n == 126:
            n = struct.unpack(">H", recvn(s, 2))[0]
        elif n == 127:
            n = struct.unpack(">Q", recvn(s, 8))[0]
        extra = recvn(s, n)
        data += extra
    if opcode == 0x8:
        raise RuntimeError("ws close")
    if opcode in (0x1, 0x0):
        return data.decode("utf-8")
    return None

class Cdp:
    def __init__(self, ws):
        self.ws = ws
        self.i = 0
    def call(self, method, params=None, timeout=15):
        self.i += 1
        msg_id = self.i
        ws_send(self.ws, json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            raw = ws_recv(self.ws)
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except Exception:
                continue
            if obj.get("id") == msg_id:
                if "error" in obj:
                    raise RuntimeError(str(obj["error"]))
                return obj.get("result") or {}
        raise RuntimeError("cdp timeout " + method)

def close_target(tid):
    if not tid:
        return
    try:
        http("GET", CDP + "/json/close/" + tid)
    except Exception:
        try:
            http("PUT", CDP + "/json/close/" + tid)
        except Exception:
            pass

def pick_page():
    pages = json.loads(http("GET", CDP + "/json"))
    for t in pages:
        if t.get("type") != "page":
            continue
        url = t.get("url") or ""
        if url.startswith("devtools://") or url.startswith("chrome://"):
            continue
        if t.get("webSocketDebuggerUrl"):
            return t
    raise RuntimeError("no page tab")

def shot(cdp, w, h, mobile):
    cdp.call("Page.enable")
    cdp.call("Emulation.setDeviceMetricsOverride", {
        "width": w, "height": h, "deviceScaleFactor": 1, "mobile": bool(mobile),
        "screenWidth": w, "screenHeight": h,
    })
    if mobile:
        cdp.call("Emulation.setUserAgentOverride", {
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        })
    deadline = time.time() + 12
    while time.time() < deadline:
        try:
            ev = cdp.call("Runtime.evaluate", {
                "expression": "document.readyState", "returnByValue": True
            }, timeout=4)
            val = ((ev.get("result") or {}).get("value"))
            if val in ("interactive", "complete"):
                break
        except Exception:
            time.sleep(0.4)
    time.sleep(1.0)
    result = cdp.call("Page.captureScreenshot", {"format": "png", "fromSurface": True}, timeout=12)
    data = result.get("data") or ""
    if not data:
        raise RuntimeError("empty screenshot")
    sys.stdout.write(data)

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "current":
        target = pick_page()
        s = ws_connect(target["webSocketDebuggerUrl"], timeout=20)
        try:
            sys.stdout.write("TAB " + (target.get("url") or "") + "\\n")
            shot(Cdp(s), 1440, 900, False)
        finally:
            try:
                s.close()
            except Exception:
                pass
        return
    url, w, h, mobile = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4] == "1"
    encoded = urllib.parse.quote(url, safe="")
    target = json.loads(http("PUT", CDP + "/json/new?" + encoded))
    tid = target.get("id")
    ws_url = target.get("webSocketDebuggerUrl")
    if not ws_url:
        raise RuntimeError("no websocket")
    s = None
    try:
        s = ws_connect(ws_url, timeout=20)
        shot(Cdp(s), w, h, mobile)
    finally:
        if s:
            try:
                s.close()
            except Exception:
                pass
        close_target(tid)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.write("CDP_FAIL " + str(e) + "\\n")
        sys.exit(3)
`;

function pipePython(args: string[]): string {
  const scriptB64 = Buffer.from(CDP_PY, "utf8").toString("base64");
  return [`echo ${scriptB64} | base64 -d | docker exec -i ${CDP_CONTAINER} python3 -`, ...args].join(
    " ",
  );
}

export function buildCdpNavigateCommand(input: {
  url: string;
  width: number;
  height: number;
  mobile: boolean;
}): string {
  return pipePython([
    quoteArg(input.url),
    String(input.width),
    String(input.height),
    input.mobile ? "1" : "0",
  ]);
}

export function buildCdpCurrentCommand(): string {
  return pipePython(["current"]);
}
