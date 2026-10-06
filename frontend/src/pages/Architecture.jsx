import {
  UserRound,
  Monitor,
  Server,
  Code2,
  Cloud,
  ArrowRight,
  ShieldCheck,
  Link,
  Layers,
  Globe,
  Expand,
  HeartHandshake,
} from 'lucide-react';
const steps = [
  [UserRound, 'You', 'Choose a file in your browser.'],
  [Monitor, 'React frontend', 'The interface sends your request.'],
  [Server, 'Express backend', 'Validates files and keeps credentials safe.'],
  [Code2, 'AWS SDK', 'Makes authorized requests to AWS.'],
  [Cloud, 'Amazon S3', 'Stores your files in a private bucket.'],
];
const concepts = [
  [
    Cloud,
    'Cloud storage',
    'Your files live remotely in Amazon S3 and can be retrieved over the internet.',
  ],
  [
    Layers,
    'Object storage',
    'Each file is an object, with a unique key and metadata, inside an S3 bucket.',
  ],
  [
    Globe,
    'On-demand access',
    'Request your files whenever you need them, through the application.',
  ],
  [
    Expand,
    'Scalability',
    'S3 handles growing storage without needing to redesign this application.',
  ],
  [
    HeartHandshake,
    'Availability & durability',
    'S3 is designed for reliable access and durable storage. Your internet connection and permissions still matter.',
  ],
  [
    Code2,
    'Cloud API / AWS SDK',
    'The backend uses the AWS SDK to list, upload, retrieve, and delete objects.',
  ],
  [
    ShieldCheck,
    'Server-side security',
    'AWS credentials stay in the backend. The S3 bucket remains private.',
  ],
  [
    Link,
    'Presigned URLs',
    'The backend signs a link that gives temporary access to one file. CloudBox links expire after five minutes.',
  ],
];
export default function Architecture() {
  return (
    <>
      <section className="panel architecture-intro">
        <span className="eyebrow">FROM YOUR BROWSER TO THE CLOUD</span>
        <h2>Small app. Real cloud architecture.</h2>
        <p className="muted">
          Five simple components, working together to give your files a home in
          the cloud.
        </p>
        <div className="architecture-flow">
          {steps.map(([Icon, title, text], index) => (
            <div className="flow-wrap" key={title}>
              <article className="flow-step">
                <span className="step-number">0{index + 1}</span>
                <Icon size={28} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
              {index < steps.length - 1 && (
                <ArrowRight className="flow-arrow" size={20} />
              )}
            </div>
          ))}
        </div>
      </section>
      <div className="section-title">
        <h2>Cloud concepts, made clear</h2>
        <span>Built for understanding</span>
      </div>
      <div className="concept-grid">
        {concepts.map(([Icon, title, text]) => (
          <article className="panel concept" key={title}>
            <span className="concept-icon">
              <Icon size={21} />
            </span>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </article>
        ))}
      </div>
      <section className="security-note">
        <ShieldCheck size={24} />
        <div>
          <h3>Private by default</h3>
          <p>
            A view or download request goes through Express first. The backend
            creates a signed S3 link; your browser then retrieves that file
            directly from S3. Anyone with that link can use it until it expires,
            so treat it as private.
          </p>
        </div>
      </section>
    </>
  );
}
