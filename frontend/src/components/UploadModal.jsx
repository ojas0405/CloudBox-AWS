import { useRef, useState } from 'react';
import { UploadCloud, FileCheck, LoaderCircle, Upload } from 'lucide-react';
import Modal from './Modal.jsx';
import { formatSize } from './FileIcon.jsx';
import { api } from '../services/api.js';
export default function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [drag, setDrag] = useState(false);
  const input = useRef(null);
  function select(chosen) {
    setError('');
    setFile(null);
    if (!chosen) return;
    if (!/\.(pdf|jpe?g|png|txt|docx?|pptx?)$/i.test(chosen.name)) {
      setError('Choose a PDF, image, text document, or presentation.');
      return;
    }
    if (!chosen.size || chosen.size > 10 * 1024 * 1024) {
      setError('Choose a non-empty file, up to 10 MB.');
      return;
    }
    setFile(chosen);
  }
  async function send() {
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      await api.upload(file, setProgress);
      onSuccess();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal title="Upload to CloudBox" onClose={onClose} busy={busy}>
      <p className="muted">A little space for your next big idea.</p>
      <button
        disabled={busy}
        className={`dropzone ${drag ? 'dragging' : ''}`}
        onClick={() => input.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) select(e.dataTransfer.files[0]);
        }}
      >
        {file ? <FileCheck size={36} /> : <UploadCloud size={38} />}
        <strong>{file ? file.name : 'Drop your file here'}</strong>
        <span>
          {file ? formatSize(file.size) : 'or click to browse your computer'}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx,.ppt,.pptx"
        onChange={(e) => {
          select(e.target.files[0]);
          e.target.value = '';
        }}
        hidden
      />
      <p className="small muted">
        PDF, JPG, PNG, TXT, DOC, DOCX, PPT, PPTX · Up to 10 MB
      </p>
      {busy && (
        <div aria-live="polite">
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="small muted">
            {progress < 100
              ? `Sending file… ${progress}%`
              : 'Saving securely to Amazon S3…'}
          </p>
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={!file || busy}
          onClick={send}
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Upload size={17} />
          )}
          {busy ? 'Uploading…' : 'Upload file'}
        </button>
      </div>
    </Modal>
  );
}
