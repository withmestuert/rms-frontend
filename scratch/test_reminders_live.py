import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8080"

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def post(url, data, headers=None):
    h = {'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=h, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode(), json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

print("--- 1. Testing Reminder Stats KPI Endpoint ---")
status, stats = get(f"{BASE_URL}/api/notifications/reminders/stats")
print(f"Stats ({status}):", json.dumps(stats, indent=2))
assert status == 200
assert 'totalPendingInvoices' in stats
assert 'dueTodayCount' in stats

print("\n--- 2. Testing Reminder Queue Fetch ---")
status, queue = get(f"{BASE_URL}/api/notifications/reminders/queue")
print(f"Queue Status: {status}, Total Invoices in Queue: {len(queue)}")
assert status == 200
assert len(queue) > 0, "Expected at least 1 invoice in reminder queue"

first = queue[0]
print("Sample Queue Item:")
print(f"  Invoice: {first['invoiceNumber']}")
print(f"  Tenant: {first['tenantName']} ({first['mobileNumber']})")
print(f"  Room: {first['roomNo']}, Month: {first['monthYear']}")
print(f"  Pending: Rs.{first['pendingAmount']}")
print(f"  Category: {first['reminderType']} (Days offset: {first['daysOffset']})")
print(f"  Payment Link: {first['paymentLink']}")
print(f"  WhatsApp Click-to-Chat URL: {first['clickToChatUrl'][:80]}...")
assert first['paymentLink'].startswith('http')
assert '/pay/' in first['paymentLink']
assert first['formattedWhatsAppMessage']

print("\n--- 3. Testing Single & Bulk Reminder Dispatch ---")
dispatch_ids = [queue[0]['invoiceId']]
if len(queue) > 1:
    dispatch_ids.append(queue[1]['invoiceId'])

send_payload = {
    "invoiceIds": dispatch_ids,
    "channel": "WHATSAPP"
}
status, send_result = post(f"{BASE_URL}/api/notifications/reminders/send", send_payload)
print(f"Dispatch Result ({status}):", json.dumps(send_result, indent=2))
assert status == 200
assert send_result['successCount'] == len(dispatch_ids)
assert len(send_result['dispatchedInvoiceNumbers']) == len(dispatch_ids)

print("\n--- 4. Testing Audit History Logs ---")
status, logs = get(f"{BASE_URL}/api/notifications/reminders/logs")
print(f"Audit Logs Count: {len(logs)}")
assert status == 200
assert len(logs) >= len(dispatch_ids)

latest_log = logs[0]
print("Latest Log Entry:")
print(f"  Invoice No: {latest_log.get('invoiceNumber')}")
print(f"  Tenant: {latest_log.get('tenantName')}")
print(f"  Channel: {latest_log.get('channel')}")
print(f"  Status: {latest_log.get('status')}")
print(f"  Amount Due: Rs.{latest_log.get('amountDue')}")
print(f"  Sent At: {latest_log.get('sentAt')}")
assert latest_log.get('status') == 'SENT'

print("\n--- 5. Verifying Stats Updated Post-Dispatch ---")
status, updated_stats = get(f"{BASE_URL}/api/notifications/reminders/stats")
print(f"Reminders Sent Today: {updated_stats['remindersSentToday']}, Total Logged: {updated_stats['totalRemindersLogged']}")
assert updated_stats['remindersSentToday'] >= len(dispatch_ids)

print("\n=============================================")
print("ALL RENT REMINDER BACKEND TESTS PASSED (5/5)!")
print("=============================================")
