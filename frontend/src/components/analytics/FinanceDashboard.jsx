import { useEffect, useMemo, useState } from "react";
import { addExpense, getRevenueSummary, listExpenses } from "../../services/analyticsService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function FinanceDashboard({ eventId, event }) {
  const [revenueData, setRevenueData] = useState(null);
  const [expenseData, setExpenseData] = useState({ items: [], totalExpenses: 0 });
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "Stage",
    amount: "",
    spent_at: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const load = async () => {
    try {
      setErr("");
      const rev = await getRevenueSummary(eventId);
      const exp = await listExpenses(eventId);
      setRevenueData(rev);
      setExpenseData(exp || { items: [], totalExpenses: 0 });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load finance");
      setRevenueData(null);
      setExpenseData({ items: [], totalExpenses: 0 });
    }
  };

  useEffect(() => {
    if (!eventId) return;
    load();
  }, [eventId]);

  const revenue = useMemo(() => revenueData || {}, [revenueData]);
  const revByDay = Array.isArray(revenue.revenueByDay) ? revenue.revenueByDay : [];
  const expenses = Array.isArray(expenseData?.items) ? expenseData.items : [];
  const totalExpenses = Number(expenseData?.totalExpenses || 0);

  const submitExpense = async (e) => {
    e.preventDefault();

    try {
      setErr("");
      await addExpense(eventId, {
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        spent_at: form.spent_at,
        notes: form.notes,
      });

      setForm((p) => ({
        ...p,
        title: "",
        amount: "",
        notes: "",
      }));

      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Failed to add expense");
    }
  };

  return (
    <div className="anGrid">
      <div className="anCard">
        <div className="anCardHead">
          <div className="anCardTitle">Revenue & Expenses</div>
          <div className="anCardMeta">
            Event: <b>{event?.title || "-"}</b>
          </div>
        </div>

        {err && <div className="anErr">{err}</div>}

        <div className="anKpis">
          <div className="anKpi">
            <div className="anKpiLabel">Revenue</div>
            <div className="anKpiValue">₹{Number(revenue.revenue || 0).toFixed(2)}</div>
          </div>

          <div className="anKpi">
            <div className="anKpiLabel">Expenses</div>
            <div className="anKpiValue">₹{Number(totalExpenses).toFixed(2)}</div>
          </div>
        </div>

        <div className="anCharts">
          <div className="anChart">
            <div className="anChartTitle">Revenue by Day</div>
            <div className="anChartBox">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revByDay}>
                  <XAxis dataKey="day" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="anNote">
          Revenue comes from <b>payments</b> with status <b>PAID</b>. Expenses come from <b>event_expenses</b>.
        </div>
      </div>

      <div className="anCard">
        <div className="anCardHead">
          <div className="anCardTitle">Add Expense</div>
          <div className="anCardMeta">Track event spending</div>
        </div>

        <form className="anForm" onSubmit={submitExpense}>
          <input
            className="anInput"
            placeholder="Expense title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />

          <select
            className="anInput"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          >
            <option>Stage</option>
            <option>Food</option>
            <option>Security</option>
            <option>Decor</option>
            <option>Marketing</option>
            <option>Misc</option>
          </select>

          <input
            className="anInput"
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            required
          />

          <input
            className="anInput"
            type="date"
            value={form.spent_at}
            onChange={(e) => setForm((p) => ({ ...p, spent_at: e.target.value }))}
            required
          />

          <input
            className="anInput"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />

          <button className="anBtn" type="submit">
            + Add Expense
          </button>
        </form>

        <div className="anList">
          {expenses.map((x) => (
            <div key={x.id} className="anRow">
              <div>
                <div className="anRowTitle">{x.title}</div>
                <div className="anRowMeta">
                  {x.category} • {String(x.spent_at || "").slice(0, 10)}
                </div>
              </div>
              <div className="anRowAmt">₹{Number(x.amount).toFixed(2)}</div>
            </div>
          ))}

          {!expenses.length ? <div className="anEmpty">No expenses added yet.</div> : null}
        </div>
      </div>
    </div>
  );
}