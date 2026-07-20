import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from api_server import ApiHandler, calculate_plan, document_checklist


class PureFunctionTests(unittest.TestCase):
    def test_plan_is_deterministic(self):
        result = calculate_plan({
            "salary": 120000, "expenses": 5000, "debtPayment": 500,
            "emergencyFund": 10000, "risk": "moderate",
        })
        self.assertEqual(result["monthlySurplus"], 4500)
        self.assertEqual(result["emergencyTarget"], 25000)
        self.assertEqual(result["emergencyGap"], 15000)
        self.assertEqual(result["debtToIncome"], 5.0)

    def test_state_is_validated_by_doctrack(self):
        self.assertEqual(document_checklist("ca")["state"], "California")
        with self.assertRaises(Exception):
            document_checklist("Narnia")


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), ApiHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=2)

    def get_json(self, path):
        with urlopen(self.base + path) as response:
            return response.status, json.loads(response.read())

    def post_json(self, path, payload):
        request = Request(self.base + path, data=json.dumps(payload).encode(),
                          headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(request) as response:
            return response.status, json.loads(response.read())

    def test_health_and_dashboard(self):
        status, health = self.get_json("/api/health")
        self.assertEqual(status, 200)
        self.assertTrue(health["ok"])
        _, dashboard = self.get_json("/api/heir/dashboard")
        self.assertEqual(dashboard["profile"]["name"], "Maya Rivera")

    def test_offline_coach(self):
        status, result = self.post_json("/api/heir/coach", {"question": "How does a trust work?"})
        self.assertEqual(status, 200)
        self.assertIn("trust", result["text"].lower())
        self.assertIn("demo", result["mode"].lower())

    def test_bad_state_is_400(self):
        with self.assertRaises(HTTPError) as error:
            self.get_json("/api/heir/documents?state=Narnia")
        self.assertEqual(error.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
