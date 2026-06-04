import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Menu,
  Share2,
  X,
} from "lucide-react";

const logoUrl = "/assets/logo1.png";
const homeUrl = "https://onlyvpw.com";
const researchUrl = "https://research.onlyvpw.com";

const calculators = [
  {
    id: "sip",
    name: "SIP",
    eyebrow: "Monthly investing",
    description: "Project disciplined monthly contributions and compounding.",
    inputs: [
      ["monthly", "Monthly SIP", 25000, "currency"],
      ["years", "Period", 15, "years"],
      ["rate", "Expected return", 12, "percent"],
      ["stepUp", "Annual step-up", 8, "percent"],
    ],
  },
  {
    id: "swp",
    name: "SWP",
    eyebrow: "Systematic withdrawal",
    description: "See how withdrawals, inflation, and returns affect capital.",
    inputs: [
      ["corpus", "Opening corpus", 5000000, "currency"],
      ["monthlyWithdrawal", "Monthly withdrawal", 35000, "currency"],
      ["years", "Period", 20, "years"],
      ["rate", "Expected return", 9, "percent"],
      ["inflation", "Withdrawal inflation", 6, "percent"],
    ],
  },
  {
    id: "lumpsum",
    name: "Lumpsum",
    eyebrow: "One-time capital",
    description: "Estimate the growth path of a one-time investment.",
    inputs: [
      ["principal", "Investment amount", 1000000, "currency"],
      ["years", "Period", 12, "years"],
      ["rate", "Expected return", 11, "percent"],
    ],
  },
  {
    id: "emi",
    name: "Loan & EMI",
    eyebrow: "Borrowing clarity",
    description: "Calculate EMI, total interest, and annual loan balance.",
    inputs: [
      ["principal", "Loan amount", 3500000, "currency"],
      ["years", "Tenure", 20, "years"],
      ["rate", "Loan interest", 8.75, "percent"],
      ["prepayment", "Annual prepayment", 0, "currency"],
    ],
  },
  {
    id: "retirement",
    name: "Retirement",
    eyebrow: "Long-range planning",
    description: "Plan accumulation and retirement income sustainability.",
    inputs: [
      ["age", "Current age", 32, "number"],
      ["retireAge", "Retirement age", 60, "number"],
      ["lifeAge", "Plan till age", 90, "number"],
      ["currentSavings", "Current retirement corpus", 800000, "currency"],
      ["monthlyInvest", "Monthly investment", 30000, "currency"],
      ["monthlyExpense", "Current monthly expense", 80000, "currency"],
      ["preReturn", "Pre-retirement return", 12, "percent"],
      ["postReturn", "Post-retirement return", 8, "percent"],
      ["inflation", "Inflation", 6, "percent"],
    ],
  },
];

const defaults = calculators.reduce((acc, calculator) => {
  acc[calculator.id] = Object.fromEntries(
    calculator.inputs.map(([key, , value]) => [key, value])
  );
  return acc;
}, {});

function getInitialCalculator() {
  const query = new URLSearchParams(window.location.search);
  const requested = query.get("calculator");
  return calculators.some((calculator) => calculator.id === requested)
    ? requested
    : calculators[0].id;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function number(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sanitize(rawInputs) {
  return Object.fromEntries(
    Object.entries(rawInputs).map(([key, value]) => [
      key,
      Number.isFinite(Number(value)) ? Number(value) : 0,
    ])
  );
}

function buildSip(inputs) {
  const annualRate = inputs.rate / 100;
  const monthlyRate = annualRate / 12;
  const totalMonths = Math.max(1, Math.round(inputs.years * 12));
  let monthly = Math.max(0, inputs.monthly);
  let value = 0;
  let invested = 0;
  const rows = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    if (month > 1 && month % 12 === 1) {
      monthly *= 1 + inputs.stepUp / 100;
    }
    value = (value + monthly) * (1 + monthlyRate);
    invested += monthly;

    if (month % 12 === 0 || month === totalMonths) {
      rows.push({
        period: `Year ${Math.ceil(month / 12)}`,
        invested,
        withdrawal: 0,
        interest: value - invested,
        balance: value,
      });
    }
  }

  return {
    title: "SIP Projection",
    summary: [
      ["Future value", money(value)],
      ["Total invested", money(invested)],
      ["Estimated gain", money(value - invested)],
    ],
    rows,
  };
}

function buildSwp(inputs) {
  const annualRate = inputs.rate / 100;
  const monthlyRate = annualRate / 12;
  const totalMonths = Math.max(1, Math.round(inputs.years * 12));
  let monthlyWithdrawal = Math.max(0, inputs.monthlyWithdrawal);
  let balance = Math.max(0, inputs.corpus);
  let totalWithdrawal = 0;
  let interest = 0;
  const rows = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    if (month > 1 && month % 12 === 1) {
      monthlyWithdrawal *= 1 + inputs.inflation / 100;
    }
    const gain = balance * monthlyRate;
    balance += gain;
    const withdrawn = Math.min(balance, monthlyWithdrawal);
    balance -= withdrawn;
    interest += gain;
    totalWithdrawal += withdrawn;

    if (month % 12 === 0 || month === totalMonths || balance <= 0) {
      rows.push({
        period: `Year ${Math.ceil(month / 12)}`,
        invested: inputs.corpus,
        withdrawal: totalWithdrawal,
        interest,
        balance,
      });
    }
    if (balance <= 0) break;
  }

  return {
    title: "SWP Projection",
    summary: [
      ["Closing corpus", money(balance)],
      ["Total withdrawn", money(totalWithdrawal)],
      ["Interest earned", money(interest)],
    ],
    rows,
  };
}

