import urllib.request
import json
import sys

BASE_URL = "http://localhost:8080/api/invoices"

def make_req(endpoint, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode("utf-8")
            try:
                return status, json.loads(body)
            except:
                return status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("TENANT MONTHLY PAY LIST TABLE LOOKUP LIVE INTEGRATION TEST")
    print("=" * 70)
    passed = 0
    total = 0

    def assert_true(desc, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"[PASS] {desc}")
        else:
            print(f"[FAIL] {desc} - {details}")

    headers = {"X-Property-Id": "1"}

    # 1. Test GET /api/invoices/tenant-monthly-ledger
    status, ledger = make_req("/tenant-monthly-ledger", headers=headers)
    assert_true("1. GET /tenant-monthly-ledger returns 200", status == 200, f"status={status}")
    assert_true("1.1 Response is a list of monthly statements", isinstance(ledger, list), f"type={type(ledger)}")

    if ledger:
        sample = ledger[0]
        assert_true("1.2 Contains tenantName", "tenantName" in sample and sample["tenantName"] is not None, f"sample={sample}")
        assert_true("1.3 Contains roomNo", "roomNo" in sample and sample["roomNo"] is not None, f"sample={sample}")
        assert_true("1.4 Contains monthYear", "monthYear" in sample and sample["monthYear"] is not None, f"sample={sample}")
        assert_true("1.5 Contains paidOn", "paidOn" in sample, f"sample={sample}")
        assert_true("1.6 Contains pendingAmount", "pendingAmount" in sample, f"sample={sample}")
        assert_true("1.7 Contains paymentMode", "paymentMode" in sample, f"sample={sample}")
        assert_true("1.8 Contains upiDetails field", "upiDetails" in sample, f"sample={sample}")

        print(f"\n[INFO] Sample Record Preview:")
        print(f"       Tenant Name  : {sample.get('tenantName')}")
        print(f"       Room No      : {sample.get('roomNo')} ({sample.get('bedNumber')})")
        print(f"       Month        : {sample.get('monthYear')}")
        print(f"       Paid On      : {sample.get('paidOn')}")
        print(f"       Billed       : Rs. {sample.get('billedAmount')}")
        print(f"       Paid         : Rs. {sample.get('paidAmount')}")
        print(f"       Pending      : Rs. {sample.get('pendingAmount')}")
        print(f"       Paid Through : {sample.get('paymentMode')}")
        print(f"       UPI Details  : {sample.get('upiDetails') or '-'}")
        print(f"       Status       : {sample.get('status')}\n")

        # 2. Test Search by Tenant Name
        search_query = sample["tenantName"][:4]
        status, search_res = make_req(f"/tenant-monthly-ledger?search={urllib.parse.quote(search_query)}", headers=headers)
        assert_true(f"2. Search by tenant query '{search_query}' returns 200", status == 200, f"status={status}")
        assert_true("2.1 Search results match query", any(search_query.lower() in (item.get("tenantName") or "").lower() for item in search_res), f"results={search_res}")

        # 3. Test Filter by Month
        month_q = sample["monthYear"]
        status, month_res = make_req(f"/tenant-monthly-ledger?monthYear={urllib.parse.quote(month_q)}", headers=headers)
        assert_true(f"3. Filter by month '{month_q}' returns 200", status == 200, f"status={status}")
        assert_true("3.1 Month results match", all(item.get("monthYear") == month_q for item in month_res), f"results={month_res}")

    print("=" * 70)
    print(f"RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
