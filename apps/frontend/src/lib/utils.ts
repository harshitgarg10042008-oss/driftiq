export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getMimeIcon(mimeType: string | null | undefined, filename?: string): string {
  const ext = filename?.split('.').pop()?.toLowerCase();
  // Check extension first for common code files
  const codeExts = ['cpp','c','h','py','java','js','ts','jsx','tsx','go','rs','rb','php','cs','swift','kt','sh'];
  if (ext && codeExts.includes(ext)) return '💻';
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('7z')) return '🗜️';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('text/')) return '📃';
  if (mimeType.includes('json') || mimeType.includes('xml')) return '🔧';
  return '📄';
}

export function getFileTypeLabel(mimeType: string | null | undefined, filename?: string): string {
  const ext = filename?.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    cpp: 'C++ Source', c: 'C Source', h: 'C Header',
    py: 'Python', java: 'Java', js: 'JavaScript',
    ts: 'TypeScript', jsx: 'React JSX', tsx: 'React TSX',
    html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML',
    sh: 'Shell Script', rs: 'Rust', go: 'Go', kt: 'Kotlin',
    swift: 'Swift', rb: 'Ruby', php: 'PHP', cs: 'C#',
    pdf: 'PDF', doc: 'Word Doc', docx: 'Word Doc',
    xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint',
    txt: 'Text', md: 'Markdown', csv: 'CSV',
    jpg: 'JPEG Image', jpeg: 'JPEG Image', png: 'PNG Image',
    gif: 'GIF', webp: 'WebP', svg: 'SVG', bmp: 'Bitmap',
    mp3: 'MP3 Audio', wav: 'WAV Audio', ogg: 'OGG Audio',
    flac: 'FLAC Audio', aac: 'AAC Audio', m4a: 'M4A Audio',
    mp4: 'MP4 Video', webm: 'WebM Video', mkv: 'MKV Video',
    avi: 'AVI Video', mov: 'QuickTime',
    zip: 'ZIP Archive', rar: 'RAR Archive', tar: 'TAR Archive',
    gz: 'GZip Archive', '7z': '7-Zip Archive',
  };
  if (ext && extMap[ext]) return extMap[ext];
  if (!mimeType || mimeType === 'application/octet-stream') return ext ? `${ext.toUpperCase()} File` : 'File';
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase() + ' Image';
  if (mimeType.startsWith('video/')) return mimeType.split('/')[1].toUpperCase() + ' Video';
  if (mimeType.startsWith('audio/')) return mimeType.split('/')[1].toUpperCase() + ' Audio';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word')) return 'Word Doc';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel';
  if (mimeType.includes('presentation')) return 'PowerPoint';
  if (mimeType.startsWith('text/')) return 'Text File';
  return mimeType.split('/')[1]?.toUpperCase() || 'File';
}

export function cn(
  ...classes: (string | undefined | false | null)[]
): string {
  return classes.filter(Boolean).join(' ');
}
