import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  FileText,
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
  lastVisit: '',
  noteCount: 0,
};

const emptyAppointmentForm = {
  scheduledDate: '2026-06-28',
  scheduledTime: '',
  reason: '',
  status: 'Scheduled',
};

const emptyNoteForm = {
  appointmentId: '',
  text: '',
};

export default function App() {
  const [apiState, setApiState] = useState('Checking');
  const [patients, setPatients] = useState([]);
  const [patientsState, setPatientsState] = useState('Loading');
  const [patientsError, setPatientsError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentsState, setAppointmentsState] = useState('Loading');
  const [appointmentsError, setAppointmentsError] = useState('');
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
  const [appointmentFormMode, setAppointmentFormMode] = useState('closed');
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointmentForm);
  const [appointmentFormStatus, setAppointmentFormStatus] = useState('Idle');
  const [appointmentFormError, setAppointmentFormError] = useState('');
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState('');
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [timelineState, setTimelineState] = useState('Idle');
  const [timelineError, setTimelineError] = useState('');
  const [noteFormMode, setNoteFormMode] = useState('closed');
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [noteFormStatus, setNoteFormStatus] = useState('Idle');
  const [noteFormError, setNoteFormError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  const refreshWorkspace = useCallback((preferredPatientId) => {
    setPatientsState('Loading');
    setAppointmentsState('Loading');

    const patientsRequest = fetch('/api/patients').then((res) =>
      res.ok ? res.json() : Promise.reject(res),
    );
    const appointmentsRequest = fetch('/api/appointments').then((res) =>
      res.ok ? res.json() : Promise.reject(res),
    );

    return Promise.allSettled([patientsRequest, appointmentsRequest]).then(
      ([patientsResult, appointmentsResult]) => {
        if (patientsResult.status === 'fulfilled') {
          setPatients(patientsResult.value);
          setPatientsState('Loaded');
          setPatientsError('');

          if (patientsResult.value.length > 0) {
            setSelectedPatientId(
              (currentId) => preferredPatientId || currentId || patientsResult.value[0].id,
            );
          } else {
            setSelectedPatientId('');
            setSelectedPatient(null);
          }
        } else {
          setPatients([]);
          setPatientsState('Offline');
          setPatientsError('Patients are unavailable. Start the API and refresh.');
        }

        if (appointmentsResult.status === 'fulfilled') {
          setAppointments(appointmentsResult.value);
          setAppointmentsState('Loaded');
          setAppointmentsError('');
        } else {
          setAppointments([]);
          setAppointmentsState('Offline');
          setAppointmentsError('Visits are unavailable. Patient records are still shown.');
        }

        return {
          patients: patientsResult.status === 'fulfilled' ? patientsResult.value : [],
          appointments: appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : [],
        };
      },
    );
  }, []);

  const setFormFromPatient = useCallback((patient) => {
    setPatientForm({
      name: patient.name || '',
      dob: patient.dob || '',
      contact: patient.contact || '',
      lastVisit: patient.lastVisit || '',
      noteCount: patient.noteCount || 0,
    });
  }, []);

  function findAppointment(appointmentId) {
    return appointments.find((appointment) => appointment.id === appointmentId);
  }

  function setAppointmentFormFromVisit(appointment) {
    setAppointmentForm({
      scheduledDate: appointment?.scheduledDate || '2026-06-28',
      scheduledTime: appointment?.scheduledTime || '',
      reason: appointment?.reason || '',
      status: appointment?.status || 'Scheduled',
    });
  }

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
    setAppointmentFormMode('closed');
    setVisitsOpen(false);
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
    setAppointmentFormMode('closed');
    setVisitsOpen(false);
  }

  function closePatientForm() {
    setFormMode('closed');
    setFormError('');
    setFormStatus('Idle');
  }

  function startAppointmentForm(mode, appointmentId = '') {
    if (!selectedPatient) return;
    const existingAppointment = appointmentId ? findAppointment(appointmentId) : null;
    setAppointmentFormMode(mode);
    setAppointmentFormFromVisit(existingAppointment);
    setEditingAppointmentId(appointmentId);
    setAppointmentFormError('');
    setAppointmentFormStatus('Idle');
    setVisitsOpen(true);
  }

  function closeAppointmentForm() {
    setAppointmentFormMode('closed');
    setAppointmentFormError('');
    setAppointmentFormStatus('Idle');
    setEditingAppointmentId('');
  }

  function closeNoteForm() {
    setNoteFormMode('closed');
    setNoteFormError('');
    setNoteFormStatus('Idle');
    setEditingNoteId('');
  }

  function selectPatient(patientId) {
    setSelectedPatientId(patientId);
    closeAppointmentForm();
    closeNoteForm();
    setVisitsOpen(false);
    setTimelineOpen(false);
  }

  function handleAppointmentFormChange(event) {
    const { name, value } = event.target;
    setAppointmentForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleNoteFormChange(event) {
    const { name, value } = event.target;
    setNoteForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function loadTimeline(patientId = selectedPatientId) {
    if (!patientId) return Promise.resolve();

    setTimelineState('Loading');
    setTimelineError('');

    return fetch(`/api/patients/${encodeURIComponent(patientId)}/timeline`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setTimeline(data.timeline || []);
        setSelectedPatient(data.patient);
        setTimelineState('Loaded');
        setTimelineError('');
        return data;
      })
      .catch(() => {
        setTimeline([]);
        setTimelineState('Offline');
        setTimelineError('Timeline is unavailable. Check the API and try again.');
      });
  }

  function toggleTimeline() {
    if (timelineOpen) {
      setTimelineOpen(false);
      closeNoteForm();
      return;
    }

    closeAppointmentForm();
    setVisitsOpen(false);
    setTimelineOpen(true);
    loadTimeline();
  }

  function startNoteForm(mode, note) {
    if (!selectedPatient) return;

    setNoteFormMode(mode);
    setEditingNoteId(note?.id || '');
    setNoteForm({
      appointmentId: note?.appointmentId || '',
      text: note?.text || '',
    });
    setNoteFormError('');
    setNoteFormStatus('Idle');
    setTimelineOpen(true);
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
        setAppointmentFormMode('closed');
        setNotice({
          tone: 'success',
          title: wasEditing ? 'Patient updated' : 'Patient added',
          text: `${patient.name} is now saved in the patient list.`,
        });
        return refreshWorkspace(patient.id);
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
    setAppointmentsState('Loading');
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
          closeAppointmentForm();
          closeNoteForm();
          setVisitsOpen(false);
          setTimelineOpen(false);
        }
        setNotice({
          tone: 'success',
          title: 'Patient removed',
          text: `${patient.name} was removed from the patient list.`,
        });
        setPatientPendingDelete(null);
        setDeleteStatus('Idle');
        return refreshWorkspace();
      })
      .catch(() => {
        setAppointmentsState('Loaded');
        setDeleteStatus('Error');
      });
  }

  function handleAppointmentSubmit(event) {
    event.preventDefault();
    if (!selectedPatientId) return;

    const existingAppointment = editingAppointmentId ? findAppointment(editingAppointmentId) : null;
    const isEditing = appointmentFormMode === 'edit' && existingAppointment;
    const url = isEditing
      ? `/api/appointments/${encodeURIComponent(existingAppointment.id)}`
      : '/api/appointments';

    setAppointmentFormStatus('Saving');
    setAppointmentFormError('');

    fetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...appointmentForm,
        patientId: selectedPatientId,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((appointment) => {
        setAppointmentFormStatus('Saved');
        setAppointmentFormMode('closed');
        setEditingAppointmentId('');
        setVisitsOpen(true);
        setTimelineOpen(false);
        setNotice({
          tone: 'success',
          title: isEditing ? 'Visit updated' : 'Visit scheduled',
          text: `${appointment.patient.name} is set for ${appointment.scheduledTime || appointment.scheduledDate}.`,
        });
        return refreshWorkspace(selectedPatientId);
      })
      .catch(() => {
        setAppointmentFormStatus('Error');
        setAppointmentFormError('Could not save visit. Check the API and try again.');
      });
  }

  function handleNoteSubmit(event) {
    event.preventDefault();
    if (!selectedPatientId) return;

    const isEditing = noteFormMode === 'edit' && editingNoteId;
    const url = isEditing ? `/api/notes/${encodeURIComponent(editingNoteId)}` : '/api/notes';

    setNoteFormStatus('Saving');
    setNoteFormError('');

    fetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...noteForm,
        patientId: selectedPatientId,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        setNoteFormStatus('Saved');
        closeNoteForm();
        setTimelineOpen(true);
        setNotice({
          tone: 'success',
          title: isEditing ? 'Note updated' : 'Note added',
          text: `${selectedPatient?.name || 'Patient'} timeline is up to date.`,
        });
        return Promise.all([loadTimeline(selectedPatientId), refreshWorkspace(selectedPatientId)]);
      })
      .catch(() => {
        setNoteFormStatus('Error');
        setNoteFormError('Could not save note. Check the API and try again.');
      });
  }

  function deleteNote(note) {
    if (!note) return;

    fetch(`/api/notes/${encodeURIComponent(note.id)}`, {
      method: 'DELETE',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        setNotice({
          tone: 'success',
          title: 'Note removed',
          text: `${selectedPatient?.name || 'Patient'} timeline is up to date.`,
        });
        return Promise.all([loadTimeline(selectedPatientId), refreshWorkspace(selectedPatientId)]);
      })
      .catch(() => {
        setTimelineError('Could not delete note. Check the API and try again.');
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
    refreshWorkspace();
  }, [refreshWorkspace]);

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
    {
      label: 'Visits API',
      state: appointmentsState,
      icon: appointmentsState === 'Loaded' ? CheckCircle2 : CircleDashed,
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

  const selectedPatientVisits = appointments.filter(
    (appointment) => appointment.patientId === selectedPatientId,
  );
  const appointmentFormOpen = appointmentFormMode !== 'closed';
  const filteredPatients = patients.filter((patient) => {
    const search = patientSearch.trim().toLowerCase();
    if (!search) return true;

    return [patient.name, patient.id, patient.contact, patient.status, patient.reason]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

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
      </header>

      <section className="overview" id="top" aria-labelledby="overview-title">
        <img
          className="heroBackground"
          src="/brand/clinikit-hero-background.webp"
          alt=""
          aria-hidden="true"
        />

        <div className="overviewCopy">
          <p className="eyebrow">Doctor workspace</p>
          <h1 id="overview-title">Clinic AI Copilot</h1>
          <p>Review today&apos;s visits and update patient records.</p>
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
              <p className="eyebrow">Records</p>
              <h2>Patients{patientsState === 'Loaded' ? ` (${patients.length})` : ''}</h2>
            </div>
            <div className="panelActions">
              <label className="patientSearch">
                <span>Search patients</span>
                <input
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Search patients..."
                  type="search"
                />
              </label>
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
            <div className="patientTableHeader" aria-hidden="true">
              <span>Patient name</span>
              <span>DOB / age</span>
              <span>Contact</span>
              <span>Last visit</span>
              <span>Notes</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {patientsState === 'Loading' && <p className="patientMessage">Loading patients...</p>}

            {patientsError && <p className="patientMessage error">{patientsError}</p>}
            {appointmentsError && <p className="patientMessage error">{appointmentsError}</p>}

            {patientsState === 'Loaded' && patients.length === 0 && (
              <p className="patientMessage">No patients found.</p>
            )}

            {patientsState === 'Loaded' && patients.length > 0 && filteredPatients.length === 0 && (
              <p className="patientMessage">No patients match that search.</p>
            )}

            {filteredPatients.map((patient) => (
              <article
                className={patient.id === selectedPatientId ? 'patientRow selected' : 'patientRow'}
                key={patient.id}
              >
                <button
                  className="patientSelect"
                  type="button"
                  aria-pressed={patient.id === selectedPatientId}
                  onClick={() => selectPatient(patient.id)}
                >
                  <div className="patientIdentity">
                    <span className="patientAvatar" aria-hidden="true">
                      {patient.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <span>
                      <strong>{patient.name}</strong>
                      <small>ID: {patient.id}</small>
                    </span>
                  </div>
                  <div>
                    <span>{patient.dob || 'Not set'}</span>
                    <small>
                      {patient.lastVisit === 'New patient' ? 'New patient' : 'Patient file'}
                    </small>
                  </div>
                  <span>{patient.contact || 'No contact'}</span>
                  <span>{patient.lastVisit || 'None'}</span>
                  <span>{patient.noteCount}</span>
                  <span className="statusPill">{patient.status || 'Scheduled'}</span>
                </button>

                <div className="patientRowActions" aria-label={`Manage ${patient.name}`}>
                  {manageMode ? (
                    <>
                      <button type="button" onClick={() => startEditingPatient(patient)}>
                        <Pencil size={16} />
                        <span>Modify</span>
                      </button>
                      <button
                        className="deleteRowButton"
                        type="button"
                        onClick={() => handleDeletePatient(patient)}
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => selectPatient(patient.id)}>
                      View
                    </button>
                  )}
                </div>
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
                  </dl>

                  <div className="recordActions">
                    <button
                      type="button"
                      onClick={() => {
                        setVisitsOpen((current) => !current);
                        setTimelineOpen(false);
                        closeNoteForm();
                      }}
                    >
                      {visitsOpen ? 'Hide visits' : `View visits (${selectedPatientVisits.length})`}
                    </button>
                    <button type="button" onClick={toggleTimeline}>
                      {timelineOpen ? 'Hide timeline' : 'Timeline'}
                    </button>
                  </div>

                  {visitsOpen && (
                    <section className="visitPanel" aria-labelledby="visit-panel-title">
                      <div className="visitPanelHeader">
                        <div>
                          <p className="eyebrow">Visits</p>
                          <h3 id="visit-panel-title">Patient visits</h3>
                        </div>
                        {!appointmentFormOpen && (
                          <button type="button" onClick={() => startAppointmentForm('create')}>
                            Schedule visit
                          </button>
                        )}
                      </div>

                      {!appointmentFormOpen && (
                        <div className="visitList">
                          <div className="visitTableHeader" aria-hidden="true">
                            <span>Date / time</span>
                            <span>Reason</span>
                            <span>Type</span>
                            <span>Status</span>
                            <span>Actions</span>
                          </div>

                          {selectedPatientVisits.length === 0 && (
                            <p className="detailMessage">No visits found.</p>
                          )}

                          {selectedPatientVisits.map((visit) => {
                            const visitCategory =
                              visit.status === 'Completed' ||
                              visit.status === 'Cancelled' ||
                              visit.scheduledDate < '2026-06-28'
                                ? 'Previous'
                                : 'Scheduled';
                            const visitDateTime = visit.scheduledTime
                              ? `${visit.scheduledDate}T${visit.scheduledTime}`
                              : visit.scheduledDate;

                            return (
                              <article className="visitRow" key={visit.id}>
                                <div className="visitDateCell">
                                  <time dateTime={visitDateTime}>
                                    {visit.scheduledDate} {visit.scheduledTime}
                                  </time>
                                </div>
                                <strong>{visit.reason || 'No reason'}</strong>
                                <span>{visitCategory}</span>
                                <span className="statusPill">{visit.status}</span>
                                <button
                                  type="button"
                                  onClick={() => startAppointmentForm('edit', visit.id)}
                                >
                                  Edit
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      )}

                      {appointmentFormOpen && (
                        <form className="visitForm" onSubmit={handleAppointmentSubmit}>
                          <label>
                            Date
                            <input
                              name="scheduledDate"
                              type="date"
                              value={appointmentForm.scheduledDate}
                              onChange={handleAppointmentFormChange}
                            />
                          </label>
                          <label>
                            Time
                            <input
                              name="scheduledTime"
                              type="time"
                              value={appointmentForm.scheduledTime}
                              onChange={handleAppointmentFormChange}
                            />
                          </label>
                          <label>
                            Status
                            <select
                              name="status"
                              value={appointmentForm.status}
                              onChange={handleAppointmentFormChange}
                            >
                              <option>Scheduled</option>
                              <option>Checked in</option>
                              <option>Needs vitals</option>
                              <option>Doctor review</option>
                              <option>Completed</option>
                              <option>Cancelled</option>
                            </select>
                          </label>
                          <label className="wideField">
                            Reason
                            <input
                              name="reason"
                              value={appointmentForm.reason}
                              onChange={handleAppointmentFormChange}
                              placeholder="Visit reason"
                            />
                          </label>

                          {appointmentFormError && (
                            <p className="formMessage error">{appointmentFormError}</p>
                          )}

                          <div className="formActions">
                            <button type="button" onClick={closeAppointmentForm}>
                              Cancel
                            </button>
                            <button
                              className="primaryButton"
                              disabled={appointmentFormStatus === 'Saving'}
                              type="submit"
                            >
                              {appointmentFormStatus === 'Saving' ? 'Saving...' : 'Save visit'}
                            </button>
                          </div>
                        </form>
                      )}
                    </section>
                  )}

                  {timelineOpen && (
                    <section className="timelinePanel" aria-labelledby="timeline-panel-title">
                      <div className="timelineHeader">
                        <div>
                          <p className="eyebrow">Timeline</p>
                          <h3 id="timeline-panel-title">Visits and notes</h3>
                        </div>
                        {noteFormMode === 'closed' && (
                          <button type="button" onClick={() => startNoteForm('create')}>
                            Add note
                          </button>
                        )}
                      </div>

                      {timelineError && <p className="detailMessage error">{timelineError}</p>}
                      {timelineState === 'Loading' && (
                        <p className="detailMessage">Loading timeline...</p>
                      )}

                      {noteFormMode !== 'closed' && (
                        <form className="noteForm" onSubmit={handleNoteSubmit}>
                          <label>
                            Visit
                            <select
                              name="appointmentId"
                              value={noteForm.appointmentId}
                              onChange={handleNoteFormChange}
                            >
                              <option value="">Standalone note</option>
                              {selectedPatientVisits.map((visit) => (
                                <option key={visit.id} value={visit.id}>
                                  {visit.scheduledDate} {visit.scheduledTime} -{' '}
                                  {visit.reason || 'Visit'}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Note
                            <textarea
                              name="text"
                              value={noteForm.text}
                              onChange={handleNoteFormChange}
                              placeholder="Write the clinical note"
                              required
                            />
                          </label>

                          {noteFormError && <p className="formMessage error">{noteFormError}</p>}

                          <div className="formActions">
                            <button type="button" onClick={closeNoteForm}>
                              Cancel
                            </button>
                            <button
                              className="primaryButton"
                              disabled={noteFormStatus === 'Saving'}
                              type="submit"
                            >
                              {noteFormStatus === 'Saving' ? 'Saving...' : 'Save note'}
                            </button>
                          </div>
                        </form>
                      )}

                      {noteFormMode === 'closed' && timelineState === 'Loaded' && (
                        <div className="timelineList">
                          <div className="timelineTableHeader" aria-hidden="true">
                            <span>Date</span>
                            <span>Type</span>
                            <span>Summary</span>
                            <span>Status</span>
                            <span>Actions</span>
                          </div>

                          {timeline.length === 0 && (
                            <p className="detailMessage">No timeline entries yet.</p>
                          )}

                          {timeline.map((item) => (
                            <article className="timelineItem" key={`${item.type}-${item.id}`}>
                              <div>
                                <time dateTime={item.date}>
                                  {item.date?.slice(0, 10)}
                                  {item.time ? ` ${item.time}` : ''}
                                </time>
                              </div>
                              <span className="timelineType">
                                {item.type === 'note' ? (
                                  <FileText size={14} />
                                ) : (
                                  <HeartPulse size={14} />
                                )}
                                {item.type === 'note' ? 'Note' : 'Visit'}
                              </span>
                              <div>
                                <strong>{item.title}</strong>
                                {item.text && <p>{item.text}</p>}
                              </div>
                              <span>
                                {item.status ||
                                  (item.appointmentId ? 'Visit-linked' : 'Standalone')}
                              </span>
                              {item.type === 'note' && (
                                <div className="timelineActions">
                                  <button type="button" onClick={() => startNoteForm('edit', item)}>
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => deleteNote(item)}>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </section>
          )}

          {formMode === 'create' && patientFormSection}
        </aside>
      </section>
    </main>
  );
}
