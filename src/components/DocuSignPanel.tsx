import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { envelopeManageUrl } from '../utils/docusign';

interface DocuSignPanelProps {
  applicationId: string;
  initialEnvelopeId?: string | null;
  initialSentTo?: string | null;
  initialStatus?: string | null;
  clientEmail?: string | null;
  onSaved?: (fields: { envelopeId: string; sentTo: string; status: string }) => void;
  sandbox?: boolean; // true if using DocuSign demo environment
}

const STATUS_OPTIONS = [
  'PENDIENTE DE ENVIO',
  'ENVIADO', 
  'FIRMADO',
  'CANCELADO'
];

const STATUS_COLORS = {
  'PENDIENTE DE ENVIO': 'badge-neutral',
  'ENVIADO': 'badge-info',
  'FIRMADO': 'badge-success',
  'CANCELADO': 'badge-error'
};

const STATUS_ICONS = {
  'PENDIENTE DE ENVIO': '⏳',
  'ENVIADO': '📤',
  'FIRMADO': '✅',
  'CANCELADO': '❌'
};

export const DocuSignPanel: React.FC<DocuSignPanelProps> = ({
  applicationId,
  initialEnvelopeId = '',
  initialSentTo = '',
  initialStatus = 'PENDIENTE DE ENVIO',
  clientEmail = '',
  onSaved,
  sandbox = false,
}) => {
  const [envelopeId, setEnvelopeId] = useState<string>(initialEnvelopeId || '');
  const [sentTo, setSentTo] = useState<string>(initialSentTo || clientEmail || '');
  const [status, setStatus] = useState<string>(initialStatus || 'PENDIENTE DE ENVIO');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Determinar si hay datos guardados
  const hasData = Boolean(initialEnvelopeId || initialSentTo || initialStatus);

  useEffect(() => {
    setSaved(hasData);
    setIsEditing(!hasData); // Si no hay datos, empezar editando
  }, [hasData]);

  const validate = (): boolean => {
    if (!envelopeId.trim()) {
      setError('Envelope ID es requerido');
      return false;
    }
    if (!sentTo.trim()) {
      setError('El correo destino es requerido');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sentTo)) {
      setError('Correo inválido');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          docusign_envelope_id: envelopeId.trim(),
          docusign_sent_to: sentTo.trim(),
          docusign_manual_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      setSaved(true);
      setIsEditing(false);
      if (onSaved) {
        onSaved({ envelopeId: envelopeId.trim(), sentTo: sentTo.trim(), status });
      }
    } catch (err: any) {
      console.error('Error saving DocuSign fields:', err);
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    // Restaurar valores originales
    setEnvelopeId(initialEnvelopeId || '');
    setSentTo(initialSentTo || clientEmail || '');
    setStatus(initialStatus || 'PENDIENTE DE ENVIO');
    setIsEditing(false);
    setError(null);
  };

  const manageUrl = envelopeId ? envelopeManageUrl(envelopeId, sandbox) : null;

  return (
    <div className="border rounded-lg bg-base-100 mt-4 overflow-hidden">
      {/* Header */}
      <div className="bg-base-200 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📄 Documentos para Firma Digital (DocuSign)
          </h3>
          {saved && !isEditing && (
            <button
              onClick={handleEdit}
              className="btn btn-sm btn-ghost"
            >
              ✏️ Editar
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Vista guardada (no editando) */}
        {saved && !isEditing ? (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Estado:</span>
              <div className={`badge ${STATUS_COLORS[status as keyof typeof STATUS_COLORS]} gap-2`}>
                <span>{STATUS_ICONS[status as keyof typeof STATUS_ICONS]}</span>
                {status}
              </div>
            </div>

            {/* Información guardada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-base-200 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Envelope ID</p>
                <p className="font-mono text-sm break-all">{envelopeId}</p>
              </div>
              
              <div className="bg-base-200 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Enviado a</p>
                <p className="text-sm">{sentTo}</p>
              </div>
            </div>

            {/* Enlace a DocuSign */}
            {manageUrl && (
              <div className="flex justify-center">
                <a
                  href={manageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm gap-2"
                >
                  🔗 Ver en DocuSign
                </a>
              </div>
            )}
          </div>
        ) : (
          /* Vista de edición */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Envelope ID */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Envelope ID *</label>
                <input
                  type="text"
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  className="input input-sm input-bordered"
                  placeholder="60aafb0b-684d-467c-b03e-c114ab1334d8"
                />
              </div>

              {/* Sent To */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Enviado a *</label>
                <input
                  type="email"
                  value={sentTo}
                  onChange={(e) => setSentTo(e.target.value)}
                  className="input input-sm input-bordered"
                  placeholder="cliente@example.com"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Estado</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="select select-sm select-bordered"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {STATUS_ICONS[opt as keyof typeof STATUS_ICONS]} {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="alert alert-error alert-sm">
                <span>{error}</span>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center gap-2 justify-end">
              {saved && (
                <button
                  onClick={handleCancel}
                  className="btn btn-sm btn-ghost"
                  disabled={saving}
                >
                  Cancelar
                </button>
              )}
              
              <button
                className={`btn btn-sm btn-primary ${saving ? 'loading' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocuSignPanel; 