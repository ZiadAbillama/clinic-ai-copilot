import Image from 'next/image';
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

const patients = [
  {
    id: 'P-1024',
    name: 'Maya Haddad',
    reason: 'Follow-up consultation',
    appointment: '08:40',
    status: 'Checked in',
  },
  {
    id: 'P-1025',
    name: 'Karim Nassar',
    reason: 'New patient intake',
    appointment: '09:05',
    status: 'Needs vitals',
  },
  {
    id: 'P-1026',
    name: 'Omar Saad',
    reason: 'Chest discomfort note',
    appointment: '09:25',
    status: 'Doctor review',
  },
];

const aiQueue = ['Summarize visit note', 'Search prior notes', 'Mark output for review'];

const healthChecks = [
  { label: 'Web app', state: 'Ready', icon: CheckCircle2 },
  { label: 'Health API', state: 'Planned', icon: CircleDashed },
  { label: 'Mock data', state: 'Loaded', icon: CheckCircle2 },
];

export default function Home() {
  return (
    <main className="appShell">
      <a className="skipLink" href="#patients">
        Skip to patient list
      </a>

      <header className="topBar">
        <a className="brand" href="#top" aria-label="Clinic AI Copilot home">
          <Image
            className="brandLogo"
            src="/brand/clinikit-logo-horizontal.webp"
            alt="CliniKit"
            width={478}
            height={104}
            priority
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
          <p className="eyebrow">Staff workspace</p>
          <h1 id="overview-title">Clinic AI Copilot</h1>
          <p>A simplified medical operations platform for clinic staff.</p>
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

      <section className="workspace" aria-label="Clinic staff workspace">
        <div className="patientPanel" id="patients">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Patients</p>
              <h2>Today</h2>
            </div>
            <span>3 active</span>
          </div>

          <div className="patientList">
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
              <li>Register patient</li>
              <li>Create appointment</li>
              <li>Add medical note</li>
            </ol>
          </section>

          <section className="reviewCard" id="review" aria-labelledby="review-title">
            <div className="iconBox">
              <ShieldCheck size={20} />
            </div>
            <p className="eyebrow">AI review</p>
            <h2 id="review-title">Human approval required</h2>
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
          <h3>Patient service</h3>
          <p>Structured records</p>
        </article>
        <article>
          <Activity size={20} />
          <h3>Appointment service</h3>
          <p>Clinic schedule</p>
        </article>
        <article>
          <Stethoscope size={20} />
          <h3>Notes service</h3>
          <p>Medical context</p>
        </article>
        <article>
          <Search size={20} />
          <h3>AI service</h3>
          <p>Summary and search</p>
        </article>
      </section>
    </main>
  );
}
