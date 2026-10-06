import { FileText, Image, Presentation, File } from 'lucide-react';
export function category(type) {
  if (['jpg', 'jpeg', 'png'].includes(type)) return 'Images';
  if (type === 'pdf') return 'PDFs';
  if (['ppt', 'pptx'].includes(type)) return 'Presentations';
  if (['txt', 'doc', 'docx'].includes(type)) return 'Documents';
  return 'Other';
}
export default function FileIcon({ type = 'file' }) {
  const group = category(type);
  const Icon =
    group === 'Images'
      ? Image
      : group === 'Presentations'
        ? Presentation
        : ['PDFs', 'Documents'].includes(group)
          ? FileText
          : File;
  return (
    <span className={`file-icon ${group.toLowerCase()}`}>
      <Icon size={21} />
    </span>
  );
}
export function formatSize(size) {
  if (size === 0) return '0 B';
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), 3);
  return `${(size / 1024 ** index).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${['B', 'KB', 'MB', 'GB'][index]}`;
}
