import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  HeartPulse,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

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
  const [formMode, setFormMode] = useState('closed');
  const [patientForm, setPatientForm] = useState(emptyPatientForm);
  const [formStatus, setFormStatus] = useState('Idle');
  const [formError, setFormError] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [notice, setNotice] = useState(null);
  const [patientPendingDelete, setPatientPendingDelete] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState('Idle');

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
    setPatientPendingDelete(null);
  }

  function startEditingPatient(patient = selectedPatient) {
    if (!patient) return;
    setSelectedPatientId(patient.id);
    setSelectedPatient(patient);
    setFormMode('edit');
    setFormFromPatient(patient);
    setFormError('');
    setFormStatus('Idle');
    setPatientPendingDelete(null);
  }

  function closePatientForm() {
    setFormMode('closed');
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
        const wasEditing = isEditing;
        setSelectedPatient(patient);
        setSelectedPatientId(patient.id);
        setFormFromPatient(patient);
        setFormStatus('Saved');
        setFormMode('closed');
        setNotice({
          tone: 'success',
          title: wasEditing ? 'Patient updated' : 'Patient added',
          text: `${patient.name} is now saved in the patient list.`,
        });
        return refreshPatients(patient.id);
      })
      .catch(() => {
        setFormStatus('Error');
        setFormError('Could not save patient. Check the API and try again.');
      });
  }

  function handleDeletePatient(patient) {
    if (!patient) return;
    setPatientPendingDelete(patient);
    setDeleteStatus('Idle');
    setPatientsError('');
  }

  function closeDeleteDialog() {
    if (deleteStatus === 'Deleting') return;
    setPatientPendingDelete(null);
    setDeleteStatus('Idle');
  }

  function confirmDeletePatient() {
    if (!patientPendingDelete) return;
    const patient = patientPendingDelete;

    setDeleteStatus('Deleting');
    setPatientsState('Loading');
    setFormError('');

    fetch(`/api/patients/${encodeURIComponent(patient.id)}`, {
      method: 'DELETE',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        if (patient.id === selectedPatientId) {
          setSelectedPatient(null);
          setSelectedPatientId('');
          closePatientForm();
        }
        setNotice({
          tone: 'success',
          title: 'Patient removed',
          text: `${patient.name} was removed from the patient list.`,
        });
        setPatientPendingDelete(null);
        setDeleteStatus('Idle');
        return refreshPatients();
      })
      .catch(() => {
        setPatientsState('Loaded');
        setDeleteStatus('Error');
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

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

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

  const patientFormSection = (
    <section className="formCard" aria-labelledby="patient-form-title">
      <div className="formHeader">
        <div>
          <p className="eyebrow">{formMode === 'edit' ? 'Modify patient' : 'Add patient'}</p>
          <h2 id="patient-form-title">
            {formMode === 'edit' ? 'Update patient file' : 'Create patient'}
          </h2>
        </div>
        <button type="button" aria-label="Close patient form" onClick={closePatientForm}>
          <X size={18} />
        </button>
      </div>

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

        <button className="primaryButton" disabled={formStatus === 'Saving'} type="submit">
          {formStatus === 'Saving' ? 'Saving...' : 'Save patient'}
        </button>
      </form>
    </section>
  );

  return (
    <main className="appShell">
      {notice && (
        <div className={`toast ${notice.tone}`} role="status">
          <CheckCircle2 size={18} />
          <div>
            <strong>{notice.title}</strong>
            <span>{notice.text}</span>
          </div>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {patientPendingDelete && (
        <div className="modalOverlay" role="presentation" onClick={closeDeleteDialog}>
          <section
            className="confirmDialog"
            role="dialog"
            aria-labelledby="delete-patient-title"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="warningIcon">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="eyebrow">Remove patient</p>
              <h2 id="delete-patient-title">Delete {patientPendingDelete.name}?</h2>
              <p>
                This removes the patient from the shared development database. This action cannot be
                undone from this screen.
              </p>
            </div>

            {deleteStatus === 'Error' && (
              <p className="formMessage error">
                Could not delete patient. Check the API and try again.
              </p>
            )}

            <div className="confirmActions">
              <button type="button" onClick={closeDeleteDialog}>
                Cancel
              </button>
              <button
                className="dangerButton"
                disabled={deleteStatus === 'Deleting'}
                type="button"
                onClick={confirmDeletePatient}
              >
                {deleteStatus === 'Deleting' ? 'Deleting...' : 'Delete patient'}
              </button>
            </div>
          </section>
        </div>
      )}

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

        <nav className="topNav" aria-label="Main section">
          <a href="#patients">Patients</a>
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
                <Plus size={16} />
                Add patient
              </button>
              <button type="button" onClick={() => setManageMode((currentMode) => !currentMode)}>
                {manageMode ? <X size={16} /> : <Pencil size={16} />}
                {manageMode ? 'Done' : 'Edit'}
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
              <article
                className={patient.id === selectedPatientId ? 'patientRow selected' : 'patientRow'}
                key={patient.id}
              >
                <button
                  className="patientSelect"
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

                {manageMode && (
                  <div className="patientRowActions" aria-label={`Manage ${patient.name}`}>
                    <button type="button" onClick={() => startEditingPatient(patient)}>
                      <Pencil size={16} />
                      <span>Modify</span>
                    </button>
                    <button type="button" onClick={() => handleDeletePatient(patient)}>
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside className="sidePanel">
          {formMode === 'edit' ? (
            patientFormSection
          ) : (
            <section className="detailCard" aria-labelledby="patient-detail-title">
              <div className="iconBox">
                <HeartPulse size={20} />
              </div>
              <p className="eyebrow">Patient file</p>
              <h2 id="patient-detail-title">{selectedPatient?.name || 'Select a patient'}</h2>

              {selectedPatientState === 'Loading' && (
                <p className="detailMessage">Loading patient details...</p>
              )}

              {selectedPatientError && (
                <p className="detailMessage error">{selectedPatientError}</p>
              )}

              {selectedPatientState === 'Loaded' && selectedPatient && (
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
              )}
            </section>
          )}

          {formMode === 'create' && patientFormSection}
        </aside>
      </section>
    </main>
  );
}
