import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CircleDashed,
  FileText,
  HeartPulse,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

const aiQueue = ['Summarize visit note', 'Search prior notes', 'Mark output for review'];

export default function App() {
  const [apiState, setApiState] = useState('Checking');
  const [patients, setPatients] = useState([]);
  const [patientsState, setPatientsState] = useState('Loading');
  const [patientsError, setPatientsError] = useState('');

  useEffect(() => {
    let active = true;

    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (active) setApiState(data.status === 'ok' ? 'Ready' : 'Degraded');
      })
      .catch(() => {
        if (active) setApiState('Offline');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch('/api/patients')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!active) return;
        setPatients(data);
        setPatientsState('Loaded');
        setPatientsError('');
      })
      .catch(() => {
        if (!active) return;
        setPatients([]);
        setPatientsState('Offline');
        setPatientsError('Patient data is unavailable. Start the API and refresh.');
      });

    return () => {
      active = false;
    };
  }, []);

  const healthChecks = [
    { label: 'Web app', state: 'Ready', icon: CheckCircle2 },
    {
      label: 'Health API',
      state: apiState,
      icon: apiState === 'Ready' ? CheckCircle2 : CircleDashed,
    },
    {
      label: 'Patients API',
      state: patientsState,
      icon: patientsState === 'Loaded' ? CheckCircle2 : CircleDashed,
    },
  ];

  return (
    <main className="appShell">
      <a className="skipLink" href="#patients">
        Skip to patient list
      </a>

      <header className="topBar">
        <a className="brand" href="#top" aria-label="Clinic AI Copilot home">
          <img
            className="brandLogo"
            src="/brand/clinikit-logo-horizontal.webp"
            alt="CliniKit"
            width={478}
            height={104}
          />
        </a>

        <nav className="topNav" aria-label="Dashboard sections">
          <a href="#patients">Patients</a>
          <a href="#notes">Notes</a>
          <a href="#review">AI review</a>
        </nav>
      </header>

      <section className="overview" id="top" aria-labelledby="overview-title">
        <div className="overviewCopy">
          <p className="eyebrow">Doctor workspace</p>
          <h1 id="overview-title">Clinic AI Copilot</h1>
          <p>
            A simplified medical workspace for a doctor to review patients, notes, and AI summaries.
          </p>
        </div>

        <div className="statusPanel" aria-label="System status">
          {healthChecks.map((item) => (
            <div key={item.label}>
              <item.icon size={18} />
              <span>{item.label}</span>
              <strong>{item.state}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="workspace" aria-label="Doctor workspace">
        <div className="patientPanel" id="patients">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Patients</p>
              <h2>Today</h2>
            </div>
            <span>{patientsState === 'Loaded' ? `${patients.length} active` : patientsState}</span>
          </div>

          <div className="patientList">
            {patientsState === 'Loading' && <p className="patientMessage">Loading patients...</p>}

            {patientsError && <p className="patientMessage error">{patientsError}</p>}

            {patientsState === 'Loaded' && patients.length === 0 && (
              <p className="patientMessage">No patients scheduled for today.</p>
            )}

            {patients.map((patient) => (
              <article className="patientRow" key={patient.id}>
                <time>{patient.appointment}</time>
                <div>
                  <strong>{patient.name}</strong>
                  <span>{patient.reason}</span>
                </div>
                <em>{patient.status}</em>
              </article>
            ))}
          </div>
        </div>

        <aside className="sidePanel">
          <section className="noteCard" id="notes" aria-labelledby="notes-title">
            <div className="iconBox">
              <FileText size={20} />
            </div>
            <p className="eyebrow">Notes</p>
            <h2 id="notes-title">Medical note flow</h2>
            <ol>
              <li>Open patient</li>
              <li>Add medical note</li>
              <li>Generate AI summary</li>
            </ol>
          </section>

          <section className="reviewCard" id="review" aria-labelledby="review-title">
            <div className="iconBox">
              <ShieldCheck size={20} />
            </div>
            <p className="eyebrow">AI review</p>
            <h2 id="review-title">Doctor approval required</h2>
            <ul>
              {aiQueue.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>

      <section className="architecture" aria-label="Project modules">
        <article>
          <HeartPulse size={20} />
          <h3>Patients</h3>
          <p>Structured records</p>
        </article>
        <article>
          <Activity size={20} />
          <h3>Appointments</h3>
          <p>Clinic schedule</p>
        </article>
        <article>
          <Stethoscope size={20} />
          <h3>Notes</h3>
          <p>Medical context</p>
        </article>
        <article>
          <Search size={20} />
          <h3>AI assistant</h3>
          <p>Summary and search</p>
        </article>
      </section>
    </main>
  );
}
