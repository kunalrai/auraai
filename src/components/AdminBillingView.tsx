import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Download, Shield, Loader2 } from 'lucide-react';

function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

interface UsageRow {
  doctorId: string;
  billingPeriod: string;
  smsSent: number;
  callsMade: number;
  tokenPrompt: number;
  tokenCompletion: number;
  tokenTotal: number;
  lastUpdatedAt: number;
  stripeReportedAt?: number;
}

export default function AdminBillingView() {
  const [selectedPeriod, setSelectedPeriod] = useState(getLast12Months()[0]);
  const [loading] = useState(false);
  const adminUid = (import.meta as any).env?.VITE_ADMIN_UID ?? "";
  const authStatus = useQuery(api.doctors.authStatus);
  const isAdmin = authStatus?.userId === adminUid;

  const usageData = useQuery(api.billing.getAllDoctorUsage, { billingPeriod: selectedPeriod });

  const totals = usageData ? usageData.reduce((acc: { sms: number; calls: number; tokens: number }, row: UsageRow) => ({
    sms: acc.sms + row.smsSent,
    calls: acc.calls + row.callsMade,
    tokens: acc.tokens + row.tokenTotal,
  }), { sms: 0, calls: 0, tokens: 0 }) : null;

  const downloadCsv = () => {
    if (!usageData) return;
    const headers = ["Doctor ID", "SMS Sent", "Calls Made", "AI Tokens", "Stripe Status"];
    const rows = usageData.map((row: UsageRow) => [
      row.doctorId,
      row.smsSent,
      row.callsMade,
      row.tokenTotal,
      row.stripeReportedAt ? "Reported" : "Pending",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-display font-bold tracking-tight gradient-text">Admin Billing</h2>
          <p className="text-muted-foreground mt-1">Usage across all doctors — {selectedPeriod}</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="bg-white/5 border border-border rounded-xl px-4 py-2 text-foreground text-sm focus:outline-none focus:border-blue-500/50"
          >
            {getLast12Months().map(m => (
              <option key={m} value={m} className="bg-[#0a0a14]">{m}</option>
            ))}
          </select>
          <button
            onClick={downloadCsv}
            disabled={!usageData || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </header>

      {usageData === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{totals?.sms ?? 0}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Total SMS Sent</p>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{totals?.calls ?? 0}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Total Calls Made</p>
            </div>
            <div className="glass-card p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{(totals?.tokens ?? 0).toLocaleString()}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Total AI Tokens</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground p-4 font-bold">Doctor ID</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground p-4 font-bold">SMS Sent</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground p-4 font-bold">Calls Made</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground p-4 font-bold">AI Tokens</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground p-4 font-bold">Stripe Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {usageData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">No usage data for this period.</td>
                  </tr>
                ) : usageData.map((row: UsageRow) => (
                  <tr key={row.doctorId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-foreground font-mono text-xs">{row.doctorId}</td>
                    <td className="p-4 text-right text-muted-foreground">{row.smsSent}</td>
                    <td className="p-4 text-right text-muted-foreground">{row.callsMade}</td>
                    <td className="p-4 text-right text-foreground font-bold">{row.tokenTotal.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.stripeReportedAt ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {row.stripeReportedAt ? "Reported" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
