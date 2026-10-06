async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new Error(
      'Could not reach the backend. Make sure it is running on port 3001.',
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'The backend returned an unexpected response. Check that both servers are running.',
    );
  }
  if (!response.ok)
    throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export const api = {
  files: () => request('/files'),
  status: () => request('/cloud/status'),
  url: (key, download) =>
    request(`/files/url?key=${encodeURIComponent(key)}&download=${download}`),
  remove: (key) =>
    request(`/files?key=${encodeURIComponent(key)}`, { method: 'DELETE' }),
  upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload');
      xhr.timeout = 120000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error('Unexpected upload response.'));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || 'Upload failed.'));
      };
      xhr.onerror = () =>
        reject(new Error('Upload failed. Check that the backend is running.'));
      xhr.ontimeout = () =>
        reject(new Error('Upload timed out. Please try again.'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  },
};
