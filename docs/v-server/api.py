"""
V Server v2 — Flask API que da a V "manos" en el Hetzner.

Endpoints:
  GET  /health          → {"status":"healthy","version":2}
  POST /execute         → corre Python/Node (igual que v1)
  POST /ssh-execute     → SSH a server remoto (paramiko)
  POST /browser         → Playwright (goto/click/type/screenshot/get_html/
                          get_text/describe_element/execute_script)
  POST /generate-image  → Stable Diffusion vía Stability AI API

Deps en el servidor (instalar antes de usar):
  pip install flask paramiko playwright requests
  playwright install chromium
  playwright install-deps   # libs del sistema (necesita sudo)

Env vars opcionales (configurar como Environment= en el systemd unit):
  STABILITY_API_KEY   → habilita /generate-image
  V_SERVER_TOKEN      → si está definido, todos los endpoints (excepto
                        /health) requieren header X-V-Token con ese valor

Si V_SERVER_TOKEN no está definido, el servidor acepta requests anónimos
(solo recomendable mientras el servidor sea inaccesible desde internet
o mientras se está probando). Para producción: setear el token + meter
nginx + Let's Encrypt delante para TLS.
"""

import base64
import os
import subprocess
from io import StringIO

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

EXPECTED_TOKEN = os.environ.get("V_SERVER_TOKEN", "")


@app.before_request
def check_auth():
    if request.path == "/health":
        return None
    if not EXPECTED_TOKEN:
        return None
    provided = request.headers.get("X-V-Token", "")
    if provided != EXPECTED_TOKEN:
        return jsonify({"error": "unauthorized"}), 401
    return None


@app.route("/health", methods=["GET"])
def health():
    return {"status": "healthy", "version": 2}


