import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  FileText,
  HeartPulse,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const authStorageKey = 'clinic-ai-auth';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required for production builds.');
}

const apiBaseUrl = configuredApiBaseUrl || 'http://localhost:3001';
const patientPageLimit = 10;
const appointmentPageLimit = 8;
const detailPageLimit = 5;
const noteSearchPageLimit = 6;
const auditLogPageLimit = 8;
const visitStatuses = Object.freeze([
  'Scheduled',
  'Checked in',
  'Needs vitals',
  'Doctor review',
  'Completed',
  'Cancelled',
]);

function getTodayDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function calculateAge(dob) {
  if (!dob) return null;

  const birthDate = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) age -= 1;

  return age;
}

function formatDobWithAge(dob) {
  if (!dob) return 'DOB: Not set';

  const age = calculateAge(dob);
  if (age === null) return `DOB: ${dob}`;

  return `DOB: ${dob} (${age}y)`;
}

function formatAge(dob) {
  const age = calculateAge(dob);
  return age === null ? 'Not set' : `${age}y`;
}

function formatDateTime(value) {
  if (!value) return 'Not set';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAuditAction(action) {
  return String(action || '')
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replaceAll('_', ' '))
    .join(' ');
}

const emptyPatientForm = {
  name: '',
  dob: '',
  contact: '',
  lastVisit: '',
};

function createEmptyAppointmentForm() {
  return {
    scheduledDate: getTodayDateString(),
    scheduledTime: '',
    reason: '',
    status: 'Scheduled',
  };
}

const emptyNoteForm = {
  appointmentId: '',
  text: '',
};

const emptyAiSummaryDraft = {
  shortSummary: '',
  keySymptoms: '',
  assessment: '',
  plan: '',
};

const emptyAuthForm = {
  name: '',
  email: '',
  password: '',
};

function loadStoredSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(authStorageKey) || 'null');
    return session?.token && session?.doctor ? session : null;
  } catch {
    return null;
  }
}

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function buildQuery(params) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

function paginationFromResponse(res, page, limit) {
  return {
    page: Number(res.headers.get('X-Pagination-Page')) || page,
    limit: Number(res.headers.get('X-Pagination-Limit')) || limit,
    hasNextPage: res.headers.get('X-Pagination-Has-Next-Page') === 'true',
  };
}

function createPagination(limit) {
  return {
    page: 1,
    limit,
    hasNextPage: false,
  };
}

