import { Routes, Route, Navigate } from "react-router-dom";

import { DashboardView } from "../components/dashboard/DashboardView";
import { TenantsView } from "../components/tenants/TenantsView";
import { AdmissionsView } from "../components/admissions/AdmissionsView";
import { RoomsView } from "../components/rooms/RoomsView";
import { RentBillingView } from "../components/finance/RentBillingView";
import { LedgerView } from "../components/finance/LedgerView";
import { ReportsView } from "../components/reports/ReportsView";
import { SettingsView } from "../components/settings/SettingsView";

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/tenants" element={<TenantsView />} />
            <Route path="/admissions" element={<AdmissionsView />} />
            <Route path="/rooms" element={<RoomsView />} />

            <Route path="/finance/rent" element={<RentBillingView />} />
            <Route path="/finance/ledger" element={<LedgerView />} />

            <Route path="/reports" element={<ReportsView />} />
            <Route path="/settings" element={<SettingsView />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}