#!/usr/bin/env python3
"""Read-only infrastructure snapshot. Run as root; output contains no credentials.

Install on Casa Luis and run every two minutes. Casa Acevedo is collected through
the existing trusted SSH connection. A failed source stays failed, never empty/OK.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request


def run(args, timeout=8):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout)


def environment(unit):
    pid = run(["systemctl", "show", unit, "-p", "MainPID", "--value"]).stdout.strip()
    if not pid.isdigit() or int(pid) < 1:
        return {}
    return dict(v.decode().split("=", 1) for v in
                pathlib.Path(f"/proc/{pid}/environ").read_bytes().split(b"\0") if b"=" in v)


def api(url, token):
    if not token:
        raise ValueError("credential_missing")
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token,
                                               "User-Agent": "VForge-infra-audit"})
    return json.load(urllib.request.urlopen(req, timeout=10))


def failure(exc):
    return {"status": "error", "error": f"HTTP {exc.code}" if isinstance(exc, urllib.error.HTTPError)
            else type(exc).__name__}


def inventory():
    env = environment("selene-acevedo.service")
    result = {}
    try:
        token = env.get("ALUMNO_GITHUB_TOKEN") or env.get("GITHUB_TOKEN")
        user = api("https://api.github.com/user", token)
        items = []
        # Bound the work but expose whether the result is incomplete.
        for page in range(1, 11):
            rows = api(f"https://api.github.com/user/repos?per_page=100&page={page}&affiliation=owner", token)
            items.extend({"id": str(r["id"]), "name": r["full_name"], "url": r["html_url"],
                          "updatedAt": r.get("pushed_at"), "private": r["private"],
                          "description": (r.get("description") or "")[:400],
                          "defaultBranch": r.get("default_branch")} for r in rows)
            if len(rows) < 100:
                break
        result["github"] = {"status": "ok", "account": user["login"], "items": items,
                              "complete": len(rows) < 100}
    except Exception as exc:
        result["github"] = failure(exc)
    try:
        token = env.get("ACEVEDO_VERCEL_TOKEN")
        user = api("https://api.vercel.com/v2/user", token)["user"]
        team = env.get("VERCEL_TEAM_ID", "")
        suffix = "&teamId=" + urllib.parse.quote(team) if team else ""
        items, cursor = [], ""
        for _ in range(10):
            data = api("https://api.vercel.com/v9/projects?limit=100" + suffix + cursor, token)
            for r in data.get("projects", []):
                deployment = r.get("targets", {}).get("production") or {}
                aliases = deployment.get("alias") or []
                link = r.get("link") or {}
                repo = f"{link['org']}/{link['repo']}" if link.get("org") and link.get("repo") else None
                host = next((a for a in aliases if not a.endswith(".vercel.app")), None)
                host = host or deployment.get("url")
                items.append({"id": r["id"], "name": r["name"], "repo": repo,
                              "url": "https://" + host if host else None,
                              "state": deployment.get("readyState") or "unknown"})
            nxt = data.get("pagination", {}).get("next")
            if not nxt:
                break
            cursor = "&until=" + str(nxt)
        result["vercel"] = {"status": "ok", "account": user.get("email") or user.get("username"),
                              "team": team, "items": items, "complete": not bool(nxt)}
    except Exception as exc:
        result["vercel"] = failure(exc)
    return result


def sync_catalog(houses, previous):
    """Reconcile verified Acevedo resources without overwriting another house.

    One SQL statement makes project/repository/audit changes atomic. No deletion,
    guessed deployment URL, or owner-token substitution is permitted here.
    """
    house = next((h for h in houses if h["id"] == "acevedo"), {})
    sources = house.get("inventory", {})
    gh, vc = sources.get("github", {}), sources.get("vercel", {})
    if gh.get("status") != "ok" or vc.get("status") != "ok":
        return {"status": "error", "error": "provider_not_verified"}
    if gh.get("account") != "dluisdelatorre-beep":
        return {"status": "error", "error": "github_identity_mismatch"}
    fingerprint = hashlib.sha256(json.dumps({"version": 2, "sources": sources}, sort_keys=True).encode()).hexdigest()
    if previous.get("fingerprint") == fingerprint and previous.get("status") == "ok":
        return previous
    items = []
    linked = {p["repo"]: p for p in vc.get("items", []) if p.get("repo")}
    for repo in gh.get("items", []):
        if not repo["name"].startswith("dluisdelatorre-beep/"):
            continue
        deployment = linked.get(repo["name"], {})
        name = repo["name"].split("/", 1)[1]
        items.append({"id": "acevedo-gh-" + repo["id"], "name": name,
            "repo": repo["name"], "github_url": repo["url"], "private": repo["private"],
            "branch": repo.get("defaultBranch"), "description": repo.get("description"),
            "vercel_id": deployment.get("id"), "url": deployment.get("url")})
    repo_names = {r["repo"] for r in items}
    for p in vc.get("items", []):
        if p.get("repo") in repo_names:
            continue
        items.append({"id": "acevedo-vc-" + p["id"].removeprefix("prj_"), "name": p["name"],
            "repo": None, "github_url": None, "private": None, "branch": None,
            "description": None, "vercel_id": p["id"], "url": p.get("url")})
    env = environment("vforge-api.service")
    url = env.get("DATABASE_URL")
    if not url:
        return {"status": "error", "error": "catalog_database_missing"}
    query = """WITH incoming AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,name text,repo text,
        github_url text,private boolean,branch text,description text,vercel_id text,url text)
    ), resolved AS (
      SELECT COALESCE((SELECT p.id FROM projects p WHERE
        (i.repo IS NOT NULL AND p.github_repo=i.repo) OR
        (i.vercel_id IS NOT NULL AND p.vercel_project_id=i.vercel_id)
        ORDER BY p.created_at LIMIT 1),i.id) AS project_id,i.* FROM incoming i
    ), saved AS (
      INSERT INTO projects(id,name,description,github_repo,github_url,github_private,
        github_default_branch,vercel_project_id,vercel_url,client_name,category,status,cartera_tipo)
      SELECT project_id,name,description,repo,github_url,private,branch,vercel_id,url,
        'Acevedo','en_revision','unknown',ARRAY['Acevedo']::text[] FROM resolved
      ON CONFLICT(id) DO UPDATE SET
        github_repo=COALESCE(projects.github_repo,EXCLUDED.github_repo),
        github_url=COALESCE(projects.github_url,EXCLUDED.github_url),
        github_private=COALESCE(EXCLUDED.github_private,projects.github_private),
        github_default_branch=COALESCE(EXCLUDED.github_default_branch,projects.github_default_branch),
        vercel_project_id=COALESCE(EXCLUDED.vercel_project_id,projects.vercel_project_id),
        vercel_url=COALESCE(EXCLUDED.vercel_url,projects.vercel_url),
        client_name=COALESCE(projects.client_name,'Acevedo'),
        cartera_tipo=CASE WHEN cardinality(COALESCE(projects.cartera_tipo,'{}'::text[]))=0
          THEN ARRAY['Acevedo']::text[] ELSE projects.cartera_tipo END,updated_at=now()
      WHERE (projects.github_repo IS NULL OR projects.github_repo=EXCLUDED.github_repo)
        AND (projects.vercel_project_id IS NULL OR EXCLUDED.vercel_project_id IS NULL
             OR projects.vercel_project_id=EXCLUDED.vercel_project_id)
      RETURNING id
    ), repositories AS (
      INSERT INTO project_repositories(project_id,repo_full_name,role,is_primary,default_branch,private,html_url)
      SELECT r.project_id,r.repo,'app',true,r.branch,r.private,r.github_url
      FROM resolved r JOIN saved s ON s.id=r.project_id WHERE r.repo IS NOT NULL
      ON CONFLICT(project_id,repo_full_name) DO UPDATE SET
        default_branch=EXCLUDED.default_branch,private=EXCLUDED.private,
        html_url=EXCLUDED.html_url,updated_at=now() RETURNING project_id
    ), audit AS (
      INSERT INTO audit_events(user_id,action,resource_type,ring,payload)
      VALUES('operator_luis','projects.sync.acevedo','projects',1,
        jsonb_build_object('source','verified-provider-inventory','count',(SELECT count(*) FROM saved)))
      RETURNING id
    ) SELECT (SELECT count(*) FROM saved) AS projects,
      (SELECT count(*) FROM repositories) AS repositories,(SELECT count(*) FROM audit) AS audits"""
    request = urllib.request.Request("https://" + urllib.parse.urlsplit(url).hostname + "/sql",
        data=json.dumps({"query": query, "params": [json.dumps(items)]}).encode(),
        headers={"Content-Type": "application/json", "Neon-Connection-String": url}, method="POST")
    try:
        result = json.load(urllib.request.urlopen(request, timeout=15))["rows"][0]
        return {"status": "ok", "fingerprint": fingerprint, "projects": int(result["projects"]),
                "repositories": int(result["repositories"]), "syncedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    except Exception as exc:
        return failure(exc)


def nginx():
    if not shutil.which("nginx"):
        return {"status": "not_installed"}
    r = run(["nginx", "-T"])
    domains = set()
    for value in re.findall(r"^\s*server_name\s+([^;]+);", r.stdout, re.M):
        domains.update(x for x in value.split() if x != "_")
    files = re.findall(r"^# configuration file ([^:]+):", r.stdout, re.M)
    conflicts = len(re.findall("conflicting server name", r.stderr))
    backups = [pathlib.Path(f).name for f in files if re.search(r"bak|backup|\.old", f, re.I)]
    return {"status": "error" if r.returncode else "warning" if conflicts or backups else "ok",
            "valid": r.returncode == 0, "domains": sorted(domains),
            "proxyRoutes": len(re.findall(r"^\s*(?:proxy_pass|grpc_pass)\s", r.stdout, re.M)),
            "conflicts": conflicts, "loadedBackups": backups}


def metamcp():
    if not shutil.which("docker"):
        return {"status": "not_installed"}
    active = run(["docker", "ps", "--format", "{{.Names}}"])
    if active.returncode:
        return {"status": "error", "error": "docker_unavailable"}
    if "metamcp" not in active.stdout.splitlines():
        return {"status": "not_running"}
    query = """SELECT json_build_object(
      'endpoints',(SELECT json_agg(json_build_object('name',e.name,'namespace',n.name,
       'authenticated',e.enable_api_key_auth,'oauth',e.enable_oauth,'private',e.user_id IS NOT NULL))
       FROM endpoints e LEFT JOIN namespaces n ON n.uuid=e.namespace_uuid),
      'namespaces',(SELECT count(*) FROM namespaces),
      'servers',(SELECT count(*) FROM mcp_servers),
      'activeKeys',(SELECT count(*) FROM api_keys WHERE is_active),
      'auditAvailable',EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='mcp_request_audit_logs'))"""
    r = run(["docker", "exec", "metamcp-pg", "sh", "-lc",
             'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c ' + "'" + query.replace("'", "'\\''") + "'"])
    if r.returncode:
        return {"status": "error", "error": "metadata_query_failed"}
    return {"status": "ok", **json.loads(r.stdout)}


def collect(house):
    memory = {}
    for line in pathlib.Path("/proc/meminfo").read_text().splitlines():
        key, value = line.split(":", 1)
        if key in ("MemTotal", "MemAvailable"):
            memory[key] = int(value.strip().split()[0]) * 1024
    disk = shutil.disk_usage("/")
    units = (["nginx", "selene-taller-tunnel", "cf-provision", "paradox-voice-tunnel", "vforge-api"]
             if house == "luis" else ["selene-acevedo", "ollama-acevedo", "acevedo-constructor", "acevedo-ops"])
    services = [{"name": u, "state": run(["systemctl", "is-active", u]).stdout.strip() or "unknown"}
                for u in units]
    data = {"id": house, "name": "Casa Luis" if house == "luis" else "Casa Acevedo",
            "status": "ok", "hostname": socket.gethostname(), "load": os.getloadavg()[0],
            "cpuCount": os.cpu_count(),
            "memory": {"total": memory.get("MemTotal"), "available": memory.get("MemAvailable")},
            "disk": {"total": disk.total, "used": disk.used, "percent": round(disk.used / disk.total * 100, 1)},
            "services": services, "nginx": nginx(), "metamcp": metamcp()}
    if house == "acevedo":
        data["inventory"] = inventory()
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--house", choices=["luis", "acevedo"])
    parser.add_argument("--output", default="/root/tablero/infra.json")
    args = parser.parse_args()
    if args.house:
        print(json.dumps(collect(args.house)))
        return
    houses = []
    # Collect both houses concurrently so source timestamps remain comparable.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        local = executor.submit(collect, "luis")
        # stdin carries the same reviewed collector; credentials stay on the host.
        try:
            r = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
                "-o", "ConnectTimeout=5", "root@2.28.119.25", "python3 - --house acevedo"],
                input=pathlib.Path(__file__).read_text(), capture_output=True, text=True, timeout=65)
            if r.returncode:
                raise RuntimeError("ssh_failed")
            remote_data = json.loads(r.stdout)
        except Exception as exc:
            remote_data = {"id": "acevedo", "name": "Casa Acevedo", **failure(exc)}
        houses = [local.result(), remote_data]
    output = pathlib.Path(args.output)
    try:
        previous = json.loads(output.read_text()).get("catalog", {})
    except (OSError, ValueError):
        previous = {}
    data = {"generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "houses": houses,
            "catalog": sync_catalog(houses, previous)}
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=output.parent, prefix="infra-", suffix=".json")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f)
        os.chmod(name, 0o600)
        os.replace(name, output)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    print(json.dumps({"ok": True, "houses": [{"id": h["id"], "status": h["status"]} for h in houses]}))


if __name__ == "__main__":
    main()
