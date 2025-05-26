export function envelopeManageUrl(envelopeId: string, sandbox = false) {
  const host = sandbox
    ? 'https://demo.docusign.net' // Sandbox / demo environment
    : 'https://apps.docusign.com'; // Production environment - CORREGIDO
  return `${host}/send/documents/details/${encodeURIComponent(envelopeId)}`;
} 