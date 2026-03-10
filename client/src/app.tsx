import { useEffect, useState } from "react";
import type { AppMetaResponse } from "@budget/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const navItems = ["Dashboard", "Spending", "Budgets", "Settings"] as const;
const settingsItems = ["Configurations", "Merchants", "Uploads"] as const;

const dashboardCategories = [
  { name: "Groceries", amount: 612.13, percentage: 31, tone: "green" },
  { name: "Housing", amount: 940, percentage: 47, tone: "slate" },
  { name: "Dining", amount: 218.54, percentage: 11, tone: "gold" },
  { name: "Transportation", amount: 169.9, percentage: 8, tone: "blue" }
] as const;

type BudgetRow = {
  name: string;
  spent: number;
  limit: number | null;
  locked?: true;
  tone: "green" | "slate" | "gold" | "blue";
};

const budgetRows: BudgetRow[] = [
  { name: "Total", spent: 1940.57, limit: 2600, locked: true, tone: "slate" },
  { name: "Housing", spent: 940, limit: 1100, tone: "slate" },
  { name: "Groceries", spent: 612.13, limit: 700, tone: "green" },
  { name: "Dining", spent: 218.54, limit: 250, tone: "gold" },
  { name: "Transportation", spent: 169.9, limit: 220, tone: "blue" },
  { name: "Savings", spent: 0, limit: 330, tone: "green" },
  { name: "Income", spent: 4250, limit: null, locked: true, tone: "green" },
  { name: "Credits/Payments", spent: 411.22, limit: null, locked: true, tone: "blue" }
] as const;

const transactionRows = [
  {
    date: "03/09/2026",
    merchant: "KROGER 421 ATLANTA GA",
    category: "Groceries",
    config: "Chase CSV",
    amount: "82.41"
  },
  {
    date: "03/08/2026",
    merchant: "GEORGIA POWER",
    category: "Bills & Utilities",
    config: "Chase CSV",
    amount: "118.67"
  },
  {
    date: "03/08/2026",
    merchant: "UBER TRIP HELP.UBER.COM",
    category: "Transportation",
    config: "Amex CSV",
    amount: "24.10"
  },
  {
    date: "03/07/2026",
    merchant: "DIRECT DEP PAYROLL",
    category: "Income",
    config: "Chase CSV",
    amount: "-2125.00"
  },
  {
    date: "03/06/2026",
    merchant: "NETFLIX.COM",
    category: "Entertainment",
    config: "Amex CSV",
    amount: "15.49"
  }
] as const;

const spendingColumns = [
  { month: "Jan", housing: 1100, groceries: 540, dining: 210, transport: 148, total: 1998 },
  { month: "Feb", housing: 1100, groceries: 601, dining: 196, transport: 165, total: 2062 },
  { month: "Mar", housing: 940, groceries: 612, dining: 219, transport: 170, total: 1941 },
  { month: "Total", housing: 3140, groceries: 1753, dining: 625, transport: 483, total: 6001 }
] as const;

type NavItem = (typeof navItems)[number];
type SettingsItem = (typeof settingsItems)[number];
type DbHealthResponse = {
  ok: boolean;
  provider: string;
  error?: string;
};

