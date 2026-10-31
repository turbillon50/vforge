import importlib.util
import pathlib
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("infra", pathlib.Path(__file__).parents[1] / "servidor/tablero/infra.py")
infra = importlib.util.module_from_spec(spec)
spec.loader.exec_module(infra)


class CollectorTests(unittest.TestCase):
    def test_nginx_distinguishes_valid_configuration_with_conflicts(self):
        result = subprocess.CompletedProcess([], 0,
            "# configuration file /etc/nginx/sites-enabled/site.bak:\nserver_name a.test a.test;\nproxy_pass http://127.0.0.1:3000;",
            'conflicting server name "a.test" ignored')
        with patch.object(infra.shutil, "which", return_value="/usr/sbin/nginx"), patch.object(infra, "run", return_value=result):
            data = infra.nginx()
        self.assertTrue(data["valid"])
        self.assertEqual(data["status"], "warning")
        self.assertEqual(data["domains"], ["a.test"])
        self.assertEqual(data["loadedBackups"], ["site.bak"])

    def test_provider_failure_cannot_be_imported_as_empty_inventory(self):
        with patch.object(infra, "environment") as env:
            result = infra.sync_catalog([{"id": "acevedo", "inventory": {"github": {"status": "error"}}}], {})
        self.assertEqual(result["status"], "error")
        env.assert_not_called()

    def test_wrong_github_identity_cannot_write_the_catalog(self):
        with patch.object(infra, "environment") as env:
            result = infra.sync_catalog([{"id": "acevedo", "inventory": {
                "github": {"status": "ok", "account": "another-account"}, "vercel": {"status": "ok"}}}], {})
        self.assertEqual(result["error"], "github_identity_mismatch")
        env.assert_not_called()

    def test_errors_do_not_include_credential_bearing_messages(self):
        result = infra.failure(RuntimeError("Bearer this-is-secret"))
        self.assertEqual(result, {"status": "error", "error": "RuntimeError"})


if __name__ == "__main__":
    unittest.main()
