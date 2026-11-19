import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8080"

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def put(url, data, headers=None):
    h = {'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=h, method='PUT')
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def post(url, data=None, headers=None):
    h = {'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    payload = json.dumps(data).encode('utf-8') if data is not None else b''
    req = urllib.request.Request(url, data=payload, headers=h, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode(), json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print("==================================================================")
print("TESTING AUTOMATED RENT REMINDER CRON SCHEDULER & DISPATCH PIPELINE")
print("==================================================================")

# 1. Test fetching initial scheduler config
print("\n--- 1. Testing GET /api/notifications/reminders/scheduler/config ---")
status, config = get(f"{BASE_URL}/api/notifications/reminders/scheduler/config")
print(f"Config Status ({status}):", json.dumps(config, indent=2))
assert status == 200
assert config["id"] == 1
assert "enabled" in config
assert "morningTime" in config
assert "targetCategories" in config
assert "cooldownHours" in config

# 2. Test updating scheduler config
print("\n--- 2. Testing PUT /api/notifications/reminders/scheduler/config ---")
update_payload = {
    "enabled": True,
    "morningTime": "10:00",
    "targetCategories": ["DUE_TODAY", "OVERDUE_URGENT", "FINAL_NOTICE"],
    "channel": "WHATSAPP",
    "cooldownHours": 24
}
status, updated = put(f"{BASE_URL}/api/notifications/reminders/scheduler/config", update_payload)
print(f"Update Result ({status}):", json.dumps(updated, indent=2))
assert status == 200
assert updated["morningTime"] == "10:00"
assert updated["cooldownHours"] == 24
assert "DUE_TODAY" in updated["targetCategories"]

# 3. Trigger manual scheduler run
print("\n--- 3. Testing POST /api/notifications/reminders/scheduler/trigger ---")
status, run_result = post(f"{BASE_URL}/api/notifications/reminders/scheduler/trigger")
print(f"Run Result 1 ({status}):", json.dumps(run_result, indent=2))
assert status == 200
assert run_result["status"] == "SUCCESS"
assert "invoicesEvaluated" in run_result
assert "remindersDispatched" in run_result
assert "remindersSkipped" in run_result

# 4. Trigger second scheduler run immediately to test Anti-Spam Cooldown Guard
print("\n--- 4. Testing Anti-Spam 24h Cooldown Throttling (Immediate Re-trigger) ---")
status, run_result2 = post(f"{BASE_URL}/api/notifications/reminders/scheduler/trigger")
print(f"Run Result 2 ({status}):", json.dumps(run_result2, indent=2))
assert status == 200
assert run_result2["status"] == "SUCCESS"
assert run_result2["remindersDispatched"] == 0, "Expected 0 duplicate dispatched in immediate rerun!"
print("Anti-spam protection verified: All candidate invoices were protected by the 24h cooldown!")

# 5. Test fetching scheduler runs history audit logs
print("\n--- 5. Testing GET /api/notifications/reminders/scheduler/runs ---")
status, runs = get(f"{BASE_URL}/api/notifications/reminders/scheduler/runs?limit=10")
print(f"Runs History Status ({status}), Total recorded runs: {len(runs)}")
assert status == 200
assert len(runs) >= 2, "Expected at least 2 recorded runs in audit table"
latest = runs[0]
print("Latest Recorded Run:")
print(f"  Run ID: {latest['id']}")
print(f"  Triggered By: {latest['triggeredBy']}")
print(f"  Status: {latest['status']}")
print(f"  Evaluated: {latest['invoicesEvaluated']}")
print(f"  Dispatched: {latest['remindersDispatched']}")
print(f"  Skipped: {latest['remindersSkipped']}")
print(f"  Notes: {latest['summaryNotes']}")
assert latest["status"] == "SUCCESS"

print("\n=======================================================")
print("ALL AUTOMATED SCHEDULER TESTS PASSED SUCCESSFULLY (5/5)!")
print("=======================================================")
