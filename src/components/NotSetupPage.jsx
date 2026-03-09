import { useClerk, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function NotSetupPage() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/sign-in');
  }

  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Account Not Set Up Yet</h1>
        <p className="text-gray-600 text-sm mb-4">
          You're signed in, but your account hasn't been added to CHAMP PM yet.
          Contact Glenn to get your profile created before you can access the system.
        </p>

        {email && (
          <div className="bg-gray-50 rounded-lg px-4 py-2.5 mb-6 inline-block">
            <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
            <p className="text-sm font-medium text-gray-800">{email}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-1">What to do next</p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Email or message Glenn Heistand</li>
            <li>Ask him to add you to CHAMP PM (Staff page)</li>
            <li>Once added, sign out and sign back in</li>
          </ol>
        </div>

        <button
          onClick={handleSignOut}
          className="btn-secondary w-full"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
