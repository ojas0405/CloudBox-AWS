import { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  LayoutDashboard,
  FolderOpen,
  Workflow,
  Info,
  Upload,
  Search,
  RefreshCw,
  HardDrive,
  Files,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Eye,
  Trash2,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { api } from './services/api.js';
import FileIcon, { category, formatSize } from './components/FileIcon.jsx';
import UploadModal from './components/UploadModal.jsx';
import Modal from './components/Modal.jsx';
import Architecture from './pages/Architecture.jsx';
import About from './pages/About.jsx';

const navigation = [
  ['dashboard', LayoutDashboard, 'Dashboard'],
  ['files', FolderOpen, 'My Files'],
  ['architecture', Workflow, 'Cloud Architecture'],
  ['about', Info, 'About'],
];
const statusLabels = {
  connected: 'Connected',
  not_configured: 'Not configured',
  disconnected: 'Disconnected',
  checking: 'Checking…',
};
function initialPage() {
  const page = location.hash.slice(1);
  return navigation.some(([id]) => id === page) ? page : 'dashboard';
}
export default function App() {
  const [page, setPage] = useState(initialPage),
    [files, setFiles] = useState([]),
    [status, setStatus] = useState({ status: 'checking' }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [uploadOpen, setUploadOpen] = useState(false),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [opening, setOpening] = useState(''),
    [toast, setToast] = useState(null),
    [query, setQuery] = useState(''),
    [sort, setSort] = useState('date-desc'),
    [filter, setFilter] = useState('All files');
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => {
    setDeleteError('');
  }, [deleting]);
  function notify(message, bad = false) {
    setToast({ message, bad });
  }
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const change = () => setPage(initialPage());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  function navigate(next) {
    location.hash = next;
    setPage(next);
    setQuery('');
    setFilter('All files');
  }
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const [cloud, listing] = await Promise.allSettled([
      api.status(),
      api.files(),
    ]);
    setStatus(
      cloud.status === 'fulfilled'
        ? cloud.value
        : { status: 'disconnected', message: cloud.reason.message },
    );
    if (listing.status === 'fulfilled') setFiles(listing.value.files);
    else {
      setFiles([]);
      setError(listing.reason.message);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  async function openFile(file, download) {
    // Open during the click so browser popup blocking does not discard a later async URL.
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      notify('Allow popups for CloudBox to view and download files.', true);
      return;
    }
    tab.opener = null;
    setOpening(file.key);
    try {
      const result = await api.url(file.key, download);
      tab.location.replace(result.url);
    } catch (err) {
      tab.close();
      notify(err.message, true);
    } finally {
      setOpening('');
    }
  }
  async function deleteFile() {
    setBusy(true);
    setDeleteError('');
    try {
      await api.remove(deleting.key);
      setDeleting(null);
      notify('File deleted from cloud storage.');
      await refresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const connected = status.status === 'connected',
    available = !loading && !error;
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  const groups = ['Images', 'PDFs', 'Documents', 'Presentations', 'Other'];
  const filtered = files
    .filter(
      (file) =>
        file.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === 'All files' || category(file.type) === filter),
    )
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'size-desc') return b.size - a.size;
      if (sort === 'size-asc') return a.size - b.size;
      return sort === 'date-asc'
        ? (a.lastModified || '').localeCompare(b.lastModified || '')
        : (b.lastModified || '').localeCompare(a.lastModified || '');
    });
  const shown = page === 'dashboard' ? filtered.slice(0, 5) : filtered;
  const title =
    page === 'dashboard'
      ? 'Welcome to CloudBox'
      : page === 'files'
        ? 'Your files, all together.'
        : page === 'architecture'
          ? 'Behind the cloud.'
          : 'Meet CloudBox.';
  const subtitle =
    page === 'dashboard'
      ? 'Store, manage and access your files securely in the cloud.'
      : page === 'files'
        ? 'A simple space for everything you want to keep.'
        : page === 'architecture'
          ? 'See how your files travel from your device to Amazon S3.'
          : 'A little less complexity. A little more possibility.';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={() => navigate('dashboard')}
        >
          <span className="brand-icon">
            <Cloud size={27} />
          </span>
          <span>
            CloudBox<span className="brand-caption">YOUR CLOUD WORKSPACE</span>
          </span>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              {label}
              {id === 'files' && available && (
                <span className="nav-count">{files.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={25} />
            <h3>Your files. Your space.</h3>
            <p>
              Private cloud storage,
              <br />
              peace of mind included.
            </p>
          </div>
          <div className="sidebar-status">
            <span className={`status-dot ${status.status}`} />
            <div>
              <strong>AWS Cloud Storage</strong>
              <span>{statusLabels[status.status]}</span>
            </div>
            <Cloud size={19} />
          </div>
          <span className="sidebar-foot">
            CloudBox · A cloud computing project
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} />{' '}
            <strong>{navigation.find(([id]) => id === page)?.[2]}</strong>
          </span>
          <span className="private-badge">
            <ShieldCheck size={15} /> Private S3 storage
          </span>
        </header>
        <main>
          <div className="page-header">
            <div>
              <span className="eyebrow">YOUR PERSONAL CLOUD</span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {['dashboard', 'files'].includes(page) && (
              <button
                className="button primary"
                onClick={() => setUploadOpen(true)}
              >
                <Upload size={18} /> Upload file
              </button>
            )}
          </div>
          {page === 'architecture' ? (
            <Architecture />
          ) : page === 'about' ? (
            <About navigate={navigate} />
          ) : (
            <>
              {page === 'dashboard' && (
                <>
                  <section className="welcome-banner">
                    <div>
                      <span className="banner-label">
                        <span /> SIMPLE. SECURE. IN THE CLOUD.
                      </span>
                      <h2>More room for what matters.</h2>
                      <p>
                        From your first idea to your final presentation,
                        <br />
                        keep your files within reach.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => navigate('architecture')}
                      >
                        Explore your cloud <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="cloud-art" aria-hidden="true">
                      <span className="orbit orbit-one" />
                      <span className="orbit orbit-two" />
                      <span className="art-file art-one">
                        <FileIcon type="pdf" />
                      </span>
                      <span className="art-file art-two">
                        <FileIcon type="png" />
                      </span>
                      <span className="art-file art-three">
                        <FileIcon type="docx" />
                      </span>
                      <div className="art-cloud">
                        <Cloud size={102} strokeWidth={1.4} />
                        <span>
                          <ShieldCheck size={23} />
                        </span>
                      </div>
                    </div>
                  </section>
                  <section
                    className="stats-grid"
                    aria-label="Storage statistics"
                  >
                    {[
                      [
                        Files,
                        'Files stored',
                        available ? files.length : '—',
                        available
                          ? 'All files in your bucket'
                          : 'Waiting for cloud storage',
                      ],
                      [
                        HardDrive,
                        'Storage used',
                        available ? formatSize(totalSize) : '—',
                        'Calculated from your S3 files',
                      ],
                      [
                        Cloud,
                        'Cloud provider',
                        'Amazon S3',
                        'Powered by Amazon Web Services',
                      ],
                      [
                        ShieldCheck,
                        'Storage status',
                        statusLabels[status.status],
                        connected
                          ? 'Cloud connection is active'
                          : 'Check your cloud configuration',
                      ],
                    ].map(([Icon, label, value, caption]) => (
                      <article className="panel stat" key={label}>
                        <div className="stat-label">
                          <span>{label}</span>
                          <span className="stat-icon">
                            <Icon size={19} />
                          </span>
                        </div>
                        <strong
                          className={
                            label === 'Storage status'
                              ? `stat-value status-value ${status.status}`
                              : 'stat-value'
                          }
                        >
                          {label === 'Storage status' && (
                            <span className={`status-dot ${status.status}`} />
                          )}{' '}
                          {value}
                        </strong>
                        <p>{caption}</p>
                      </article>
                    ))}
                  </section>
                </>
              )}
              {!loading && error && (
                <div className="connection-alert" role="alert">
                  <AlertCircle size={21} />
                  <div>
                    <strong>
                      {status.status === 'not_configured'
                        ? 'Let’s connect your cloud.'
                        : 'Cloud storage needs attention.'}
                    </strong>
                    <p>{error}</p>
                  </div>
                  <button className="text-button" onClick={refresh}>
                    Try again <RefreshCw size={15} />
                  </button>
                </div>
              )}
              <div
                className={`content-grid ${page === 'files' ? 'files-only' : ''}`}
              >
                <section className="panel files-panel">
                  <div className="section-title">
                    <div>
                      <h2>
                        {page === 'dashboard' ? 'Recent files' : 'My Files'}
                      </h2>
                      <p>
                        {page === 'dashboard'
                          ? 'Your latest uploads, right where you need them.'
                          : `${available ? files.length : '—'} files in your cloud workspace`}
                      </p>
                    </div>
                    <div className="section-actions">
                      {page === 'dashboard' && (
                        <button
                          className="text-button"
                          onClick={() => navigate('files')}
                        >
                          View all <ArrowUpRight size={15} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        onClick={refresh}
                        disabled={loading}
                        aria-label="Refresh files"
                      >
                        <RefreshCw
                          size={17}
                          className={loading ? 'spin' : ''}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="file-toolbar">
                    <label className="search">
                      <Search size={17} />
                      <input
                        type="search"
                        placeholder="Search your files…"
                        aria-label="Search by filename"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Sort files"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="date-desc">Newest first</option>
                      <option value="date-asc">Oldest first</option>
                      <option value="name">Name A–Z</option>
                      <option value="size-desc">Largest first</option>
                      <option value="size-asc">Smallest first</option>
                    </select>
                  </div>
                  {page === 'files' && (
                    <div className="filter-tabs">
                      {['All files', ...groups].map((group) => (
                        <button
                          key={group}
                          className={filter === group ? 'selected' : ''}
                          onClick={() => setFilter(group)}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  )}
                  {loading ? (
                    <div className="empty-state">
                      <LoaderCircle size={34} className="spin blue" />
                      <h3>Loading your cloud…</h3>
                      <p>Retrieving files from Amazon S3.</p>
                    </div>
                  ) : error ? (
                    <div className="empty-state">
                      <span className="empty-cloud">
                        <Cloud size={38} />
                      </span>
                      <h3>
                        {status.status === 'not_configured'
                          ? 'Your cloud is almost ready.'
                          : 'Your files are temporarily out of reach.'}
                      </h3>
                      <p>
                        {status.status === 'not_configured'
                          ? 'Configure AWS in the backend to start storing your files.'
                          : 'Check your connection and try refreshing.'}
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => navigate('architecture')}
                      >
                        See how CloudBox works <ArrowUpRight size={16} />
                      </button>
                    </div>
                  ) : !shown.length ? (
                    <div className="empty-state">
                      <span className="empty-cloud">
                        <Cloud size={38} />
                      </span>
                      <h3>
                        {files.length
                          ? 'No matching files.'
                          : 'No files in your CloudBox yet.'}
                      </h3>
                      <p>
                        {files.length
                          ? 'Try another filename or file type.'
                          : 'Upload your first file to store it securely in the cloud.'}
                      </p>
                      {!files.length && (
                        <button
                          className="button primary"
                          onClick={() => setUploadOpen(true)}
                        >
                          <Upload size={17} /> Upload file
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>File name</th>
                            <th>Size</th>
                            <th>Last modified</th>
                            <th className="actions-head">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((file) => (
                            <tr key={file.key}>
                              <td>
                                <div className="file-name">
                                  <FileIcon type={file.type} />
                                  <div>
                                    <button
                                      onClick={() => openFile(file, false)}
                                      disabled={!!opening}
                                      title={file.name}
                                    >
                                      {file.name}
                                    </button>
                                    <span>{file.type.toUpperCase()} file</span>
                                  </div>
                                </div>
                              </td>
                              <td>{formatSize(file.size)}</td>
                              <td>
                                {file.lastModified
                                  ? new Date(
                                      file.lastModified,
                                    ).toLocaleDateString(undefined, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : '—'}
                              </td>
                              <td>
                                <div className="file-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={`View ${file.name}`}
                                    title="View file"
                                    disabled={!!opening}
                                    onClick={() => openFile(file, false)}
                                  >
                                    {opening === file.key ? (
                                      <LoaderCircle
                                        size={16}
                                        className="spin"
                                      />
                                    ) : (
                                      <Eye size={16} />
                                    )}
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label={`Download ${file.name}`}
                                    title="Download file"
                                    disabled={!!opening}
                                    onClick={() => openFile(file, true)}
                                  >
                                    <Download size={16} />
                                  </button>
                                  <button
                                    className="icon-button delete"
                                    aria-label={`Delete ${file.name}`}
                                    title="Delete file"
                                    onClick={() => setDeleting(file)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="files-footer">
                    <ShieldCheck size={14} />
                    <span>Stored in a private S3 bucket</span>
                    <span>
                      {available
                        ? `${shown.length} of ${filtered.length} files`
                        : 'CloudBox workspace'}
                    </span>
                  </div>
                </section>
                {page === 'dashboard' && (
                  <aside className="details-column">
                    <section className="panel cloud-info">
                      <div className="section-title">
                        <h2>Cloud storage</h2>
                        <Cloud size={21} />
                      </div>
                      <span className={`connection-pill ${status.status}`}>
                        <span className={`status-dot ${status.status}`} />
                        {statusLabels[status.status]}
                      </span>
                      <dl>
                        <dt>Provider</dt>
                        <dd>Amazon Web Services</dd>
                        <dt>Service</dt>
                        <dd>Amazon S3</dd>
                        <dt>Storage type</dt>
                        <dd>Object storage</dd>
                        <dt>Access</dt>
                        <dd>Private · Temporary links</dd>
                        {status.region && (
                          <>
                            <dt>Region</dt>
                            <dd>{status.region}</dd>
                          </>
                        )}
                      </dl>
                      <button
                        className="text-button"
                        onClick={() => navigate('architecture')}
                      >
                        How it works <ArrowUpRight size={15} />
                      </button>
                    </section>
                    <section className="panel file-types">
                      <h2>At a glance</h2>
                      <p className="small muted">
                        A little order for every file.
                      </p>
                      {groups.map((group) => {
                        const count = files.filter(
                          (file) => category(file.type) === group,
                        ).length;
                        return (
                          <div className="type-row" key={group}>
                            <span
                              className={`type-dot ${group.toLowerCase()}`}
                            />
                            <span>{group}</span>
                            <strong>{available ? count : '—'}</strong>
                          </div>
                        );
                      })}
                    </section>
                  </aside>
                )}
              </div>
              <p className="workspace-note">
                <ShieldCheck size={14} /> Built on the cloud. Designed to keep
                things simple.
              </p>
            </>
          )}
        </main>
        <footer>
          CloudBox <span>Cloud storage made simple.</span>
          <span>Powered by Amazon S3</span>
        </footer>
      </div>
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false);
            notify('File uploaded successfully to Amazon S3.');
            refresh();
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this file?"
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <div className="delete-preview">
            <FileIcon type={deleting.type} />
            <div>
              <strong>{deleting.name}</strong>
              <p className="small muted">{formatSize(deleting.size)}</p>
            </div>
          </div>
          <p className="muted">
            This will remove the file from your S3 bucket. CloudBox has no undo.
            Are you sure you want to continue?
          </p>
          {deleteError && (
            <p className="inline-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep file
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={deleteFile}
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Trash2 size={17} />
              )}{' '}
              {busy ? 'Deleting…' : 'Delete file'}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.bad ? 'bad' : ''}`}
          role={toast.bad ? 'alert' : 'status'}
        >
          {toast.bad ? <AlertCircle size={21} /> : <CheckCircle2 size={21} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
