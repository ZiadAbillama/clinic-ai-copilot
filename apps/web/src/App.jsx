import { useCallback, useEffect, useState } from 'react';
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
const emptyPatientForm = {
  name: '',
  dob: '',
  contact: '',
  reason: '',
  appointment: '',
  status: 'Scheduled',
  lastVisit: '',
  noteCount: 0,
};

export default function App() {
  const [apiState, setApiState] = useState('Checking');
  const [patients, setPatients] = useState([]);
  const [patientsState, setPatientsState] = useState('Loading');
  const [patientsError, setPatientsError] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientState, setSelectedPatientState] = useState('Idle');
  const [selectedPatientError, setSelectedPatientError] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [patientForm, setPatientForm] = useState(emptyPatientForm);
  const [formStatus, setFormStatus] = useState('Idle');
  const [formError, setFormError] = useState('');

  const refreshPatients = useCallback((preferredPatientId) => {
    setPatientsState('Loading');

    return fetch('/api/patients')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setPatients(data);
        setPatientsState('Loaded');
        setPatientsError('');
        if (data.length > 0) {
          setSelectedPatientId((currentId) => preferredPatientId || currentId || data[0].id);
        }
        return data;
      })
      .catch(() => {
        setPatients([]);
        setPatientsState('Offline');
        setPatientsError('Patient data is unavailable. Start the API and refresh.');
        return [];
      });
  }, []);

  const setFormFromPatient = useCallback((patient) => {
    setPatientForm({
      name: patient.name || '',
      dob: patient.dob || '',
      contact: patient.contact || '',
      reason: patient.reason || '',
      appointment: patient.appointment || '',
      status: patient.status || 'Scheduled',
      lastVisit: patient.lastVisit || '',
      noteCount: patient.noteCount || 0,
    });
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setPatientForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'noteCount' ? Number(value) : value,
    }));
  }

  function startNewPatient() {
    setFormMode('create');
    setPatientForm(emptyPatientForm);
    setFormError('');
    setFormStatus('Idle');
  }

  function startEditingPatient() {
    if (!selectedPatient) return;
    setFormMode('edit');
    setFormFromPatient(selectedPatient);
    setFormError('');
    setFormStatus('Idle');
  }

  function handlePatientSubmit(event) {
    event.preventDefault();
    setFormStatus('Saving');
    setFormError('');

    const isEditing = formMode === 'edit' && selectedPatientId;
    const url = isEditing
      ? `/api/patients/${encodeURIComponent(selectedPatientId)}`
      : '/api/patients';

    fetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientForm),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((patient) => {
        setSelectedPatient(patient);
        setSelectedPatientId(patient.id);
        setFormMode('edit');
        setFormFromPatient(patient);
        setFormStatus('Saved');
        return refreshPatients(patient.id);
      })
      .catch(() => {
        setFormStatus('Error');
        setFormError('Could not save patient. Check the API and try again.');
      });
  }

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
    refreshPatients();
  }, [refreshPatients]);

  useEffect(() => {
    if (!selectedPatientId) return undefined;

    let active = true;
    setSelectedPatientState('Loading');

    fetch(`/api/patients/${encodeURIComponent(selectedPatientId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!active) return;
        setSelectedPatient(data);
        setSelectedPatientState('Loaded');
        setSelectedPatientError('');
        if (formMode === 'edit') setFormFromPatient(data);
      })
      .catch(() => {
        if (!active) return;
        setSelectedPatient(null);
        setSelectedPatientState('Offline');
        setSelectedPatientError('Patient details are unavailable.');
      });

    return () => {
      active = false;
    };
  }, [formMode, selectedPatientId, setFormFromPatient]);

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
            <div className="panelActions">
              <span>
                {patientsState === 'Loaded' ? `${patients.length} active` : patientsState}
              </span>
              <button type="button" onClick={startNewPatient}>
                New
              </button>
            </div>
          </div>

          <div className="patientList">
            {patientsState === 'Loading' && <p className="patientMessage">Loading patients...</p>}

            {patientsError && <p className="patientMessage error">{patientsError}</p>}

            {patientsState === 'Loaded' && patients.length === 0 && (
              <p className="patientMessage">No patients scheduled for today.</p>
            )}

            {patients.map((patient) => (
              <button
                className={patient.id === selectedPatientId ? 'patientRow selected' : 'patientRow'}
                key={patient.id}
                type="button"
                aria-pressed={patient.id === selectedPatientId}
                onClick={() => setSelectedPatientId(patient.id)}
              >
                <time>{patient.appointment}</time>
                <div>
                  <strong>{patient.name}</strong>
                  <span>{patient.reason}</span>
                </div>
                <em>{patient.status}</em>
              </button>
            ))}
          </div>
        </div>

        <aside className="sidePanel">
          <section className="detailCard" aria-labelledby="patient-detail-title">
            <div className="iconBox">
              <HeartPulse size={20} />
            </div>
            <p className="eyebrow">Patient file</p>
            <h2 id="patient-detail-title">{selectedPatient?.name || 'Select a patient'}</h2>

            {selectedPatientState === 'Loading' && (
              <p className="detailMessage">Loading patient details...</p>
            )}

            {selectedPatientError && <p className="detailMessage error">{selectedPatientError}</p>}

            {selectedPatientState === 'Loaded' && selectedPatient && (
              <>
                <dl className="detailGrid">
                  <div>
                    <dt>Date of birth</dt>
                    <dd>{selectedPatient.dob}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>{selectedPatient.contact}</dd>
                  </div>
                  <div>
                    <dt>Last visit</dt>
                    <dd>{selectedPatient.lastVisit}</dd>
                  </div>
                  <div>
                    <dt>Notes</dt>
                    <dd>{selectedPatient.noteCount}</dd>
                  </div>
                </dl>

                <div className="timelinePreview">
                  <strong>Next patient steps</strong>
                  <ol>
                    <li>Review current visit reason</li>
                    <li>Add or update medical note</li>
                    <li>Generate summary when notes are ready</li>
                  </ol>
                </div>
                <button className="secondaryButton" type="button" onClick={startEditingPatient}>
                  Edit patient
                </button>
              </>
            )}
          </section>

          <section className="formCard" aria-labelledby="patient-form-title">
            <p className="eyebrow">{formMode === 'edit' ? 'Edit patient' : 'New patient'}</p>
            <h2 id="patient-form-title">
              {formMode === 'edit' ? 'Update patient file' : 'Create patient'}
            </h2>

            <form className="patientForm" onSubmit={handlePatientSubmit}>
              <label>
                Name
                <input
                  name="name"
                  value={patientForm.name}
                  onChange={handleFormChange}
                  placeholder="Patient name"
                  required
                />
              </label>
              <label>
                Date of birth
                <input name="dob" value={patientForm.dob} onChange={handleFormChange} type="date" />
              </label>
              <label>
                Contact
                <input
                  name="contact"
                  value={patientForm.contact}
                  onChange={handleFormChange}
                  placeholder="+961 ..."
                />
              </label>
              <label>
                Appointment
                <input
                  name="appointment"
                  value={patientForm.appointment}
                  onChange={handleFormChange}
                  type="time"
                />
              </label>
              <label className="wideField">
                Visit reason
                <input
                  name="reason"
                  value={patientForm.reason}
                  onChange={handleFormChange}
                  placeholder="Reason for visit"
                />
              </label>
              <label>
                Status
                <select name="status" value={patientForm.status} onChange={handleFormChange}>
                  <option>Scheduled</option>
                  <option>Checked in</option>
                  <option>Needs vitals</option>
                  <option>Doctor review</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </label>
              <label>
                Last visit
                <input
                  name="lastVisit"
                  value={patientForm.lastVisit}
                  onChange={handleFormChange}
                  placeholder="YYYY-MM-DD or New patient"
                />
              </label>
              <label>
                Notes
                <input
                  min="0"
                  name="noteCount"
                  value={patientForm.noteCount}
                  onChange={handleFormChange}
                  type="number"
                />
              </label>

              {formError && <p className="formMessage error">{formError}</p>}
              {formStatus === 'Saved' && <p className="formMessage">Patient saved.</p>}

              <button className="primaryButton" disabled={formStatus === 'Saving'} type="submit">
                {formStatus === 'Saving' ? 'Saving...' : 'Save patient'}
              </button>
            </form>
          </section>

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