function PaginationControls({ disabled = false, label, onNext, onPrevious, pagination }) {
  return (
    <nav className="paginationBar" aria-label={`${label} pagination`}>
      <span>
        {label} page {pagination.page}
      </span>
      <div>
        <button type="button" disabled={disabled || pagination.page <= 1} onClick={onPrevious}>
          Previous
        </button>
        <button type="button" disabled={disabled || !pagination.hasNextPage} onClick={onNext}>
          Next
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const storedSession = loadStoredSession();
  const [authToken, setAuthToken] = useState(storedSession?.token || '');
  const [doctor, setDoctor] = useState(storedSession?.doctor || null);
  const [authMode, setAuthMode] = useState('landing');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authStatus, setAuthStatus] = useState(authToken ? 'Checking' : 'Idle');
  const [authError, setAuthError] = useState('');
  const [patients, setPatients] = useState([]);
  const [patientsState, setPatientsState] = useState('Loading');
  const [patientsError, setPatientsError] = useState('');
  const [patientsPage, setPatientsPage] = useState(1);
  const [patientsPagination, setPatientsPagination] = useState(createPagination(patientPageLimit));
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [todayAppointmentsState, setTodayAppointmentsState] = useState('Loading');
  const [todayAppointmentsError, setTodayAppointmentsError] = useState('');
  const [todayAppointmentsPage, setTodayAppointmentsPage] = useState(1);
  const [todayAppointmentsPagination, setTodayAppointmentsPagination] = useState(
    createPagination(appointmentPageLimit),
  );
  const [appointments, setAppointments] = useState([]);
  const [appointmentsState, setAppointmentsState] = useState('Loading');
  const [appointmentsError, setAppointmentsError] = useState('');
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsPagination, setAppointmentsPagination] = useState(
    createPagination(detailPageLimit),
  );
  const [visitArchiveMode, setVisitArchiveMode] = useState('active');
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
  const [appointmentFormContext, setAppointmentFormContext] = useState('patient');
  const [appointmentPatientId, setAppointmentPatientId] = useState('');
  const [appointmentForm, setAppointmentForm] = useState(createEmptyAppointmentForm);
  const [appointmentFormStatus, setAppointmentFormStatus] = useState('Idle');
  const [appointmentFormError, setAppointmentFormError] = useState('');
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState('');
  const [archivingAppointmentId, setArchivingAppointmentId] = useState('');
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [appointmentNote, setAppointmentNote] = useState(null);
  const [appointmentNoteText, setAppointmentNoteText] = useState('');
  const [appointmentNoteStatus, setAppointmentNoteStatus] = useState('Idle');
  const [appointmentNoteError, setAppointmentNoteError] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryDraft, setAiSummaryDraft] = useState(emptyAiSummaryDraft);
  const [aiSummaryStatus, setAiSummaryStatus] = useState('Idle');
  const [aiSummaryError, setAiSummaryError] = useState('');
  const [aiSummaryEditing, setAiSummaryEditing] = useState(false);
  const [previousVisitsOpen, setPreviousVisitsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [timelineState, setTimelineState] = useState('Idle');
  const [timelineError, setTimelineError] = useState('');
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelinePagination, setTimelinePagination] = useState(createPagination(detailPageLimit));
  const [noteFormMode, setNoteFormMode] = useState('closed');
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [noteFormStatus, setNoteFormStatus] = useState('Idle');
  const [noteFormError, setNoteFormError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteSearchTerm, setNoteSearchTerm] = useState('');
  const [noteSearchResults, setNoteSearchResults] = useState([]);
  const [noteSearchState, setNoteSearchState] = useState('Idle');
  const [noteSearchError, setNoteSearchError] = useState('');
  const [noteSearchPage, setNoteSearchPage] = useState(1);
  const [noteSearchPagination, setNoteSearchPagination] = useState(
    createPagination(noteSearchPageLimit),
  );
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsState, setAuditLogsState] = useState('Idle');
  const [auditLogsError, setAuditLogsError] = useState('');
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsPagination, setAuditLogsPagination] = useState(
    createPagination(auditLogPageLimit),
  );
  const deleteDialogRef = useRef(null);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(authStorageKey);
    setAuthToken('');
    setDoctor(null);
    setPatients([]);
    setTodayAppointments([]);
    setAppointments([]);
    setTimeline([]);
    setNoteSearchResults([]);
    setAuditLogs([]);
    setActiveAppointment(null);
    setAppointmentNote(null);
    setAppointmentNoteText('');
    setAiSummary(null);
    setAiSummaryDraft({ ...emptyAiSummaryDraft });
    setAiSummaryStatus('Idle');
    setAiSummaryError('');
    setAiSummaryEditing(false);
    setSelectedPatientId('');
    setSelectedPatient(null);
    setAuthStatus('Idle');
    setPatientsPage(1);
    setTodayAppointmentsPage(1);
    setAppointmentsPage(1);
    setTimelinePage(1);
    setNoteSearchPage(1);
    setAuditLogsPage(1);
  }, []);

  const apiFetch = useCallback(
    (url, options = {}) =>
      fetch(apiUrl(url), {
        ...options,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
      }).then((res) => {
        if (res.status === 401) {
          clearSession();
        }

        return res;
      }),
    [authToken, clearSession],
  );

  const resetAiSummaryState = useCallback(() => {
    setAiSummary(null);
    setAiSummaryDraft({ ...emptyAiSummaryDraft });
    setAiSummaryStatus('Idle');
    setAiSummaryError('');
    setAiSummaryEditing(false);
  }, []);

  const applyAiSummary = useCallback(
    (summary) => {
      if (!summary) {
        resetAiSummaryState();
        return;
      }

      setAiSummary(summary);
      setAiSummaryDraft({
        shortSummary: summary.shortSummary || '',
        keySymptoms: summary.keySymptoms || '',
        assessment: summary.assessment || '',
        plan: summary.plan || '',
      });
      setAiSummaryStatus(
        summary.status === 'approved'
          ? 'Reviewed'
          : summary.status === 'rejected'
            ? 'Rejected'
            : 'Draft',
      );
      setAiSummaryError('');
      setAiSummaryEditing(false);
    },
    [resetAiSummaryState],
  );

  const refreshWorkspace = useCallback(
    (preferredPatientId) => {
      if (!authToken) return Promise.resolve({ patients: [], appointments: [] });

      setPatientsState('Loading');

      const patientsRequest = apiFetch(
        `/api/patients?${buildQuery({ page: patientsPage, limit: patientPageLimit })}`,
      ).then(async (res) => {
        if (!res.ok) throw res;

        return {
          data: await res.json(),
          pagination: paginationFromResponse(res, patientsPage, patientPageLimit),
        };
      });

      return Promise.allSettled([patientsRequest]).then(([patientsResult]) => {
        if (patientsResult.status === 'fulfilled') {
          setPatients(patientsResult.value.data);
          setPatientsPagination(patientsResult.value.pagination);
          setPatientsState('Loaded');
          setPatientsError('');

          if (patientsResult.value.data.length > 0) {
            setSelectedPatientId(
              (currentId) => preferredPatientId || currentId || patientsResult.value.data[0].id,
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

        return {
          patients: patientsResult.status === 'fulfilled' ? patientsResult.value.data : [],
          appointments: [],
        };
      });
    },
    [apiFetch, authToken, patientsPage],
  );

  const loadTodayAppointments = useCallback(
    (page = todayAppointmentsPage) => {
      if (!authToken) {
        setTodayAppointments([]);
        setTodayAppointmentsPagination(createPagination(appointmentPageLimit));
        setTodayAppointmentsState('Idle');
        return Promise.resolve([]);
      }

      setTodayAppointmentsState('Loading');
      setTodayAppointmentsError('');

      return apiFetch(
        `/api/appointments?${buildQuery({
          date: getTodayDateString(),
          page,
          limit: appointmentPageLimit,
        })}`,
      )
        .then(async (res) => {
          if (!res.ok) throw res;

          return {
            data: await res.json(),
            pagination: paginationFromResponse(res, page, appointmentPageLimit),
          };
        })
        .then(({ data, pagination }) => {
          setTodayAppointments(data);
          setTodayAppointmentsPagination(pagination);
          setTodayAppointmentsState('Loaded');
          setTodayAppointmentsError('');
          return data;
        })
        .catch(() => {
          setTodayAppointments([]);
          setTodayAppointmentsPagination(createPagination(appointmentPageLimit));
          setTodayAppointmentsState('Offline');
          setTodayAppointmentsError('Today appointments are unavailable. Check the API.');
          return [];
        });
    },
    [apiFetch, authToken, todayAppointmentsPage],
  );

  const setFormFromPatient = useCallback((patient) => {
    setPatientForm({
      name: patient.name || '',
      dob: patient.dob || '',
      contact: patient.contact || '',
      lastVisit: patient.lastVisit || '',
    });
  }, []);

  function findAppointment(appointmentId) {
    return appointments.find((appointment) => appointment.id === appointmentId);
  }

  function setAppointmentFormFromVisit(appointment) {
    setAppointmentForm({
      scheduledDate: appointment?.scheduledDate || getTodayDateString(),
      scheduledTime: appointment?.scheduledTime || '',
      reason: appointment?.reason || '',
      status: appointment?.status || 'Scheduled',
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setPatientForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  const loadAppointments = useCallback(
    (patientId = selectedPatientId, page = appointmentsPage) => {
      if (!authToken || !patientId) {
        setAppointments([]);
        setAppointmentsPagination(createPagination(detailPageLimit));
        setAppointmentsState('Idle');
        return Promise.resolve([]);
      }

      setAppointmentsState('Loading');
      setAppointmentsError('');

      return apiFetch(
        `/api/appointments?${buildQuery({
          patientId,
          page,
          limit: detailPageLimit,
          archived: visitArchiveMode === 'archived' ? 'true' : '',
        })}`,
      )
        .then(async (res) => {
          if (!res.ok) throw res;

          return {
            data: await res.json(),
            pagination: paginationFromResponse(res, page, detailPageLimit),
          };
        })
        .then(({ data, pagination }) => {
          setAppointments(data);
          setAppointmentsPagination(pagination);
          setAppointmentsState('Loaded');
          setAppointmentsError('');
          return data;
        })
        .catch(() => {
          setAppointments([]);
          setAppointmentsPagination(createPagination(detailPageLimit));
          setAppointmentsState('Offline');
          setAppointmentsError('Visits are unavailable. Patient records are still shown.');
          return [];
        });
    },
    [apiFetch, appointmentsPage, authToken, selectedPatientId, visitArchiveMode],
  );

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

  function startAppointmentForm(mode, appointmentId = '', context = 'patient') {
    if (context === 'patient' && !selectedPatient) return;
    const existingAppointment = appointmentId ? findAppointment(appointmentId) : null;
    setAppointmentFormMode(mode);
    setAppointmentFormContext(context);
    setAppointmentPatientId(existingAppointment?.patientId || selectedPatientId || '');
    setAppointmentFormFromVisit(existingAppointment);
    setEditingAppointmentId(appointmentId);
    setAppointmentFormError('');
    setAppointmentFormStatus('Idle');
    if (context === 'patient') {
      setVisitsOpen(true);
    }
    setTimelineOpen(false);
  }

  function closeAppointmentForm() {
    setAppointmentFormMode('closed');
    setAppointmentFormContext('patient');
    setAppointmentPatientId('');
    setAppointmentFormError('');
    setAppointmentFormStatus('Idle');
    setEditingAppointmentId('');
  }

  function startDashboardAppointmentForm() {
    startAppointmentForm('create', '', 'dashboard');
    window.setTimeout(() => {
      document.getElementById('appointment-schedule-form')?.scrollIntoView({ block: 'center' });
    }, 0);
  }

  function closeNoteForm() {
    setNoteFormMode('closed');
    setNoteFormError('');
    setNoteFormStatus('Idle');
    setEditingNoteId('');
  }

  function selectPatient(patientId) {
    setSelectedPatientId(patientId);
    setAppointmentPatientId(patientId);
    setAppointmentsPage(1);
    setVisitArchiveMode('active');
    setTimelinePage(1);
    closeAppointmentForm();
    closeNoteForm();
    setVisitsOpen(false);
    setTimelineOpen(false);
  }

  function previousPatientsPage() {
    setPatientsPage((currentPage) => Math.max(currentPage - 1, 1));
  }

  function nextPatientsPage() {
    setPatientsPage((currentPage) => currentPage + 1);
  }

  function previousTodayAppointmentsPage() {
    setTodayAppointmentsPage((currentPage) => Math.max(currentPage - 1, 1));
  }

  function nextTodayAppointmentsPage() {
    setTodayAppointmentsPage((currentPage) => currentPage + 1);
  }

  function previousAppointmentsPage() {
    setAppointmentsPage((currentPage) => Math.max(currentPage - 1, 1));
  }

  function nextAppointmentsPage() {
    setAppointmentsPage((currentPage) => currentPage + 1);
  }

  function showVisitArchiveMode(mode) {
    setVisitArchiveMode(mode);
    setAppointmentsPage(1);
    closeAppointmentForm();
  }

  function previousTimelinePage() {
    setTimelinePage((currentPage) => Math.max(currentPage - 1, 1));
  }

  function nextTimelinePage() {
    setTimelinePage((currentPage) => currentPage + 1);
  }

  function handleNoteSearchSubmit(event) {
    event.preventDefault();
    const search = noteSearchQuery.trim();

    setNoteSearchTerm(search);
    setNoteSearchPage(1);
    loadNoteSearch(search, 1);
  }

  function clearNoteSearch() {
    setNoteSearchQuery('');
    setNoteSearchTerm('');
    setNoteSearchPage(1);
    setNoteSearchResults([]);
    setNoteSearchPagination(createPagination(noteSearchPageLimit));
    setNoteSearchState('Idle');
    setNoteSearchError('');
  }

  function previousNoteSearchPage() {
    const page = Math.max(noteSearchPage - 1, 1);
    setNoteSearchPage(page);
    loadNoteSearch(noteSearchTerm, page);
  }

  function nextNoteSearchPage() {
    const page = noteSearchPage + 1;
    setNoteSearchPage(page);
    loadNoteSearch(noteSearchTerm, page);
  }

  function previousAuditLogsPage() {
    setAuditLogsPage((currentPage) => Math.max(currentPage - 1, 1));
  }

  function nextAuditLogsPage() {
    setAuditLogsPage((currentPage) => currentPage + 1);
  }

  function handleAppointmentFormChange(event) {
    const { name, value } = event.target;
    if (name === 'appointmentPatientId') {
      setAppointmentPatientId(value);
      return;
    }

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

  function openAppointment(appointment) {
    if (!appointment) return;

    setActiveAppointment(appointment);
    setSelectedPatientId(appointment.patientId);
    setSelectedPatient(appointment.patient || null);
    setSelectedPatientState(appointment.patient ? 'Loaded' : 'Idle');
    setAppointmentNote(null);
    setAppointmentNoteText('');
    setAppointmentNoteStatus('Loading');
    setAppointmentNoteError('');
    resetAiSummaryState();
    setPreviousVisitsOpen(false);
    setVisitsOpen(false);
    setTimelineOpen(false);
    closeAppointmentForm();
    closeNoteForm();
    window.setTimeout(() => {
      document.getElementById('appointment-workspace')?.scrollIntoView({ block: 'start' });
    }, 0);
  }

  function closeAppointmentWorkspace() {
    setActiveAppointment(null);
    setAppointmentNote(null);
    setAppointmentNoteText('');
    setAppointmentNoteStatus('Idle');
    setAppointmentNoteError('');
    resetAiSummaryState();
    setPreviousVisitsOpen(false);
  }

  const loadTimeline = useCallback(
    (patientId = selectedPatientId, page = timelinePage) => {
      if (!patientId) return Promise.resolve();

      setTimelineState('Loading');
      setTimelineError('');

      return apiFetch(
        `/api/patients/${encodeURIComponent(patientId)}/timeline?${buildQuery({
          page,
          limit: detailPageLimit,
        })}`,
      )
        .then(async (res) => {
          if (!res.ok) throw res;

          return {
            data: await res.json(),
            pagination: paginationFromResponse(res, page, detailPageLimit),
          };
        })
        .then(({ data, pagination }) => {
          setTimeline(data.timeline || []);
          setTimelinePagination(data.pagination || pagination);
          setSelectedPatient(data.patient);
          setTimelineState('Loaded');
          setTimelineError('');
          return data;
        })
        .catch(() => {
          setTimeline([]);
          setTimelinePagination(createPagination(detailPageLimit));
          setTimelineState('Offline');
          setTimelineError('Timeline is unavailable. Check the API and try again.');
        });
    },
    [apiFetch, selectedPatientId, timelinePage],
  );

  const loadAppointmentNote = useCallback(
    (appointment = activeAppointment) => {
      if (!appointment || !authToken) return Promise.resolve(null);

      setAppointmentNoteStatus('Loading');
      setAppointmentNoteError('');

      return apiFetch(
        `/api/notes?${buildQuery({
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          page: 1,
          limit: 1,
        })}`,
      )
        .then(async (res) => {
          if (!res.ok) throw res;
          return res.json();
        })
        .then((notes) => {
          const note = notes[0] || null;
          setAppointmentNote(note);
          setAppointmentNoteText(note?.text || '');
          setAppointmentNoteStatus(note ? 'Saved' : 'Idle');
          return note;
        })
        .catch(() => {
          setAppointmentNote(null);
          setAppointmentNoteStatus('Error');
          setAppointmentNoteError('Could not load the appointment note.');
          return null;
        });
    },
    [activeAppointment, apiFetch, authToken],
  );

  const loadAiSummary = useCallback(
    (note) => {
      if (!note?.id || !authToken) {
        resetAiSummaryState();
        return Promise.resolve(null);
      }

      setAiSummaryStatus('Loading');
      setAiSummaryError('');

      return apiFetch(`/api/notes/${encodeURIComponent(note.id)}/summary`)
        .then(async (res) => {
          if (!res.ok) throw res;
          return res.json();
        })
        .then((data) => {
          applyAiSummary(data.summary || null);
          return data.summary || null;
        })
        .catch(() => {
          setAiSummary(null);
          setAiSummaryDraft({ ...emptyAiSummaryDraft });
          setAiSummaryStatus('Error');
          setAiSummaryError('Could not load the AI summary.');
          setAiSummaryEditing(false);
          return null;
        });
    },
    [apiFetch, applyAiSummary, authToken, resetAiSummaryState],
  );

  const loadNoteSearch = useCallback(
    (term, page = 1) => {
      const search = term.trim();

      if (!authToken || !search) {
        setNoteSearchResults([]);
        setNoteSearchPagination(createPagination(noteSearchPageLimit));
        setNoteSearchState('Idle');
        setNoteSearchError('');
        return Promise.resolve([]);
      }

      setNoteSearchState('Loading');
      setNoteSearchError('');

      return apiFetch(
        `/api/notes/search?${buildQuery({
          q: search,
          page,
          limit: noteSearchPageLimit,
        })}`,
      )
        .then(async (res) => {
          if (!res.ok) throw res;

          return {
            data: await res.json(),
            pagination: paginationFromResponse(res, page, noteSearchPageLimit),
          };
        })
        .then(({ data, pagination }) => {
          setNoteSearchResults(data);
          setNoteSearchPagination(pagination);
          setNoteSearchState('Loaded');
          setNoteSearchError('');
          return data;
        })
        .catch(() => {
          setNoteSearchResults([]);
          setNoteSearchPagination(createPagination(noteSearchPageLimit));
          setNoteSearchState('Offline');
          setNoteSearchError('Note search is unavailable. Check the API and try again.');
          return [];
        });
    },
    [apiFetch, authToken],
  );

  const loadAuditLogs = useCallback(
    (page = auditLogsPage) => {
      if (!authToken) {
        setAuditLogs([]);
        setAuditLogsPagination(createPagination(auditLogPageLimit));
        setAuditLogsState('Idle');
        return Promise.resolve([]);
      }

      setAuditLogsState('Loading');
      setAuditLogsError('');

      return apiFetch(
        `/api/audit-logs?${buildQuery({
          page,
          limit: auditLogPageLimit,
        })}`,
      )
        .then(async (res) => {
          if (!res.ok) throw res;

          return {
            data: await res.json(),
            pagination: paginationFromResponse(res, page, auditLogPageLimit),
          };
        })
        .then(({ data, pagination }) => {
          setAuditLogs(data);
          setAuditLogsPagination(pagination);
          setAuditLogsState('Loaded');
          setAuditLogsError('');
          return data;
        })
        .catch(() => {
          setAuditLogs([]);
          setAuditLogsPagination(createPagination(auditLogPageLimit));
          setAuditLogsState('Offline');
          setAuditLogsError('Audit log is unavailable. Check the API and try again.');
          return [];
        });
    },
    [apiFetch, auditLogsPage, authToken],
  );

  function toggleTimeline() {
    if (timelineOpen) {
      setTimelineOpen(false);
      closeNoteForm();
      return;
    }

    closeAppointmentForm();
    setVisitsOpen(false);
    setTimelineOpen(true);
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

    apiFetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
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

    apiFetch(`/api/patients/${encodeURIComponent(patient.id)}`, {
      method: 'DELETE',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        if (patient.id === selectedPatientId) {
          setSelectedPatient(null);
          setSelectedPatientId('');
          setAppointments([]);
          setTimeline([]);
          setAppointmentsPage(1);
          setTimelinePage(1);
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
    const patientId = appointmentPatientId || selectedPatientId;

    if (!patientId) {
      setAppointmentFormError('Choose a patient before saving the appointment.');
      return;
    }

    const existingAppointment = editingAppointmentId ? findAppointment(editingAppointmentId) : null;
    const isEditing = appointmentFormMode === 'edit' && existingAppointment;
    const url = isEditing
      ? `/api/appointments/${encodeURIComponent(existingAppointment.id)}`
      : '/api/appointments';

    setAppointmentFormStatus('Saving');
    setAppointmentFormError('');

    apiFetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify({
        ...appointmentForm,
        patientId,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((appointment) => {
        const nextPage = isEditing ? appointmentsPage : 1;
        setSelectedPatientId(appointment.patientId);
        setSelectedPatient(appointment.patient || null);
        setAppointmentPatientId(appointment.patientId);
        setAppointmentFormStatus('Saved');
        setAppointmentFormMode('closed');
        setAppointmentFormContext('patient');
        setEditingAppointmentId('');
        if (!isEditing) setAppointmentsPage(1);
        setVisitsOpen(true);
        setTimelineOpen(false);
        setNotice({
          tone: 'success',
          title: isEditing ? 'Visit updated' : 'Visit scheduled',
          text: `${appointment.patient.name} is set for ${appointment.scheduledTime || appointment.scheduledDate}.`,
        });
        return Promise.all([
          loadAppointments(appointment.patientId, nextPage),
          loadTodayAppointments(1),
          refreshWorkspace(appointment.patientId),
        ]);
      })
      .catch(() => {
        setAppointmentFormStatus('Error');
        setAppointmentFormError('Could not save visit. Check the API and try again.');
      });
  }

  function archiveAppointment(appointment) {
    if (!appointment || archivingAppointmentId) return;

    setArchivingAppointmentId(appointment.id);
    setAppointmentsError('');

    apiFetch(`/api/appointments/${encodeURIComponent(appointment.id)}`, {
      method: 'DELETE',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        setNotice({
          tone: 'success',
          title: 'Visit archived',
          text: `${selectedPatient?.name || 'Patient'} visit history is up to date.`,
        });
        if (visitArchiveMode !== 'active') {
          setVisitArchiveMode('active');
          setAppointmentsPage(1);
        }
        return Promise.all([
          loadAppointments(selectedPatientId, visitArchiveMode === 'active' ? appointmentsPage : 1),
          timelineOpen ? loadTimeline(selectedPatientId, timelinePage) : Promise.resolve(),
          refreshWorkspace(selectedPatientId),
        ]);
      })
      .catch(() => {
        setAppointmentsError('Could not archive visit. Check the API and try again.');
      })
      .finally(() => {
        setArchivingAppointmentId('');
      });
  }

  function handleNoteSubmit(event) {
    event.preventDefault();
    if (!selectedPatientId) return;

    const isEditing = noteFormMode === 'edit' && editingNoteId;
    const url = isEditing ? `/api/notes/${encodeURIComponent(editingNoteId)}` : '/api/notes';

    setNoteFormStatus('Saving');
    setNoteFormError('');

    apiFetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify({
        ...noteForm,
        patientId: selectedPatientId,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        setNoteFormStatus('Saved');
        closeNoteForm();
        if (!isEditing) setTimelinePage(1);
        setTimelineOpen(true);
        setNotice({
          tone: 'success',
          title: isEditing ? 'Note updated' : 'Note added',
          text: `${selectedPatient?.name || 'Patient'} timeline is up to date.`,
        });
        return Promise.all([
          loadTimeline(selectedPatientId, isEditing ? timelinePage : 1),
          refreshWorkspace(selectedPatientId),
        ]);
      })
      .catch(() => {
        setNoteFormStatus('Error');
        setNoteFormError('Could not save note. Check the API and try again.');
      });
  }

  function handleAppointmentNoteSubmit(event) {
    event.preventDefault();
    if (!activeAppointment) return;

    const text = appointmentNoteText.trim();
    if (!text) {
      setAppointmentNoteError('Write a clinical note before saving.');
      return;
    }

    const isEditing = Boolean(appointmentNote?.id);
    const url = isEditing ? `/api/notes/${encodeURIComponent(appointmentNote.id)}` : '/api/notes';

    setAppointmentNoteStatus('Saving');
    setAppointmentNoteError('');

    apiFetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify({
        patientId: activeAppointment.patientId,
        appointmentId: activeAppointment.id,
        text,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((note) => {
        setAppointmentNote(note);
        setAppointmentNoteText(note.text || text);
        setAppointmentNoteStatus('Saved');
        setNotice({
          tone: 'success',
          title: 'Clinical note saved',
          text: `${activeAppointment.patient?.name || 'Patient'} note is ready for AI review.`,
        });
        return Promise.all([
          loadTimeline(activeAppointment.patientId, 1),
          refreshWorkspace(activeAppointment.patientId),
        ]);
      })
      .catch(() => {
        setAppointmentNoteStatus('Error');
        setAppointmentNoteError('Could not save the clinical note. Check the API and try again.');
      });
  }

  function handleGenerateAiSummary() {
    if (!appointmentNote) {
      setAppointmentNoteError('Save the clinical note before generating an AI summary.');
      return;
    }

    setAiSummaryStatus('Generating');
    setAiSummaryError('');
    setAiSummaryEditing(false);

    apiFetch(`/api/notes/${encodeURIComponent(appointmentNote.id)}/summarize`, {
      method: 'POST',
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Could not generate AI summary.');
        }

        return res.json();
      })
      .then((summary) => {
        applyAiSummary(summary);
        setNotice({
          tone: 'success',
          title: 'AI draft ready',
          text: 'Review the draft before saving it.',
        });
      })
      .catch(() => {
        setAiSummary(null);
        setAiSummaryStatus('Error');
        setAiSummaryError('Could not generate AI summary. Check Ollama and try again.');
      });
  }

  function handleAiSummaryDraftChange(event) {
    const { name, value } = event.target;
    setAiSummaryDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }));
    setAiSummaryError('');
  }

  function reviewAiSummary(status) {
    if (!aiSummary) return;

    const body =
      status === 'approved'
        ? {
            ...aiSummaryDraft,
            status,
          }
        : { status };

    setAiSummaryStatus('SavingReview');
    setAiSummaryError('');

    apiFetch(`/api/summaries/${encodeURIComponent(aiSummary.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Could not save AI summary review.');
        }

        return res.json();
      })
      .then((summary) => {
        applyAiSummary(summary);
        setNotice({
          tone: 'success',
          title: status === 'approved' ? 'Summary accepted' : 'Summary rejected',
          text:
            status === 'approved'
              ? 'The reviewed AI summary is saved with the note.'
              : 'The AI draft was rejected.',
        });
      })
      .catch(() => {
        setAiSummaryStatus('Error');
        setAiSummaryError('Could not save the AI summary review.');
      });
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setAuthError('');
    setAuthStatus('Idle');
  }

  function saveSession(session) {
    window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    setAuthToken(session.token);
    setDoctor(session.doctor);
    setAuthStatus('Signed in');
    setAuthError('');
    setAuthForm(emptyAuthForm);
  }

  function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthStatus('Saving');
    setAuthError('');

    const isRegistering = authMode === 'register';
    const payload = isRegistering
      ? authForm
      : {
          email: authForm.email,
          password: authForm.password,
        };

    fetch(apiUrl(isRegistering ? '/api/auth/register' : '/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Email or password is incorrect.');
        }

        if (!res.ok) throw new Error(data.error || 'Could not sign in.');
        return data;
      })
      .then(saveSession)
      .catch((error) => {
        setAuthStatus('Error');
        setAuthError(
          error instanceof TypeError
            ? 'Could not reach the API. Check that the server is running.'
            : error.message || 'Could not sign in.',
        );
      });
  }

  function signOut() {
    clearSession();
    setNotice(null);
  }

  useEffect(() => {
    if (!patientPendingDelete) return undefined;

    const dialog = deleteDialogRef.current;
    const focusableElements = dialog
      ? Array.from(
          dialog.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => !element.disabled)
      : [];
    const firstFocusable = focusableElements[0];
    const previousActiveElement = document.activeElement;

    firstFocusable?.focus();

    function handleDialogKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (deleteStatus !== 'Deleting') {
          setPatientPendingDelete(null);
          setDeleteStatus('Idle');
        }
        return;
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown);

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [deleteStatus, patientPendingDelete]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    loadTodayAppointments();
  }, [loadTodayAppointments]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (!activeAppointment) return;

    loadAppointmentNote(activeAppointment);
  }, [activeAppointment, loadAppointmentNote]);

  useEffect(() => {
    if (!appointmentNote?.id) {
      resetAiSummaryState();
      return;
    }

    loadAiSummary(appointmentNote);
  }, [appointmentNote, loadAiSummary, resetAiSummaryState]);

  useEffect(() => {
    if (!timelineOpen) return;

    loadTimeline();
  }, [loadTimeline, timelineOpen]);

  useEffect(() => {
    if (!authToken) return undefined;

    let active = true;
    setAuthStatus('Checking');

    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!active) return;
        setDoctor(data.doctor);
        setAuthStatus('Signed in');
      })
      .catch(() => {
        if (!active) return;
        clearSession();
      });

    return () => {
      active = false;
    };
  }, [apiFetch, authToken, clearSession]);

  useEffect(() => {
    if (!selectedPatientId) return undefined;

    let active = true;
    setSelectedPatientState('Loading');

    apiFetch(`/api/patients/${encodeURIComponent(selectedPatientId)}`)
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
  }, [apiFetch, formMode, selectedPatientId, setFormFromPatient]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const showAiSummaryPanel =
    Boolean(aiSummary) || ['Generating', 'SavingReview', 'Error'].includes(aiSummaryStatus);
  const isAiSummaryBusy = aiSummaryStatus === 'Generating' || aiSummaryStatus === 'SavingReview';

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
  const patientAppointmentFormOpen = appointmentFormOpen && appointmentFormContext === 'patient';
  const filteredPatients = patients.filter((patient) => {
    const search = patientSearch.trim().toLowerCase();
    if (!search) return true;

    return [patient.name, patient.id, patient.contact, patient.status, patient.reason]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  function renderAppointmentForm({ includePatientSelect = false } = {}) {
    return (
      <form className="visitForm" onSubmit={handleAppointmentSubmit}>
        {includePatientSelect && (
          <label className="wideField">
            Patient
            <select
              name="appointmentPatientId"
              value={appointmentPatientId}
              onChange={handleAppointmentFormChange}
              required
            >
              <option value="">Choose patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} - {patient.id}
                </option>
              ))}
            </select>
          </label>
        )}
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
            {visitStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
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

        {appointmentFormError && <p className="formMessage error">{appointmentFormError}</p>}

        <div className="formActions">
          <button type="button" onClick={closeAppointmentForm}>
            Cancel
          </button>
          <button
            className="primaryButton"
            disabled={appointmentFormStatus === 'Saving'}
            type="submit"
          >
            {appointmentFormStatus === 'Saving' ? 'Saving...' : 'Save appointment'}
          </button>
        </div>
      </form>
    );
  }

  if (!authToken) {
    return (
      <main className="appShell authShell">
        {authMode === 'landing' ? (
          <>
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
              <div className="authHeroActions" aria-label="Account actions">
                <button type="button" onClick={() => switchAuthMode('login')}>
                  Log in
                </button>
                <button type="button" onClick={() => switchAuthMode('register')}>
                  Sign up
                </button>
              </div>
            </header>

            <section className="overview" id="top" aria-labelledby="auth-title">
              <img
                className="heroBackground"
                src="/brand/clinikit-hero-background.webp"
                alt=""
                aria-hidden="true"
              />

              <div className="overviewCopy">
                <p className="eyebrow">Doctor workspace</p>
                <h1 id="auth-title">Clinic AI Copilot</h1>
                <p>Review today&apos;s visits and update patient records.</p>
              </div>
            </section>
          </>
        ) : (
          <section
            className={authMode === 'register' ? 'authScreen registerScreen' : 'authScreen'}
            id="top"
            aria-labelledby="auth-title"
          >
            <img
              className="heroBackground"
              src="/brand/clinikit-hero-background.webp"
              alt=""
              aria-hidden="true"
            />

            <button className="authBack" type="button" onClick={() => switchAuthMode('landing')}>
              Back
            </button>

            <div className={authMode === 'register' ? 'authPanel signupPanel' : 'authPanel'}>
              <div className="authBrandBlock">
                {authMode === 'register' ? (
                  <>
                    <p className="authKicker">Clinic AI Copilot</p>
                    <h1 id="auth-title">Create account</h1>
                    <p>Create a secure provider account</p>
                  </>
                ) : (
                  <>
                    <p className="authKicker">Clinic AI Copilot</p>
                    <h1 id="auth-title">Welcome Back</h1>
                    <p>Secure access to patient records.</p>
                  </>
                )}
              </div>

              <form className="authForm" onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <label>
                    Full name
                    <input
                      name="name"
                      value={authForm.name}
                      onChange={handleAuthChange}
                      placeholder="Dr. Jane Doe"
                      required
                    />
                  </label>
                )}
                <label>
                  {authMode === 'register' ? 'Work email' : 'Email address'}
                  <input
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder={
                      authMode === 'register' ? 'jane.doe@clinic.org' : 'provider@clinic.edu'
                    }
                    required
                    type="email"
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="At least 8 characters"
                    required
                    type="password"
                  />
                </label>

                {authError && <p className="formMessage error">{authError}</p>}

                <button className="primaryButton" disabled={authStatus === 'Saving'} type="submit">
                  {authStatus === 'Saving'
                    ? 'Please wait...'
                    : authMode === 'register'
                      ? 'Create account'
                      : 'Sign in'}
                </button>
              </form>

              <div className="authSecureLine">
                <span>Secure session</span>
              </div>

              <p className="authSwitch">
                {authMode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => switchAuthMode(authMode === 'register' ? 'login' : 'register')}
                >
                  {authMode === 'register' ? 'Log in' : 'Request access'}
                </button>
              </p>
            </div>
          </section>
        )}
      </main>
    );
  }

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
        <div className="modalOverlay" role="presentation">
          <section
            ref={deleteDialogRef}
            className="confirmDialog"
            role="dialog"
            aria-labelledby="delete-patient-title"
            aria-modal="true"
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

      <a className="skipLink" href="#appointments">
        Skip to appointments
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
        <button className="sessionButton" type="button" onClick={signOut}>
          Sign out
          {doctor?.name ? <span>{doctor.name}</span> : null}
        </button>
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
          <p>Open today&apos;s appointments, write the note, then bring in AI when ready.</p>
        </div>
      </section>

      <section className="workspace" aria-label="Doctor workspace">
        {activeAppointment ? (
          <section
            className="appointmentPage"
            id="appointment-workspace"
            aria-labelledby="appointment-workspace-title"
          >
            <div className="appointmentPageHeader">
              <button type="button" onClick={closeAppointmentWorkspace}>
                Back to appointments
              </button>
              <span className="statusPill">{activeAppointment.status}</span>
            </div>

            <section className="appointmentContextPanel">
              <div className="appointmentContextHeader">
                <div>
                  <p className="eyebrow">Appointment</p>
                  <h2 id="appointment-workspace-title">
                    {activeAppointment.patient?.name || 'Patient appointment'}
                  </h2>
                </div>
                <button type="button" onClick={() => setPreviousVisitsOpen((current) => !current)}>
                  {previousVisitsOpen ? 'Hide previous visits' : 'Previous visits'}
                </button>
              </div>

              <dl className="appointmentInfoGrid">
                <div>
                  <dt>Age</dt>
                  <dd>{formatAge(activeAppointment.patient?.dob)}</dd>
                </div>
                <div>
                  <dt>Gender</dt>
                  <dd>{activeAppointment.patient?.gender || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Patient ID</dt>
                  <dd>{activeAppointment.patientId}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{activeAppointment.patient?.contact || 'No contact'}</dd>
                </div>
              </dl>

              <div className="appointmentReasonBlock">
                <span>Reason</span>
                <strong>{activeAppointment.reason || 'No reason recorded'}</strong>
                <small>
                  {activeAppointment.scheduledDate} {activeAppointment.scheduledTime || ''}
                </small>
              </div>
            </section>

            {previousVisitsOpen && (
              <section className="previousVisitsPanel" aria-labelledby="previous-visits-title">
                <div className="timelineHeader">
                  <div>
                    <p className="eyebrow">History</p>
                    <h3 id="previous-visits-title">Previous visits</h3>
                  </div>
                </div>
                <div className="visitList">
                  <div className="visitTableHeader" aria-hidden="true">
                    <span>Date / time</span>
                    <span>Reason</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {selectedPatientVisits.length === 0 && (
                    <p className="visitEmptyState">No previous visits found.</p>
                  )}
                  {selectedPatientVisits.map((visit) => {
                    const visitDateTime = visit.scheduledTime
                      ? `${visit.scheduledDate}T${visit.scheduledTime}`
                      : visit.scheduledDate;
                    const isCurrentVisit = visit.id === activeAppointment.id;

                    return (
                      <article className="visitRow" key={visit.id}>
                        <div className="visitDateCell">
                          <time dateTime={visitDateTime}>
                            {visit.scheduledDate} {visit.scheduledTime}
                          </time>
                        </div>
                        <strong>{visit.reason || 'No reason'}</strong>
                        <span>{isCurrentVisit ? 'Current' : 'Previous'}</span>
                        <span className="statusPill">{visit.status}</span>
                        <span>{isCurrentVisit ? 'Open now' : 'History'}</span>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <form className="clinicalNotePanel" onSubmit={handleAppointmentNoteSubmit}>
              <label>
                <span>Doctor note</span>
                <textarea
                  value={appointmentNoteText}
                  onChange={(event) => {
                    setAppointmentNoteText(event.target.value);
                    setAppointmentNoteError('');
                    if (appointmentNoteStatus === 'Saved') {
                      setAppointmentNoteStatus('Editing');
                      resetAiSummaryState();
                    }
                  }}
                  placeholder="Write clinical note here..."
                  rows={12}
                />
              </label>

              {appointmentNoteError && <p className="formMessage error">{appointmentNoteError}</p>}

              <div className="appointmentNoteActions">
                <button
                  className="primaryButton"
                  disabled={appointmentNoteStatus === 'Saving'}
                  type="submit"
                >
                  {appointmentNoteStatus === 'Saving' ? 'Saving note...' : 'Save doctor note'}
                </button>
                <button
                  type="button"
                  disabled={!appointmentNote || appointmentNoteStatus === 'Saving'}
                  onClick={handleGenerateAiSummary}
                >
                  Generate AI Summary
                </button>
              </div>
            </form>

            {showAiSummaryPanel && (
              <section className="aiSummaryPanel" aria-labelledby="ai-summary-title">
                <div className="aiSummaryHeader">
                  <div>
                    <p className="eyebrow">AI draft summary</p>
                    <h3 id="ai-summary-title">Review before saving</h3>
                  </div>
                  {aiSummary && <span className="statusPill">{aiSummary.status}</span>}
                </div>

                {aiSummaryStatus === 'Generating' && (
                  <p className="formMessage">Generating draft summary...</p>
                )}
                {aiSummaryError && <p className="formMessage error">{aiSummaryError}</p>}

                {aiSummary && (
                  <>
                    {aiSummaryEditing ? (
                      <div className="aiSummaryEditor">
                        <label>
                          Short summary
                          <textarea
                            name="shortSummary"
                            value={aiSummaryDraft.shortSummary}
                            onChange={handleAiSummaryDraftChange}
                            rows={3}
                          />
                        </label>
                        <label>
                          Key symptoms
                          <textarea
                            name="keySymptoms"
                            value={aiSummaryDraft.keySymptoms}
                            onChange={handleAiSummaryDraftChange}
                            rows={3}
                          />
                        </label>
                        <label>
                          Assessment
                          <textarea
                            name="assessment"
                            value={aiSummaryDraft.assessment}
                            onChange={handleAiSummaryDraftChange}
                            rows={3}
                          />
                        </label>
                        <label>
                          Plan / follow-up
                          <textarea
                            name="plan"
                            value={aiSummaryDraft.plan}
                            onChange={handleAiSummaryDraftChange}
                            rows={3}
                          />
                        </label>
                      </div>
                    ) : (
                      <dl className="aiSummarySections">
                        <div>
                          <dt>Short summary</dt>
                          <dd>{aiSummaryDraft.shortSummary || 'Not documented.'}</dd>
                        </div>
                        <div>
                          <dt>Key symptoms</dt>
                          <dd>{aiSummaryDraft.keySymptoms || 'Not documented.'}</dd>
                        </div>
                        <div>
                          <dt>Assessment</dt>
                          <dd>{aiSummaryDraft.assessment || 'Not documented.'}</dd>
                        </div>
                        <div>
                          <dt>Plan / follow-up</dt>
                          <dd>{aiSummaryDraft.plan || 'Not documented.'}</dd>
                        </div>
                      </dl>
                    )}

                    <div className="aiSummaryActions">
                      <button
                        className="primaryButton"
                        disabled={isAiSummaryBusy || aiSummary.status === 'rejected'}
                        type="button"
                        onClick={() => reviewAiSummary('approved')}
                      >
                        {aiSummaryStatus === 'SavingReview' ? 'Saving...' : 'Accept summary'}
                      </button>
                      <button
                        disabled={isAiSummaryBusy || aiSummary.status === 'rejected'}
                        type="button"
                        onClick={() => setAiSummaryEditing((current) => !current)}
                      >
                        {aiSummaryEditing ? 'Stop editing' : 'Edit'}
                      </button>
                      <button
                        disabled={isAiSummaryBusy}
                        type="button"
                        onClick={handleGenerateAiSummary}
                      >
                        Regenerate
                      </button>
                      <button
                        className="dangerTextButton"
                        disabled={isAiSummaryBusy || aiSummary.status === 'rejected'}
                        type="button"
                        onClick={() => reviewAiSummary('rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}
          </section>
        ) : (
          <>
            <div className="appointmentPanel" id="appointments">
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">Appointments</p>
                  <h2>Today</h2>
                </div>
                <div className="panelActions">
                  <span>{getTodayDateString()}</span>
                  <button
                    type="button"
                    onClick={
                      appointmentFormOpen && appointmentFormContext === 'dashboard'
                        ? closeAppointmentForm
                        : startDashboardAppointmentForm
                    }
                  >
                    {appointmentFormOpen && appointmentFormContext === 'dashboard' ? (
                      <X size={16} />
                    ) : (
                      <CalendarPlus size={16} />
                    )}
                    {appointmentFormOpen && appointmentFormContext === 'dashboard'
                      ? 'Close'
                      : 'Schedule appointment'}
                  </button>
                </div>
              </div>

              {appointmentFormOpen && appointmentFormContext === 'dashboard' && (
                <section
                  className="appointmentSchedulePanel"
                  id="appointment-schedule-form"
                  aria-label="Schedule appointment"
                >
                  {renderAppointmentForm({ includePatientSelect: true })}
                </section>
              )}

              <div className="appointmentList">
                <div className="appointmentTableHeader" aria-hidden="true">
                  <span>Time</span>
                  <span>Patient</span>
                  <span>Patient info</span>
                  <span>Reason</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {todayAppointmentsState === 'Loading' && (
                  <p className="patientMessage">Loading today&apos;s appointments...</p>
                )}

                {todayAppointmentsError && (
                  <p className="patientMessage error">{todayAppointmentsError}</p>
                )}

                {todayAppointmentsState === 'Loaded' && todayAppointments.length === 0 && (
                  <p className="patientMessage">No appointments scheduled for today.</p>
                )}

                {todayAppointments.map((appointment) => (
                  <article className="appointmentRow" key={appointment.id}>
                    <time
                      dateTime={`${appointment.scheduledDate}T${appointment.scheduledTime || '00:00'}`}
                    >
                      {appointment.scheduledTime || 'No time'}
                    </time>
                    <div>
                      <strong>{appointment.patient?.name || 'Unknown patient'}</strong>
                      <small>ID: {appointment.patientId}</small>
                    </div>
                    <span>{formatDobWithAge(appointment.patient?.dob)}</span>
                    <strong>{appointment.reason || 'No reason'}</strong>
                    <span className="statusPill">{appointment.status}</span>
                    <button type="button" onClick={() => openAppointment(appointment)}>
                      Open appointment
                    </button>
                  </article>
                ))}
              </div>

              <PaginationControls
                disabled={todayAppointmentsState === 'Loading'}
                label="Appointments"
                pagination={todayAppointmentsPagination}
                onPrevious={previousTodayAppointmentsPage}
                onNext={nextTodayAppointmentsPage}
              />
            </div>

            <div className="patientPanel" id="patients">
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">Records</p>
                  <h2>Patients</h2>
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
                  <button
                    type="button"
                    onClick={() => setManageMode((currentMode) => !currentMode)}
                  >
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

                {patientsState === 'Loading' && (
                  <p className="patientMessage">Loading patients...</p>
                )}

                {patientsError && <p className="patientMessage error">{patientsError}</p>}
                {appointmentsError && <p className="patientMessage error">{appointmentsError}</p>}

                {patientsState === 'Loaded' && patients.length === 0 && (
                  <p className="patientMessage">No patients found.</p>
                )}

                {patientsState === 'Loaded' &&
                  patients.length > 0 &&
                  filteredPatients.length === 0 && (
                    <p className="patientMessage">No patients match that search.</p>
                  )}

                {filteredPatients.map((patient) => (
                  <article
                    className={
                      patient.id === selectedPatientId ? 'patientRow selected' : 'patientRow'
                    }
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
                          <small className="mobilePatientMeta">
                            {formatDobWithAge(patient.dob)}
                          </small>
                        </span>
                      </div>
                      <div className="patientField" data-label="DOB">
                        <span>{patient.dob || 'Not set'}</span>
                        <small>
                          {patient.lastVisit === 'New patient' ? 'New patient' : 'Patient file'}
                        </small>
                      </div>
                      <span className="patientField" data-label="Contact">
                        {patient.contact || 'No contact'}
                      </span>
                      <span className="patientField" data-label="Last visit">
                        {patient.lastVisit || 'None'}
                      </span>
                      <span className="patientField" data-label="Notes">
                        {patient.noteCount}
                      </span>
                      <span className="patientField patientStatusField" data-label="Status">
                        <span className="statusPill">{patient.status || 'Scheduled'}</span>
                      </span>
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
              <PaginationControls
                disabled={patientsState === 'Loading'}
                label="Patients"
                pagination={patientsPagination}
                onPrevious={previousPatientsPage}
                onNext={nextPatientsPage}
              />
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
                          <dd>{selectedPatient.dob || 'Not set'}</dd>
                        </div>
                        <div>
                          <dt>Contact</dt>
                          <dd>{selectedPatient.contact || 'No contact'}</dd>
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
                          {visitsOpen ? 'Hide visits' : 'View visits'}
                        </button>
                        <button type="button" onClick={toggleTimeline}>
                          {timelineOpen ? 'Hide timeline' : 'View timeline'}
                        </button>
                      </div>

                      {visitsOpen && (
                        <section className="visitPanel" aria-labelledby="visit-panel-title">
                          <div className="visitPanelHeader">
                            <div>
                              <p className="eyebrow">Visits</p>
                              <h3 id="visit-panel-title">Patient visits</h3>
                            </div>
                            {!patientAppointmentFormOpen && (
                              <button type="button" onClick={() => startAppointmentForm('create')}>
                                Schedule visit
                              </button>
                            )}
                          </div>

                          {!patientAppointmentFormOpen && (
                            <div className="visitList">
                              <div className="visitToolbar" aria-label="Visit list mode">
                                <button
                                  className={visitArchiveMode === 'active' ? 'selected' : ''}
                                  type="button"
                                  onClick={() => showVisitArchiveMode('active')}
                                >
                                  Active
                                </button>
                                <button
                                  className={visitArchiveMode === 'archived' ? 'selected' : ''}
                                  type="button"
                                  onClick={() => showVisitArchiveMode('archived')}
                                >
                                  Archived
                                </button>
                              </div>
                              <div className="visitTableHeader" aria-hidden="true">
                                <span>Date / time</span>
                                <span>Reason</span>
                                <span>Type</span>
                                <span>Status</span>
                                <span>Actions</span>
                              </div>

                              {selectedPatientVisits.length === 0 && (
                                <p className="visitEmptyState">
                                  {visitArchiveMode === 'archived'
                                    ? 'No archived visits found.'
                                    : 'No visits found.'}
                                </p>
                              )}

                              {selectedPatientVisits.map((visit) => {
                                const today = getTodayDateString();
                                const visitCategory =
                                  visit.status === 'Completed' ||
                                  visit.status === 'Cancelled' ||
                                  visit.scheduledDate < today
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
                                    {visitArchiveMode === 'active' ? (
                                      <div className="rowActions">
                                        <button
                                          type="button"
                                          onClick={() => startAppointmentForm('edit', visit.id)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          className="dangerTextButton"
                                          disabled={archivingAppointmentId === visit.id}
                                          type="button"
                                          onClick={() => archiveAppointment(visit)}
                                        >
                                          {archivingAppointmentId === visit.id
                                            ? 'Archiving...'
                                            : 'Archive'}
                                        </button>
                                      </div>
                                    ) : (
                                      <span>Archived</span>
                                    )}
                                  </article>
                                );
                              })}
                              <PaginationControls
                                disabled={appointmentsState === 'Loading'}
                                label="Visits"
                                pagination={appointmentsPagination}
                                onPrevious={previousAppointmentsPage}
                                onNext={nextAppointmentsPage}
                              />
                            </div>
                          )}

                          {patientAppointmentFormOpen && renderAppointmentForm()}
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

                              {noteFormError && (
                                <p className="formMessage error">{noteFormError}</p>
                              )}

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
                                </article>
                              ))}
                              <PaginationControls
                                disabled={timelineState === 'Loading'}
                                label="Timeline"
                                pagination={timelinePagination}
                                onPrevious={previousTimelinePage}
                                onNext={nextTimelinePage}
                              />
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

            <section className="recordsTools" aria-label="Records tools">
              <section className="toolPanel" aria-labelledby="note-search-title">
                <div className="toolPanelHeader">
                  <div>
                    <p className="eyebrow">Notes</p>
                    <h2 id="note-search-title">Search notes</h2>
                  </div>
                </div>

                <form className="toolSearchForm" onSubmit={handleNoteSearchSubmit}>
                  <label>
                    <span>Search notes</span>
                    <input
                      value={noteSearchQuery}
                      onChange={(event) => setNoteSearchQuery(event.target.value)}
                      placeholder="Search clinical notes..."
                      type="search"
                    />
                  </label>
                  <button className="primaryButton" type="submit">
                    <Search size={16} />
                    Search
                  </button>
                  {(noteSearchQuery || noteSearchTerm) && (
                    <button type="button" onClick={clearNoteSearch}>
                      <X size={16} />
                      Clear
                    </button>
                  )}
                </form>

                {noteSearchState === 'Loading' && (
                  <p className="patientMessage">Searching notes...</p>
                )}
                {noteSearchError && <p className="patientMessage error">{noteSearchError}</p>}
                {noteSearchState === 'Loaded' &&
                  noteSearchTerm &&
                  noteSearchResults.length === 0 && (
                    <p className="patientMessage">No notes found.</p>
                  )}

                {noteSearchResults.length > 0 && (
                  <div className="toolList noteSearchList">
                    <div className="noteSearchHeader" aria-hidden="true">
                      <span>Date</span>
                      <span>Patient</span>
                      <span>Note</span>
                      <span>Visit</span>
                      <span>Action</span>
                    </div>
                    {noteSearchResults.map((note) => (
                      <article className="noteSearchRow" key={note.id}>
                        <time dateTime={note.createdAt}>{note.createdAt?.slice(0, 10)}</time>
                        <div>
                          <strong>{note.patient?.name || 'Unknown patient'}</strong>
                          <small>ID: {note.patientId}</small>
                        </div>
                        <p>{note.text}</p>
                        <span>
                          {note.appointment
                            ? `${note.appointment.scheduledDate} ${note.appointment.scheduledTime || ''}`
                            : 'Standalone'}
                        </span>
                        <button type="button" onClick={() => selectPatient(note.patientId)}>
                          View patient
                        </button>
                      </article>
                    ))}
                    <PaginationControls
                      disabled={noteSearchState === 'Loading'}
                      label="Search"
                      pagination={noteSearchPagination}
                      onPrevious={previousNoteSearchPage}
                      onNext={nextNoteSearchPage}
                    />
                  </div>
                )}
              </section>

              <section className="toolPanel" aria-labelledby="audit-log-title">
                <div className="toolPanelHeader">
                  <div>
                    <p className="eyebrow">Audit</p>
                    <h2 id="audit-log-title">Recent activity</h2>
                  </div>
                  <button type="button" onClick={() => loadAuditLogs(auditLogsPage)}>
                    Refresh
                  </button>
                </div>

                {auditLogsState === 'Loading' && (
                  <p className="patientMessage">Loading activity...</p>
                )}
                {auditLogsError && <p className="patientMessage error">{auditLogsError}</p>}
                {auditLogsState === 'Loaded' && auditLogs.length === 0 && (
                  <p className="patientMessage">No activity recorded yet.</p>
                )}

                {auditLogs.length > 0 && (
                  <div className="toolList auditList">
                    <div className="auditHeader" aria-hidden="true">
                      <span>Time</span>
                      <span>Action</span>
                      <span>Target</span>
                    </div>
                    {auditLogs.map((log) => (
                      <article className="auditRow" key={log.id}>
                        <time dateTime={log.createdAt}>{formatDateTime(log.createdAt)}</time>
                        <strong>{formatAuditAction(log.action)}</strong>
                        <span>
                          {log.targetType} {log.targetId}
                        </span>
                      </article>
                    ))}
                    <PaginationControls
                      disabled={auditLogsState === 'Loading'}
                      label="Audit"
                      pagination={auditLogsPagination}
                      onPrevious={previousAuditLogsPage}
                      onNext={nextAuditLogsPage}
                    />
                  </div>
                )}
              </section>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
