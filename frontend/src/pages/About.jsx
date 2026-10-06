import { Cloud, ArrowUpRight, ShieldCheck, GraduationCap } from 'lucide-react';
export default function About({ navigate }) {
  return (
    <>
      <section className="panel about-hero">
        <span className="about-cloud">
          <Cloud size={54} />
        </span>
        <span className="eyebrow">A HOME FOR YOUR FILES</span>
        <h2>Cloud storage made simple.</h2>
        <p>
          CloudBox is a small cloud-based file storage application. Upload,
          store, access, download, and delete your files using Amazon S3 — all
          from one calm, simple workspace.
        </p>
        <button
          className="button primary"
          onClick={() => navigate('architecture')}
        >
          Explore the architecture <ArrowUpRight size={17} />
        </button>
      </section>
      <div className="about-grid">
        <article className="panel concept">
          <GraduationCap className="blue" />
          <h3>Built for the classroom</h3>
          <p className="muted">
            A single-user project demonstrating real cloud storage and cloud
            APIs. React handles the interface, Express handles requests, and
            Amazon S3 stores the files. No database is needed.
          </p>
        </article>
        <article className="panel concept">
          <ShieldCheck className="blue" />
          <h3>Simple, with thoughtful safeguards</h3>
          <p className="muted">
            Private bucket access, backend credentials, a 10 MB upload limit,
            file validation, and confirmation before deletion keep the
            demonstration easy to understand.
          </p>
        </article>
      </div>
      <section className="panel stack">
        <span className="eyebrow">THE TECHNOLOGY</span>
        <div>
          {[
            'React + Vite',
            'Node.js + Express',
            'AWS SDK v3',
            'Amazon S3',
            'Plain CSS',
          ].map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>
    </>
  );
}
