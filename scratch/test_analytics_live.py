import urllib.request
import json
import sys

BASE_URL = "http://localhost:8080/api/reports"

def make_req(endpoint, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            content_type = response.headers.get("Content-Type", "")
            raw = response.read()
            if "csv" in content_type:
                return status, raw.decode("utf-8")
            else:
                body = raw.decode("utf-8")
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
    print("REPORTS, GENERATION & ANALYTICS MODULE LIVE INTEGRATION TEST")
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

    # 1. Executive KPIs
    status, kpis = make_req("/analytics/kpis", headers=headers)
    assert_true("1. GET /analytics/kpis returns 200", status == 200, f"status={status}")
    assert_true("1.1 KPIs contains totalBeds >= 0", isinstance(kpis, dict) and "totalBeds" in kpis, f"kpis={kpis}")
    assert_true("1.2 KPIs contains occupancyRate", "occupancyRate" in kpis, f"occupancyRate={kpis.get('occupancyRate')}")
    assert_true("1.3 KPIs contains RevPAB metrics", "potentialRevPab" in kpis and "realizedRevPab" in kpis, f"potential={kpis.get('potentialRevPab')}, realized={kpis.get('realizedRevPab')}")
    assert_true("1.4 KPIs contains monthlyLostRevenue", "monthlyLostRevenue" in kpis, f"lostRev={kpis.get('monthlyLostRevenue')}")
    print(f"     -> Total Beds: {kpis.get('totalBeds')}, Occupied: {kpis.get('occupiedBeds')}, Available: {kpis.get('availableBeds')}")
    print(f"     -> Occupancy: {kpis.get('occupancyRate')}%, RevPAB: Rs.{kpis.get('realizedRevPab')}/bed (Max: Rs.{kpis.get('potentialRevPab')}/bed)")
    print(f"     -> Collection Efficiency: {kpis.get('collectionEfficiency')}%, Lost Opportunity: Rs.{kpis.get('monthlyLostRevenue')}")

    # 2. Room Type Yields
    status, yields = make_req("/analytics/room-type-yield", headers=headers)
    assert_true("2. GET /analytics/room-type-yield returns 200", status == 200, f"status={status}")
    assert_true("2.1 Returns list of room type configurations", isinstance(yields, list), f"type={type(yields)}")
    if isinstance(yields, list) and yields:
        sample = yields[0]
        assert_true("2.2 Sample configuration contains RevPAB & yield fields", "revPab" in sample and "potentialRevenue" in sample, f"sample={sample}")
        print(f"     -> Configurations found: {len(yields)}")
        for y in yields[:3]:
            print(f"        * {y.get('roomType')}: {y.get('occupiedBeds')}/{y.get('totalBeds')} beds ({y.get('occupancyRate')}%), RevPAB: Rs.{y.get('revPab')}")
    else:
        assert_true("2.2 Sample configuration contains RevPAB & yield fields", False, f"yields={yields}")

    # 3. Revenue Trends
    status, trends = make_req("/analytics/revenue-trends?months=6", headers=headers)
    assert_true("3. GET /analytics/revenue-trends returns 200", status == 200, f"status={status}")
    assert_true("3.1 Revenue trends returned as array", isinstance(trends, list), f"type={type(trends)}")
    if isinstance(trends, list):
        print(f"     -> Monthly trends count: {len(trends)}")

    # 4. Defaulters Aging
    status, aging = make_req("/analytics/defaulters-aging", headers=headers)
    assert_true("4. GET /analytics/defaulters-aging returns 200", status == 200, f"status={status}")
    assert_true("4.1 Contains summary aging buckets", isinstance(aging, dict) and "summary" in aging, f"aging={aging}")
    summary = aging.get("summary", {})
    assert_true("4.2 Contains 4 aging categories (0-15d, 16-30d, 31-60d, 60+d)",
                all(k in summary for k in ["currentOverdue", "overdue16to30", "overdue31to60", "overdue60Plus"]),
                f"summary={summary}")
    assert_true("4.3 Defaulters item list returned", isinstance(aging.get("defaulters"), list), f"defaulters={aging.get('defaulters')}")
    print(f"     -> Total Defaulters: {summary.get('totalDefaultersCount')}, Overdue: Rs.{summary.get('totalOverdueAmount')}")

    # 5. Security Deposits & Custody (Internal page data)
    status, deposits = make_req("/analytics/deposits-custody", headers=headers)
    assert_true("5. GET /analytics/deposits-custody returns 200", status == 200, f"status={status}")
    assert_true("5.1 Contains totalDepositsHeld & pendingRefundLiability",
                "totalDepositsHeld" in deposits and "pendingRefundLiability" in deposits, f"deposits={deposits}")
    assert_true("5.2 Net Retained Deposits calculated", "netRetainedDeposits" in deposits, f"net={deposits.get('netRetainedDeposits')}")
    assert_true("5.3 Resident deposits list returned", isinstance(deposits.get("deposits"), list), f"list={deposits.get('deposits')}")
    print(f"     -> Custody Total: Rs.{deposits.get('totalDepositsHeld')}, Refund Liability: Rs.{deposits.get('pendingRefundLiability')}, Net Capital: Rs.{deposits.get('netRetainedDeposits')}")

    # 6. Turnover Analytics
    status, turnover = make_req("/analytics/turnover", headers=headers)
    assert_true("6. GET /analytics/turnover returns 200", status == 200, f"status={status}")
    assert_true("6.1 Contains retention rate & stay duration", "retentionRate" in turnover and "averageStayDurationMonths" in turnover, f"turnover={turnover}")
    print(f"     -> Retention Rate: {turnover.get('retentionRate')}%, Avg Stay: {turnover.get('averageStayDurationMonths')} mos")

    # 7. CSV Exports (Rent Roll, Defaulters, Deposits, Financial Ledger)
    status, rent_roll_csv = make_req("/export/rent-roll", headers=headers)
    preview = rent_roll_csv[:100] if isinstance(rent_roll_csv, str) else str(rent_roll_csv)
    assert_true("7.1 GET /export/rent-roll streams CSV with header", status == 200 and isinstance(rent_roll_csv, str) and "Tenant UID" in rent_roll_csv, f"status={status}, preview={preview}")

    status, defaulters_csv = make_req("/export/defaulters", headers=headers)
    preview = defaulters_csv[:100] if isinstance(defaulters_csv, str) else str(defaulters_csv)
    assert_true("7.2 GET /export/defaulters streams CSV with header", status == 200 and isinstance(defaulters_csv, str) and "Invoice No" in defaulters_csv, f"status={status}, preview={preview}")

    status, deposits_csv = make_req("/export/deposits", headers=headers)
    preview = deposits_csv[:100] if isinstance(deposits_csv, str) else str(deposits_csv)
    assert_true("7.3 GET /export/deposits streams CSV with header", status == 200 and isinstance(deposits_csv, str) and "Deposit Held" in deposits_csv, f"status={status}, preview={preview}")

    status, ledger_csv = make_req("/export/ledger", headers=headers)
    preview = ledger_csv[:100] if isinstance(ledger_csv, str) else str(ledger_csv)
    assert_true("7.4 GET /export/ledger streams CSV with header", status == 200 and isinstance(ledger_csv, str) and "Running Balance" in ledger_csv, f"status={status}, preview={preview}")

    print("=" * 70)
    print(f"RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
