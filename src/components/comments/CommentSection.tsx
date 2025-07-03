import React, { useEffect, useState } from 'react';
import { getComments, addComment } from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { formatDate } from '../../utils/formatters';

interface CommentSectionProps {
  applicationId: string;
}

interface CommentItem {
  id: string;
  application_id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  text: string;
  created_at: string;
}

const roleLabel = (role?: string) => {
  switch ((role || '').toLowerCase()) {
    case 'advisor':
      return 'Asesor';
    case 'company_admin':
    case 'empresa':
      return 'Empresa';
    default:
      return 'Usuario';
  }
};

const CommentSection: React.FC<CommentSectionProps> = ({ applicationId }) => {
  const { user } = useAuth();
  const { userCan, isAdvisor, isCompanyAdmin } = usePermissions();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const canComment = Boolean(user) && (isAdvisor() || isCompanyAdmin());

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getComments(applicationId);
      setComments(data || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar comentarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [applicationId]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    try {
      setSaving(true);
      await addComment(applicationId, user!.id, text.trim());
      setText('');
      await loadComments();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl mt-6">
      <div className="card-body">
        <h2 className="card-title text-lg mb-4">Comentarios</h2>

        {loading ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner"/></div>
        ) : error ? (
          <div className="alert alert-error"><span>{error}</span></div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500">Aún no hay comentarios.</p>
        ) : (
          <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {comments.map((c) => (
              <li key={c.id} className="border rounded-lg p-3 bg-base-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">{c.user_name || 'Usuario'}</span>
                  <span className="badge badge-outline badge-xs ml-2 text-xs">{roleLabel(c.user_role)}</span>
                  <span className="text-xs text-gray-500">{formatDate(c.created_at, 'datetime')}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        {canComment && (
          <div className="mt-4">
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="Escribe un comentario..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm mt-2"
              onClick={handleAdd}
              disabled={saving || !text.trim()}
            >
              {saving ? 'Guardando...' : 'Agregar comentario'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection; 