import urllib.request
import json
import sys

BASE_URL = "http://localhost:8080/api"

def make_req(endpoint, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{endpoint}"
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            resp_body = response.read().decode("utf-8")
            try:
                res_json = json.loads(resp_body) if resp_body else None
            except:
                res_json = resp_body
            return status, res_json
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(resp_body)
        except:
            err_json = resp_body
        return e.code, err_json
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("VACATE REQUEST FLOW LIVE INTEGRATION TEST SUITE")
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

    # 1. Check GET /api/vacate-requests with X-Property-Id header
    status, vr_list = make_req("/vacate-requests", headers={"X-Property-Id": "1"})
    assert_true("1. GET /vacate-requests returns 200", status == 200, f"status={status}")
    assert_true("1.1 Vacate requests list returned as array", isinstance(vr_list, list), f"type={type(vr_list)}")

    # 2. Get active rooms & beds to create a dedicated test tenant
    status, rooms = make_req("/rooms", headers={"X-Property-Id": "1"})
    target_room = None
    target_bed = None
    for r in rooms:
        r_no = r.get("roomNo")
        if not r_no:
            continue
        status, beds = make_req(f"/rooms/{r_no}/beds", headers={"X-Property-Id": "1"})
        if not isinstance(beds, list):
            continue
        for b in beds:
            if b.get("status") == "AVAILABLE":
                target_room = r
                target_bed = b
                break
        if target_bed:
            break

    assert_true("2. Found an AVAILABLE bed for test resident", target_bed is not None, f"bed={target_bed}")
    if not target_bed:
        print("Cannot proceed with tenant creation without an available bed.")
        return

    init_occupancy = target_room.get("currentOccupancy", 0)
    import time
    ts_suffix = str(int(time.time()))[-8:]
    test_mobile = f"98{ts_suffix}"
    test_aadhaar = f"99{ts_suffix}12"
    tenant_name = f"Vacate Tester {ts_suffix}"
    room_no = target_room.get("roomNo")
    bed_id = target_bed.get("id")
    property_id = 1

    # 3. Create Tenant + Admission
    tenant_payload = {
        "name": tenant_name,
        "mobileNumber": test_mobile,
        "aadhaarNo": test_aadhaar,
        "tenantType": "WORKING",
        "organizationName": "RMS Solutions",
        "roomNo": room_no,
        "bedId": bed_id,
        "propertyId": property_id,
        "advancePaid": 10000,
        "standardRent": 7000,
        "status": "ACTIVE"
    }
    status, created_tenant = make_req("/tenants", method="POST", data=tenant_payload, headers={"X-Property-Id": "1"})
    assert_true("3. POST /tenants creates resident", status in [200, 201], f"status={status}, resp={created_tenant}")
    tenant_uid = created_tenant.get("uid")

    admission_payload = {
        "tenantUid": tenant_uid,
        "roomNo": room_no,
        "propertyId": property_id,
        "bedId": bed_id,
        "enrollmentDate": "2026-10-01",
        "remarks": "Smoke testing flow"
    }
    status, created_admission = make_req("/admissions", method="POST", data=admission_payload, headers={"X-Property-Id": "1"})
    assert_true("3.1 POST /admissions creates admission", status in [200, 201], f"status={status}")
    admission_num = created_admission.get("admissionNumber")

    # Confirm admission to occupy the bed
    status, confirmed_adm = make_req(f"/admissions/{admission_num}/confirm", method="PUT", headers={"X-Property-Id": "1"})
    assert_true("3.2 PUT /admissions/{num}/confirm moves admission to PAID", status == 200, f"status={status}")

    # Verify bed is OCCUPIED
    status, bed_check = make_req(f"/rooms/{room_no}/beds", headers={"X-Property-Id": "1"})
    bed_after = next((b for b in bed_check if b["id"] == bed_id), None)
    assert_true("3.3 Target bed is now OCCUPIED", bed_after and bed_after.get("status") == "OCCUPIED", f"status={bed_after.get('status') if bed_after else None}")

    # 4. Submit Vacate Request (POST /api/vacate-requests)
    vacate_payload = {
        "tenantUid": tenant_uid,
        "tenantName": tenant_name,
        "mobileNumber": test_mobile,
        "aadhaarNo": test_aadhaar,
        "roomNo": room_no,
        "propertyId": property_id,
        "expectedLeavingDate": "2026-11-25", # >= 30 days notice
        "reason": "Relocating for work",
        "notes": "Testing notice calculation"
    }
    status, vacate_res = make_req("/vacate-requests", method="POST", data=vacate_payload, headers={"X-Property-Id": "1"})
    assert_true("4. POST /vacate-requests submits notice successfully", status in [200, 201], f"status={status}, res={vacate_res}")
    vacate_id = vacate_res.get("id") if isinstance(vacate_res, dict) else None
    assert_true("4.1 Vacate request status is PENDING", vacate_res.get("status") == "PENDING", f"status={vacate_res.get('status')}")
    assert_true("4.2 Advance paid matched tenant (10000.0)", vacate_res.get("advancePaid") == 10000.0, f"advancePaid={vacate_res.get('advancePaid')}")
    assert_true("4.3 Advance repayable full notice refund (10000.0)", vacate_res.get("advanceRepayable") == 10000.0, f"repayable={vacate_res.get('advanceRepayable')}")

    # 5. Attempt DUPLICATE submission while PENDING
    status, dup_res = make_req("/vacate-requests", method="POST", data=vacate_payload, headers={"X-Property-Id": "1"})
    assert_true("5. Duplicate vacate request yields HTTP 400 Bad Request", status == 400, f"status={status}, res={dup_res}")
    err_msg = dup_res.get("message", "") if isinstance(dup_res, dict) else str(dup_res)
    assert_true("5.1 Error message clearly states duplicate submission not allowed", "Duplicate submissions are not allowed" in err_msg or "already exists" in err_msg, f"err={err_msg}")

    # 6. Update Vacate Charges (PUT /api/vacate-requests/{id}/charges)
    charges_payload = {
        "breakageCharge": 500.0,
        "maintenanceCharge": 1000.0
    }
    status, charged_res = make_req(f"/vacate-requests/{vacate_id}/charges", method="PUT", data=charges_payload, headers={"X-Property-Id": "1"})
    assert_true("6. PUT /vacate-requests/{id}/charges returns 200", status == 200, f"status={status}, res={charged_res}")
    assert_true("6.1 Breakage charge updated to 500.0", charged_res.get("breakageCharge") == 500.0, f"breakage={charged_res.get('breakageCharge')}")
    assert_true("6.2 Maintenance charge updated to 1000.0", charged_res.get("maintenanceCharge") == 1000.0, f"maintenance={charged_res.get('maintenanceCharge')}")
    # 10000 - 500 - 1000 = 8500
    assert_true("6.3 Advance repayable correctly deducted (8500.0)", charged_res.get("advanceRepayable") == 8500.0, f"repayable={charged_res.get('advanceRepayable')}")

    # 7. Approve Vacate Request (PUT /api/vacate-requests/{id}/approve)
    status, approved_res = make_req(f"/vacate-requests/{vacate_id}/approve", method="PUT", headers={"X-Property-Id": "1"})
    assert_true("7. PUT /vacate-requests/{id}/approve returns 200", status == 200, f"status={status}, res={approved_res}")
    assert_true("7.1 Status changed to APPROVED", approved_res.get("status") == "APPROVED", f"status={approved_res.get('status')}")

    # 8. Complete Move-out (PUT /api/vacate-requests/{id}/complete)
    status, completed_res = make_req(f"/vacate-requests/{vacate_id}/complete", method="PUT", headers={"X-Property-Id": "1"})
    assert_true("8. PUT /vacate-requests/{id}/complete returns 200", status == 200, f"status={status}, res={completed_res}")
    assert_true("8.1 Request status changed to COMPLETED", completed_res.get("status") == "COMPLETED", f"status={completed_res.get('status')}")

    # 9. Verify System State Post-Complete
    # A. Tenant state
    status, t_check = make_req(f"/tenants/{tenant_uid}", headers={"X-Property-Id": "1"})
    assert_true("9.1 Tenant status is INACTIVE", t_check.get("status") == "INACTIVE", f"status={t_check.get('status')}")
    assert_true("9.2 Tenant bedId is null/released", t_check.get("bedId") is None, f"bedId={t_check.get('bedId')}")

    # B. Bed state
    status, beds_after = make_req(f"/rooms/{room_no}/beds", headers={"X-Property-Id": "1"})
    vacated_bed = next((b for b in beds_after if b["id"] == bed_id), None)
    assert_true("9.3 Bed status is released back to AVAILABLE", vacated_bed and vacated_bed.get("status") == "AVAILABLE", f"status={vacated_bed.get('status') if vacated_bed else None}")

    # C. Admission state
    status, admissions = make_req("/admissions", headers={"X-Property-Id": "1"})
    t_admissions = [a for a in admissions if a.get("tenantUid") == tenant_uid]
    assert_true("9.4 Admission is marked VACATED", any(a.get("status") == "VACATED" for a in t_admissions), f"admissions={t_admissions}")

    # D. Room occupancy decremented
    status, room_check = make_req(f"/rooms/{room_no}", headers={"X-Property-Id": "1"})
    assert_true("9.5 Room occupancy decremented back to original", room_check.get("currentOccupancy") == init_occupancy, f"occupancy={room_check.get('currentOccupancy')} vs init={init_occupancy}")

    print("=" * 70)
    print(f"RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