function buildLumpsum(inputs) {
  const years = Math.max(1, Math.round(inputs.years));
  let balance = Math.max(0, inputs.principal);
  const rows = [];

  for (let year = 1; year <= years; year += 1) {
    const opening = balance;
    balance *= 1 + inputs.rate / 100;
    rows.push({
      period: `Year ${year}`,
      invested: inputs.principal,
      withdrawal: 0,
      interest: balance - opening,
      balance,
    });
  }

  return {
    title: "Lumpsum Projection",
    summary: [
      ["Future value", money(balance)],
      ["Investment", money(inputs.principal)],
      ["Estimated gain", money(balance - inputs.principal)],
    ],
    rows,
  };
}

function buildEmi(inputs) {
  const principal = Math.max(0, inputs.principal);
  const totalMonths = Math.max(1, Math.round(inputs.years * 12));
  const monthlyRate = inputs.rate / 100 / 12;
  const emi =
    monthlyRate === 0
      ? principal / totalMonths
      : (principal * monthlyRate * (1 + monthlyRate) ** totalMonths) /
        ((1 + monthlyRate) ** totalMonths - 1);
  let balance = principal;
  let totalInterest = 0;
  let totalPayment = 0;
  const rows = [];

  for (let month = 1; month <= totalMonths && balance > 0; month += 1) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, emi - interest);
    balance = Math.max(0, balance + interest - emi);
    totalInterest += interest;
    totalPayment += Math.min(emi, principalPaid + interest);

    if (month % 12 === 0 && inputs.prepayment > 0 && balance > 0) {
      const prepay = Math.min(balance, inputs.prepayment);
      balance -= prepay;
      totalPayment += prepay;
    }

    if (month % 12 === 0 || balance <= 0 || month === totalMonths) {
      rows.push({
        period: `Month ${month}`,
        invested: totalPayment,
        withdrawal: principal - balance,
        interest: totalInterest,
        balance,
      });
    }
  }

  return {
    title: "Loan & EMI Projection",
    summary: [
      ["Monthly EMI", money(emi)],
      ["Total interest", money(totalInterest)],
      ["Total payment", money(totalPayment)],
    ],
    rows,
  };
}