export function App() {
  const [meta, setMeta] = useState<AppMetaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthResponse | null>(null);
  const [activePage, setActivePage] = useState<NavItem>("Dashboard");
  const [activeSetting, setActiveSetting] = useState<SettingsItem>("Configurations");

  useEffect(() => {
    let active = true;

    async function loadApiState() {
      try {
        const [metaResponse, dbResponse] = await Promise.all([
          fetch(`${API_URL}/api/meta`),
          fetch(`${API_URL}/api/db/health`)
        ]);

        if (!metaResponse.ok) {
          throw new Error(`Meta request failed with ${metaResponse.status}`);
        }

        const metaPayload = (await metaResponse.json()) as AppMetaResponse;
        const dbPayload = (await dbResponse.json()) as DbHealthResponse;

        if (active) {
          setMeta(metaPayload);
          setDbHealth(dbPayload);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    void loadApiState();

    return () => {
      active = false;
    };
  }, []);

  const renderDashboard = () => (
    <>
      <section className="stats-row">
        <article className="card spending-card">
          <p className="card-label">March Spending</p>
          <h1>$1,940.57</h1>
          <p className="subtle">Large green total, soft border, compact copy. This mirrors the original dashboard emphasis.</p>
        </article>

        <article className="card categories-card">
          <div className="card-heading">
            <h2>Categorical Spending</h2>
            <button className="ghost-button">Show More</button>
          </div>
          <div className="category-list">
            {dashboardCategories.map((category) => (
              <div key={category.name} className="category-row">
                <div className="category-copy">
                  <span>{category.name}</span>
                  <strong>${category.amount.toFixed(2)}</strong>
                </div>
                <div className={`progress-track tone-${category.tone}`}>
                  <div className="progress-fill" style={{ width: `${category.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card table-card">
        <div className="card-heading">
          <div className="section-title">
            <h2>Transactions</h2>
            <div className="chip-row">
              <span className="filter-chip">Date: 03/01 to 03/31</span>
              <span className="filter-chip">Category: Groceries</span>
            </div>
          </div>
          <div className="button-row">
            <button className="ghost-button">Show Filters</button>
            <button className="primary-button">Upload</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Configuration</th>
                <th className="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactionRows.map((row) => (
                <tr key={`${row.date}-${row.merchant}`}>
                  <td>{row.date}</td>
                  <td>{row.merchant}</td>
                  <td>
                    <span className="pill">{row.category}</span>
                  </td>
                  <td>{row.config}</td>
                  <td className="amount">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderSpending = () => (
    <section className="card">
      <div className="card-heading">
        <h2>Spending</h2>
        <button className="ghost-button">2026</button>
      </div>
      <div className="matrix">
        <div className="matrix-column matrix-labels">
          <div className="matrix-cell matrix-head">Category</div>
          <div className="matrix-cell">Housing</div>
          <div className="matrix-cell">Groceries</div>
          <div className="matrix-cell">Dining</div>
          <div className="matrix-cell">Transportation</div>
          <div className="matrix-cell matrix-total">Total</div>
          <div className="matrix-cell secondary">Income</div>
          <div className="matrix-cell secondary">Credits/Payments</div>
        </div>

        {spendingColumns.map((column) => (
          <div key={column.month} className="matrix-column">
            <div className="matrix-cell matrix-head">{column.month}</div>
            <div className="matrix-cell">{column.housing.toFixed(2)}</div>
            <div className="matrix-cell">{column.groceries.toFixed(2)}</div>
            <div className="matrix-cell">{column.dining.toFixed(2)}</div>
            <div className="matrix-cell">{column.transport.toFixed(2)}</div>
            <div className="matrix-cell matrix-total">{column.total.toFixed(2)}</div>
            <div className="matrix-cell secondary">4250.00</div>
            <div className="matrix-cell secondary">411.22</div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderBudgets = () => (
    <section className="card">
      <div className="card-heading">
        <h2>Budgets</h2>
        <div className="button-row">
          <button className="ghost-button">Edit</button>
          <button className="primary-button">Save</button>
        </div>
      </div>

      <div className="budget-list">
        {budgetRows.map((budget) => {
          const percentage = budget.limit ? Math.min(100, (budget.spent / budget.limit) * 100) : 0;
          return (
            <article key={budget.name} className="budget-card">
              <div className="budget-header">
                <span className={`pill tone-${budget.tone}`}>{budget.name}</span>
                <strong>
                  ${budget.spent.toFixed(2)}
                  {budget.limit !== null ? ` spent out of $${budget.limit.toFixed(2)}` : " total"}
                </strong>
              </div>
              <div className={`progress-track tone-${budget.tone}`}>
                <div className="progress-fill" style={{ width: `${percentage}%` }} />
              </div>
              {budget.locked ? <p className="subtle">Locked special category row</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );

  const renderSettings = () => (
    <section className="settings-layout">
      <aside className="card settings-nav">
        <h2>Settings</h2>
        <div className="settings-links">
          {settingsItems.map((item) => (
            <button
              key={item}
              className={`settings-link ${item === activeSetting ? "active" : ""}`}
              onClick={() => setActiveSetting(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <section className="card settings-panel">
        {activeSetting === "Configurations" ? (
          <>
            <div className="card-heading">
              <h2>Configurations</h2>
              <button className="primary-button">Create</button>
            </div>
            <div className="split-panel">
              <div className="panel-column">
                <button className="selection-card active">Chase CSV</button>
                <button className="selection-card">Amex CSV</button>
              </div>
              <div className="panel-column wide">
                <div className="form-grid">
                  <label>
                    Configuration Name
                    <input value="Chase CSV" readOnly />
                  </label>
                  <label>
                    Date Column
                    <input value="1" readOnly />
                  </label>
                  <label>
                    Amount Column
                    <input value="5" readOnly />
                  </label>
                  <label>
                    Merchant Column
                    <input value="3" readOnly />
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {activeSetting === "Merchants" ? (
          <>
            <div className="card-heading">
              <h2>Merchants</h2>
              <button className="primary-button">Apply to Existing Transactions</button>
            </div>
            <div className="stack">
              <div className="list-row">
                <div>
                  When merchant <strong>KROGER</strong>, categorize as{" "}
                  <span className="pill tone-green">Groceries</span>
                </div>
                <button className="ghost-button">Edit</button>
              </div>
              <div className="list-row">
                <div>
                  When merchant <strong>NETFLIX.COM</strong>, categorize as{" "}
                  <span className="pill tone-gold">Entertainment</span>
                </div>
                <button className="ghost-button">Edit</button>
              </div>
            </div>
          </>
        ) : null}

        {activeSetting === "Uploads" ? (
          <>
            <div className="card-heading">
              <h2>Uploads</h2>
              <span className="subtle">Delete an upload to remove its imported transactions.</span>
            </div>
            <div className="stack">
              <div className="list-row">
                <div>
                  <strong>03/09/2026 09:14 AM</strong>
                  <p className="subtle">Transactions uploaded: 213</p>
                </div>
                <button className="danger-button">Delete</button>
              </div>
              <div className="list-row">
                <div>
                  <strong>02/28/2026 06:40 PM</strong>
                  <p className="subtle">Transactions uploaded: 97</p>
                </div>
                <button className="danger-button">Delete</button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </section>
  );

  const renderPage = () => {
    if (activePage === "Dashboard") return renderDashboard();
    if (activePage === "Spending") return renderSpending();
    if (activePage === "Budgets") return renderBudgets();
    return renderSettings();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-links">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${item === activePage ? "active" : ""}`}
              onClick={() => setActivePage(item)}
            >
              <span className="nav-icon">{item.charAt(0)}</span>
              <span>{item}</span>
            </button>
          ))}
        </div>

        <button className="logout-button">
          <span className="nav-icon">L</span>
          <span>Logout</span>
        </button>
      </aside>

      <main className="workspace">
        <header className="status-banner">
          <div>
            <p className="banner-label">Source-only rebuild</p>
            <strong>{meta?.interfaceSource ?? "Loading original interface contract..."}</strong>
          </div>
          <div className={`toast ${dbHealth?.ok ? "success" : "error"}`}>
            {error
              ? error
              : dbHealth?.ok
                ? `Database ready via ${dbHealth.provider}`
                : dbHealth?.error ?? "Database health pending"}
          </div>
        </header>

        {renderPage()}

        <footer className="meta-footer card">
          <div>
            <p className="card-label">Auth target</p>
            <strong>{meta?.authProvider ?? "Loading..."}</strong>
          </div>
          <div>
            <p className="card-label">Persistence</p>
            <strong>{meta?.persistence ?? "Loading..."}</strong>
          </div>
          <div>
            <p className="card-label">Transaction source</p>
            <strong>{meta?.transactionSource ?? "Loading..."}</strong>
          </div>
        </footer>
      </main>
    </div>
  );
}