@app.route("/execute", methods=["POST"])
def execute_code():
    data = request.json or {}
    code_str = data.get("code", "")
    lang = data.get("language", "python")
    timeout_s = int(data.get("timeout_seconds", 30))
    if not code_str:
        return jsonify({"error": "code requerido"}), 400
    try:
        if lang == "python":
            result = subprocess.run(
                ["python3", "-c", code_str],
                capture_output=True, text=True, timeout=timeout_s,
            )
        elif lang == "node":
            result = subprocess.run(
                ["node", "-e", code_str],
                capture_output=True, text=True, timeout=timeout_s,
            )
        else:
            return jsonify({"error": f"lenguaje no soportado: {lang}"}), 400
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return jsonify({"error": f"timeout tras {timeout_s}s"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/ssh-execute", methods=["POST"])
def ssh_execute():
    try:
        import paramiko
    except ImportError:
        return jsonify({
            "error": "paramiko no instalado. Ejecuta: pip install paramiko",
        }), 503
    data = request.json or {}
    host = data.get("host", "")
    command = data.get("command", "")
    username = data.get("username") or "root"
    password = data.get("password")
    private_key = data.get("private_key")
    sudo = bool(data.get("sudo", False))
    port = int(data.get("port", 22))
    timeout_s = int(data.get("timeout_seconds", 60))
    if not host or not command:
        return jsonify({"error": "host y command son requeridos"}), 400
    if not password and not private_key:
        return jsonify({"error": "falta password o private_key"}), 400

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect_kwargs = {
        "hostname": host, "port": port, "username": username, "timeout": 15,
    }
    try:
        if private_key:
            key = None
            for key_cls in (
                paramiko.Ed25519Key,
                paramiko.RSAKey,
                paramiko.ECDSAKey,
                paramiko.DSSKey,
            ):
                try:
                    key = key_cls.from_private_key(StringIO(private_key))
                    break
                except Exception:
                    continue
            if not key:
                return jsonify({
                    "error": "private_key no parseable (rsa/ed25519/ecdsa/dss)",
                }), 400
            connect_kwargs["pkey"] = key
        else:
            connect_kwargs["password"] = password
        client.connect(**connect_kwargs)
        cmd_to_run = f"sudo -n {command}" if sudo else command
        stdin, stdout, stderr = client.exec_command(cmd_to_run, timeout=timeout_s)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        rc = stdout.channel.recv_exit_status()
        return {"stdout": out, "stderr": err, "return_code": rc}
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            client.close()
        except Exception:
            pass


@app.route("/browser", methods=["POST"])
def browser_action():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return jsonify({
            "error": "playwright no instalado. Ejecuta: pip install playwright && playwright install chromium",
        }), 503

    data = request.json or {}
    action = data.get("action", "")
    url = data.get("url")
    selector = data.get("selector")
    text_to_type = data.get("text_to_type")
    script = data.get("script")
    wait_for_selector = data.get("wait_for_selector")
    return_screenshot = bool(data.get("return_screenshot_base64", False))
    wait_ms = int(data.get("wait_ms", 500))

    valid_actions = {
        "goto", "click", "type", "screenshot",
        "get_html", "get_text", "describe_element", "execute_script",
    }
    if action not in valid_actions:
        return jsonify({"error": f"acción no soportada: {action}"}), 400

    try:
        result = {}
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                if url:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                if wait_for_selector:
                    page.wait_for_selector(wait_for_selector, timeout=10000)
                if action == "goto":
                    result["result"] = f"navegado a {url}"
                elif action == "click":
                    if not selector:
                        return jsonify({"error": "click requiere selector"}), 400
                    page.click(selector)
                    result["result"] = f"click en {selector}"
                elif action == "type":
                    if not selector:
                        return jsonify({"error": "type requiere selector"}), 400
                    page.fill(selector, text_to_type or "")
                    result["result"] = f"escrito en {selector}"
                elif action == "get_html":
                    result["result"] = page.content()
                elif action == "get_text":
                    if selector:
                        result["result"] = page.locator(selector).inner_text()
                    else:
                        result["result"] = page.inner_text("body")
                elif action == "describe_element":
                    if not selector:
                        return jsonify({
                            "error": "describe_element requiere selector",
                        }), 400
                    elem = page.locator(selector)
                    result["result"] = {
                        "text": elem.inner_text(),
                        "html": elem.inner_html(),
                        "tag": elem.evaluate("e => e.tagName"),
                    }
                    elem_shot = elem.screenshot()
                    result["screenshot_base64"] = base64.b64encode(elem_shot).decode()
                elif action == "execute_script":
                    result["result"] = page.evaluate(script or "() => null")
                if wait_ms > 0:
                    page.wait_for_timeout(wait_ms)
                if return_screenshot or action == "screenshot":
                    shot = page.screenshot(full_page=True)
                    result["screenshot_base64"] = base64.b64encode(shot).decode()
            finally:
                browser.close()
        return result
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate-image", methods=["POST"])
def generate_image():
    api_key = os.environ.get("STABILITY_API_KEY")
    if not api_key:
        return jsonify({
            "error": "STABILITY_API_KEY no configurada en el servidor",
        }), 503
    data = request.json or {}
    prompt = data.get("prompt", "")
    size = data.get("size", "512x512")
    negative = data.get("negative_prompt", "")
    if not prompt:
        return jsonify({"error": "prompt requerido"}), 400
    try:
        w, h = (int(x) for x in size.split("x"))
    except Exception:
        return jsonify({"error": "size debe tener formato WIDTHxHEIGHT"}), 400
    try:
        resp = requests.post(
            "https://api.stability.ai/v2beta/stable-image/generate/core",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "image/*",
            },
            files={"none": ""},
            data={
                "prompt": prompt,
                "negative_prompt": negative,
                "output_format": "png",
                "width": w,
                "height": h,
            },
            timeout=90,
        )
        if resp.status_code != 200:
            return jsonify({
                "error": f"stability ai {resp.status_code}: {resp.text[:200]}",
            }), 502
        return {
            "image_base64": base64.b64encode(resp.content).decode(),
            "size": size,
            "mime": "image/png",
        }
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