function buildRetirement(inputs) {
  const currentAge = Math.max(0, Math.round(inputs.age));
  const retireAge = Math.max(currentAge + 1, Math.round(inputs.retireAge));
  const lifeAge = Math.max(retireAge + 1, Math.round(inputs.lifeAge));
  const accumulationYears = retireAge - currentAge;
  const retirementYears = lifeAge - retireAge;
  const monthlyPreRate = inputs.preReturn / 100 / 12;
  const monthlyPostRate = inputs.postReturn / 100 / 12;
  let corpus = Math.max(0, inputs.currentSavings);
  let invested = corpus;
  const rows = [];

  for (let year = 1; year <= accumulationYears; year += 1) {
    let annualInvested = 0;
    for (let month = 1; month <= 12; month += 1) {
      corpus = (corpus + inputs.monthlyInvest) * (1 + monthlyPreRate);
      invested += inputs.monthlyInvest;
      annualInvested += inputs.monthlyInvest;
    }
    rows.push({
      period: `Age ${currentAge + year}`,
      invested,
      withdrawal: 0,
      interest: corpus - invested,
      balance: corpus,
    });
  }

  const retirementExpense =
    inputs.monthlyExpense * (1 + inputs.inflation / 100) ** accumulationYears;
  let totalWithdrawal = 0;

  for (let year = 1; year <= retirementYears; year += 1) {
    const monthlyExpense =
      retirementExpense * (1 + inputs.inflation / 100) ** (year - 1);
    let annualWithdrawal = 0;
    const opening = corpus;

    for (let month = 1; month <= 12 && corpus > 0; month += 1) {
      corpus *= 1 + monthlyPostRate;
      const withdrawn = Math.min(corpus, monthlyExpense);
      corpus -= withdrawn;
      annualWithdrawal += withdrawn;
      totalWithdrawal += withdrawn;
    }

    rows.push({
      period: `Age ${retireAge + year}`,
      invested,
      withdrawal: totalWithdrawal,
      interest: corpus - opening + annualWithdrawal,
      balance: corpus,
    });

    if (corpus <= 0) break;
  }

  const status = corpus > 0 ? "Funded" : "Shortfall";

  return {
    title: "Retirement Projection",
    summary: [
      ["Retirement corpus", money(rows[accumulationYears - 1]?.balance || corpus)],
      ["First retirement expense", money(retirementExpense)],
      ["Plan status", status],
    ],
    rows,
  };
}

function calculate(type, inputs) {
  const safe = sanitize(inputs);
  if (type === "sip") return buildSip(safe);
  if (type === "swp") return buildSwp(safe);
  if (type === "lumpsum") return buildLumpsum(safe);
  if (type === "emi") return buildEmi(safe);
  return buildRetirement(safe);
}

