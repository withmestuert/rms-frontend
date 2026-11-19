import urllib.request
import urllib.error
import json
import time

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

print("--- 1. Fetching invoices to test with ---")
status, invoices = get(f"{BASE_URL}/api/invoices")
print(f"Status: {status}, Total invoices: {len(invoices)}")
assert status == 200 and len(invoices) > 0, "No invoices found!"

# Find a pending invoice
pending_inv = None
for inv in invoices:
    if inv.get('status') in ['PENDING', 'PARTIALLY_PAID', 'pending', 'partially_paid']:
        pending_inv = inv
        break

if not pending_inv:
    print("No pending invoice found, using first invoice:", invoices[0]['invoiceNumber'])
    pending_inv = invoices[0]

inv_num = pending_inv['invoiceNumber']
print(f"Selected Invoice: {inv_num}, Amount: {pending_inv.get('amount')}, Status: {pending_inv.get('status')}")

print("\n--- 2. Testing Public Invoice Lookup (No Auth Required) ---")
status, pub_inv = get(f"{BASE_URL}/api/public/invoices/{inv_num}")
print(f"Public Invoice Response ({status}):")
print(json.dumps(pub_inv, indent=2))
assert status == 200
assert pub_inv['invoiceNumber'] == inv_num
assert pub_inv['tenantName']
assert 'pendingAmount' in pub_inv

print("\n--- 3. Testing Razorpay Order Creation ---")
order_payload = {
    "invoiceNumber": inv_num,
    "amount": pub_inv['pendingAmount']
}
status, order_res = post(f"{BASE_URL}/api/payments/razorpay/create-order", order_payload)
print(f"Razorpay Create Order Response ({status}):")
print(json.dumps(order_res, indent=2))
assert status == 201
assert 'orderId' in order_res
assert order_res['orderId'].startswith('order_')
assert order_res['amountInPaise'] == pub_inv['pendingAmount'] * 100

order_id = order_res['orderId']
sim_payment_id = f"pay_test_{int(time.time())}"
sim_signature = f"sim_sig_{int(time.time())}"

print("\n--- 4. Testing Razorpay Payment Verification & Settlement ---")
verify_payload = {
    "orderId": order_id,
    "paymentId": sim_payment_id,
    "signature": sim_signature,
    "paymentMethod": "UPI",
    "vpa": "tenant@upi"
}
status, verify_res = post(f"{BASE_URL}/api/payments/razorpay/verify-payment", verify_payload)
print(f"Payment Verification & Settlement Response ({status}):")
print(json.dumps(verify_res, indent=2))
assert status == 200
assert verify_res['status'] == 'SUCCESS'
assert verify_res['amount'] == pub_inv['pendingAmount']

print("\n--- 5. Verifying Invoice Status Post-Payment ---")
status, updated_inv = get(f"{BASE_URL}/api/public/invoices/{inv_num}")
print(f"Updated Invoice Status: {updated_inv['status']}, Paid Amount: {updated_inv['paidAmount']}, Pending: {updated_inv['pendingAmount']}")
assert updated_inv['status'] == 'PAID'
assert updated_inv['pendingAmount'] == 0

print("\n--- 6. Testing Idempotency (Re-verifying same payment) ---")
status, re_verify = post(f"{BASE_URL}/api/payments/razorpay/verify-payment", verify_payload)
print(f"Re-verify Response ({status}): Status = {re_verify.get('status')}")
assert status == 200

print("\n--- 7. Testing Overpayment / Paid Invoice Protection on Create Order ---" )
status, err_res = post(f"{BASE_URL}/api/payments/razorpay/create-order", {"invoiceNumber": inv_num})
print(f"Create Order on Paid Invoice ({status}): {err_res}")
assert status in [400, 409]

print("\n--- 8. Testing Razorpay Webhook Callback ---")
webhook_payload = {
    "entity": "event",
    "account_id": "acc_test",
    "event": "payment.captured",
    "contains": ["payment"],
    "payload": {
        "payment": {
            "entity": {
                "id": f"pay_hook_{int(time.time())}",
                "entity": "payment",
                "amount": 750000,
                "currency": "INR",
                "status": "captured",
                "order_id": order_id,
                "method": "upi",
                "vpa": "webhook_tenant@upi"
            }
        }
    }
}
webhook_raw = json.dumps(webhook_payload)
req = urllib.request.Request(
    f"{BASE_URL}/api/payments/razorpay/webhook",
    data=webhook_raw.encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'sim_sig_webhook_test'
    },
    method='POST'
)
with urllib.request.urlopen(req) as resp:
    hook_code = resp.getcode()
    hook_body = resp.read().decode('utf-8')
    print(f"Webhook Callback Response ({hook_code}): {hook_body}")
    assert hook_code == 200

print("\n==========================================")
print("ALL RAZORPAY GATEWAY BACKEND TESTS PASSED (8/8)!")
print("==========================================")

