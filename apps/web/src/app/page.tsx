import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardPlus,
  FileText,
  HeartPulse,
  LayoutDashboard,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Queue Management', icon: UsersRound },
  { label: 'Appointments', icon: CalendarClock },
  { label: 'Visit & Diagnostics', icon: FileText },
  { label: 'AI Review', icon: Sparkles },
  { label: 'Reporting', icon: Activity },
  { label: 'Security', icon: ShieldCheck },
];

const metrics = [
  { label: 'Today appointments', value: '24', trend: '+4', icon: CalendarClock },
  { label: 'Patients checked in', value: '11', trend: '46%', icon: HeartPulse },
  { label: 'AI drafts pending', value: '7', trend: '-2', icon: Sparkles },
  { label: 'Open safety reviews', value: '3', trend: 'High', icon: AlertTriangle },
];

const queue = [
  {
    name: 'Maya Haddad',
    time: '09:20',
    reason: 'Follow-up consultation',
    status: 'Checked in',
    acuity: 'Stable',
  },
  {
    name: 'Karim Nassar',
    time: '09:45',
    reason: 'New patient intake',
    status: 'Waiting',
    acuity: 'Review labs',
  },
  {
    name: 'Lea Mansour',
    time: '10:10',
    reason: 'Medication review',
    status: 'With nurse',
    acuity: 'Stable',
  },
  {
    name: 'Omar Saad',
    time: '10:30',
    reason: 'Chest discomfort note',
    status: 'Doctor next',
    acuity: 'Priority',
  },
];

const notes = [
  {
    title: 'Draft summary: Maya Haddad',
    description: 'AI extracted symptoms, medication adherence, and suggested follow-up questions.',
    state: 'Needs doctor review',
  },
  {
    title: 'Context search: beta blocker mentions',
    description: '6 prior notes matched semantically. Top result is from March follow-up.',
    state: 'Context ready',
  },
  {
    title: 'Audit event',
    description: 'Nurse updated intake observations for Lea Mansour.',
    state: 'Logged',
  },
];

const timeline = [
  { time: '08:30', label: 'Clinic opened', tone: 'ok' },
  { time: '09:05', label: '3 patients checked in', tone: 'ok' },
  { time: '09:18', label: 'AI summary generated', tone: 'review' },
  { time: '09:40', label: 'Priority note flagged', tone: 'warn' },
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>CliniKit</strong>
            <span>AI Copilot</span>
          </div>
        </div>

        <nav className="navList">
          {navItems.map((item) => (
            <button className={item.active ? 'navItem active' : 'navItem'} key={item.label}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="safetyPanel">
          <ShieldCheck size={20} />
          <div>
            <strong>Human review active</strong>
            <p>AI output stays draft-only until clinical approval.</p>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Practice medicine, not administration</p>
            <h1>Clinic command center</h1>
          </div>

          <div className="topActions">
            <label className="searchBox">
              <Search size={18} />
              <span className="srOnly">Search</span>
              <input placeholder="Search patients, notes, appointments" />
            </label>
            <button className="iconButton" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button className="primaryAction">
              <ClipboardPlus size={18} />
              <span>New intake</span>
            </button>
          </div>
        </header>

        <section className="metricGrid" aria-label="Clinic metrics">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
              <div className="metricIcon">
                <metric.icon size={20} />
              </div>
              <small>{metric.trend}</small>
            </article>
          ))}
        </section>

        <section className="contentGrid">
          <div className="queuePanel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Patient flow</p>
                <h2>Today&apos;s queue</h2>
              </div>
              <button className="textButton">
                Full schedule
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="queueList">
              {queue.map((patient) => (
                <article className="queueRow" key={patient.name}>
                  <div className="timeBlock">{patient.time}</div>
                  <div className="patientMain">
                    <strong>{patient.name}</strong>
                    <span>{patient.reason}</span>
                  </div>
                  <span className="statusPill">{patient.status}</span>
                  <span className={patient.acuity === 'Priority' ? 'acuity high' : 'acuity'}>
                    {patient.acuity}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <aside className="aiPanel" aria-label="AI review panel">
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">AI workspace</p>
                <h2>Review queue</h2>
              </div>
              <Sparkles size={22} />
            </div>

            <div className="noteStack">
              {notes.map((note) => (
                <article className="noteItem" key={note.title}>
                  <div className="noteIcon">
                    <MessageSquareText size={18} />
                  </div>
                  <div>
                    <strong>{note.title}</strong>
                    <p>{note.description}</p>
                    <span>{note.state}</span>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="lowerGrid">
          <article className="summaryPanel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Clinical note preview</p>
                <h2>Human-reviewed summary flow</h2>
              </div>
              <CheckCircle2 size={22} />
            </div>
            <div className="reviewFlow">
              <div>
                <span>1</span>
                <strong>Raw note captured</strong>
                <p>Doctor or nurse records the visit context.</p>
              </div>
              <div>
                <span>2</span>
                <strong>AI drafts summary</strong>
                <p>Assistant extracts only reviewable highlights.</p>
              </div>
              <div>
                <span>3</span>
                <strong>Staff approves</strong>
                <p>Accepted content becomes part of the workflow.</p>
              </div>
            </div>
          </article>

          <article className="timelinePanel">
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">Live activity</p>
                <h2>Audit timeline</h2>
              </div>
              <Activity size={21} />
            </div>
            <div className="timeline">
              {timeline.map((item) => (
                <div className={`timelineItem ${item.tone}`} key={`${item.time}-${item.label}`}>
                  <span>{item.time}</span>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