function toCsv(title, rows) {
  const header = ["Period", "Invested or paid", "Withdrawal or principal", "Interest", "Balance"];
  const body = rows.map((row) => [
    row.period,
    Math.round(row.invested),
    Math.round(row.withdrawal),
    Math.round(row.interest),
    Math.round(row.balance),
  ]);
  return [[title], header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(title, rows) {
  const blob = new Blob([toCsv(title, rows)], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

async function shareProjection(calculatorName, result) {
  const summary = result.summary.map(([label, value]) => `${label}: ${value}`).join("\n");
  const text = `VPW ${calculatorName} result\n${summary}\n${window.location.href}`;

  if (navigator.share) {
    await navigator.share({ title: `VPW ${calculatorName}`, text, url: window.location.href });
    return "Shared";
  }

  await navigator.clipboard.writeText(text);
  return "Copied";
}

function MenuOverlay({ open, onClose, onSelect }) {
  const items = [
    { label: "Calculators", href: "#calculators" },
    { label: "SIP", href: "#calculators", calculator: "sip" },
    { label: "SWP", href: "#calculators", calculator: "swp" },
    { label: "Lumpsum", href: "#calculators", calculator: "lumpsum" },
    { label: "Loan & EMI", href: "#calculators", calculator: "emi" },
    { label: "Retirement", href: "#calculators", calculator: "retirement" },
    { label: "Researches", href: researchUrl },
    { label: "VPW", href: homeUrl },
  ];

  return (
    <div className={`menu-overlay ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="close-button" type="button" onClick={onClose} aria-label="Close menu">
        <X size={32} />
      </button>
      <nav aria-label="Primary menu">
        {items.map((item, index) => (
          <a
            key={item.label}
            href={item.href}
            style={{ "--delay": `${index * 55}ms` }}
            onClick={() => {
              if (item.calculator) onSelect(item.calculator);
              onClose();
            }}
          >
            {item.label}
            <ArrowUpRight size={28} />
          </a>
        ))}
      </nav>
    </div>
  );
}

function Field({ field, value, onChange }) {
  const [key, label, , type] = field;
  const suffix = type === "percent" ? "%" : type === "years" ? "yrs" : "";
  const prefix = type === "currency" ? "₹" : "";

  return (
    <label className="field">
      <span>{label}</span>
      <div>
        {prefix && <b>{prefix}</b>}
        <input
          value={value}
          type="number"
          inputMode="decimal"
          min="0"
          step={type === "percent" ? "0.05" : "1"}
          onChange={(event) => onChange(key, event.target.value)}
        />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

function ProjectionTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Invested/Paid</th>
            <th>Withdrawn/Principal</th>
            <th>Interest/Gain</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <td>{row.period}</td>
              <td>{money(row.invested)}</td>
              <td>{money(row.withdrawal)}</td>
              <td>{money(row.interest)}</td>
              <td>{money(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalculatorPanel({ calculator, inputs, setInputs }) {
  const [shareStatus, setShareStatus] = useState("");
  const result = useMemo(
    () => calculate(calculator.id, inputs),
    [calculator.id, inputs]
  );
  const rowsToShow = result.rows.slice(0, 80);

  function updateInput(key, value) {
    setInputs((current) => ({
      ...current,
      [calculator.id]: {
        ...current[calculator.id],
        [key]: value,
      },
    }));
  }

  async function handleShare() {
    setShareStatus("");
    try {
      const status = await shareProjection(calculator.name, result);
      setShareStatus(status);
      window.setTimeout(() => setShareStatus(""), 1800);
    } catch {
      setShareStatus("Not shared");
    }
  }

  return (
    <article className="calculator-panel" id={calculator.id}>
      <div className="panel-intro">
        <p>{calculator.eyebrow}</p>
        <h2>{calculator.name}</h2>
        <span>{calculator.description}</span>
      </div>

      <div className="calculator-grid">
        <section className="input-surface" aria-label={`${calculator.name} inputs`}>
          {calculator.inputs.map((field) => (
            <Field
              key={field[0]}
              field={field}
              value={inputs[field[0]]}
              onChange={updateInput}
            />
          ))}
        </section>

        <section className="result-surface" aria-label={`${calculator.name} results`}>
          <div className="result-header">
            <p>{result.title}</p>
            <div className="actions">
              <button type="button" onClick={() => downloadCsv(result.title, result.rows)}>
                <Download size={18} />
                Download
              </button>
              <button type="button" onClick={handleShare}>
                <Share2 size={18} />
                {shareStatus || "Share"}
              </button>
            </div>
          </div>

          <div className="summary-grid">
            {result.summary.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <ProjectionTable rows={rowsToShow} />
          {result.rows.length > rowsToShow.length && (
            <p className="projection-note">
              Download includes all {number(result.rows.length)} projection rows.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(getInitialCalculator);
  const [inputs, setInputs] = useState(defaults);
  const activeCalculator = calculators.find((calculator) => calculator.id === active);

  function selectCalculator(id) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("calculator", id);
    window.history.replaceState({}, "", url);
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href={homeUrl} aria-label="Open onlyvpw.com">
          <img src={logoUrl} alt="VPW logo" />
        </a>
        <button
          className="menu-button"
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={34} />
        </button>
      </header>

      <MenuOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={selectCalculator}
      />

      <main>
        <section className="hero">
          <div className="ticker" aria-hidden="true">
            <span>VPW</span>
            <span>Projection</span>
            <span>Planning</span>
            <span>Compounding</span>
            <span>Discipline</span>
          </div>
          <div className="hero-copy">
            <p>VPW Labs</p>
            <h1>Quick math for decisions that actually matter.</h1>
            <span>
              Project Quickly Your SIP, SWP, Lumpsum, Loan and Retirement Maths
              Simple, Easy and Downloadable. Scroll Below to start
            </span>
          </div>
        </section>

        <section className="calculator-shell" id="calculators">
          <div className="tab-strip" aria-label="Calculator selector">
            {calculators.map((calculator) => (
              <button
                key={calculator.id}
                type="button"
                className={active === calculator.id ? "active" : ""}
                onClick={() => selectCalculator(calculator.id)}
              >
                {calculator.name}
              </button>
            ))}
          </div>

          <CalculatorPanel
            key={activeCalculator.id}
            calculator={activeCalculator}
            inputs={inputs[activeCalculator.id]}
            setInputs={setInputs}
          />
        </section>
      </main>

      <footer>
        <a href={homeUrl}>VPW</a>
        <a href={researchUrl}>Researches</a>
        <a href="#terms">Terms of Service</a>
        <p id="terms">
          Terms of Service: projections are educational estimates only and do not
          constitute investment, tax, or loan advice.
        </p>
      </footer>
    </>
  );
}

export default App;
