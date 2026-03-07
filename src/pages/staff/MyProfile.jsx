import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PageLoader } from '../../components/LoadingSpinner';
import { formatDisplayDate } from '../../utils/dateUtils';

export default function MyProfile() {
  const { user } = useUser();
  const api = useApi();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/staff/me')
      .then((r) => setProfile(r.user))
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
      </div>

      <div className="card p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.firstName?.[0] || '?'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-gray-500">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
        </div>

        <dl className="space-y-4">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Title</dt>
            <dd className="text-sm text-gray-900">{profile?.title || '—'}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Classification</dt>
            <dd className="text-sm text-gray-900">{profile?.classification || '—'}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Department</dt>
            <dd className="text-sm text-gray-900">{profile?.department || 'CHAMP'}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <dt className="text-sm font-medium text-gray-500">Start Date</dt>
            <dd className="text-sm text-gray-900">{formatDisplayDate(profile?.start_date) || '—'}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="text-sm text-gray-900 capitalize">{profile?.role || user?.publicMetadata?.role || 'staff'}</dd>
          </div>
        </dl>

        <p className="text-xs text-gray-400 mt-6">
          Profile details are managed by your administrator. Contact them for any changes.
        </p>
      </div>
    </div>
  );
}
