import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';

export default function OnboardingModal({ user, onDone }) {
  const api = useApi();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  async function finish() {
    setLoading(true);
    try {
      await api.post('/api/staff/me');
      onDone();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = user?.role === 'admin';
  const name = user?.name || 'there';

  const steps = [
    {
      title: `Welcome to CHAMP PM, ${name.split(' ')[0]}! 👋`,
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            CHAMP PM is where the team tracks time across FEMA grant projects —
            so we can see budget burn, staff workload, and program health in one place.
          </p>
          <p>Here's what you need to know to get started:</p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="text-brand-500 font-bold mt-0.5">→</span>
              <span><strong>Log your time weekly</strong> — use the Timesheet page to enter hours for each project you're working on</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 font-bold mt-0.5">→</span>
              <span><strong>Submit for approval</strong> — click "Submit Week" when your week is complete; Glenn or a project lead will review it</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 font-bold mt-0.5">→</span>
              <span><strong>Overhead is pre-loaded</strong> — Leave, PD, and CHAMP Admin tasks are always available even without a specific assignment</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Your Profile',
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{user?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Department</span>
              <span className="font-medium text-gray-900">{user?.department || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900 capitalize">{user?.role || 'staff'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            If anything looks wrong, contact Glenn to update your profile.
          </p>
        </div>
      ),
    },
    {
      title: isAdmin ? 'You have Admin access' : 'Ready to log time',
      content: isAdmin ? (
        <div className="space-y-3 text-sm text-gray-600">
          <p>As an admin you have access to everything, including:</p>
          <ul className="space-y-2">
            {[
              ['Budget Burndown', '/admin/budget', 'Track costs vs. FEMA allocations'],
              ['Program Runway', '/admin/runway', 'See how long grant balances will last'],
              ['Reports', '/admin/reports', 'Export hours + loaded costs for invoicing'],
              ['Timesheets', '/admin/timesheets', 'Review and approve staff submissions'],
              ['Alerts', '/admin/dashboard', 'Budget and PoP warnings at a glance'],
            ].map(([label, , desc]) => (
              <li key={label} className="flex items-start gap-2">
                <span className="text-brand-500 font-bold mt-0.5">→</span>
                <span><strong>{label}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4 text-sm text-gray-600">
          <p>Head to <strong>My Timesheet</strong> to start logging hours.</p>
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <p className="font-medium text-brand-800 mb-1">Quick tips:</p>
            <ul className="space-y-1 text-brand-700 text-xs">
              <li>• Log hours daily or weekly — whatever works for you</li>
              <li>• Use the ← → buttons to navigate between weeks</li>
              <li>• Enter 0 or leave blank to remove an entry</li>
              <li>• Submit your week by Friday so it can be approved</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Link
              to="/staff/timesheet"
              className="btn-primary"
              onClick={finish}
            >
              Go to My Timesheet →
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6 pb-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand-500' : i < step ? 'w-1.5 bg-brand-200' : 'w-1.5 bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="px-8 py-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{current.title}</h2>
          <div className="mb-8">{current.content}</div>

          <div className="flex items-center justify-between">
            {step > 0
              ? <button className="btn-secondary btn-sm" onClick={() => setStep(s => s - 1)}>← Back</button>
              : <div />
            }
            {isLast ? (
              <button className="btn-primary" onClick={finish} disabled={loading}>
                {loading ? 'Saving…' : "Let's go →"}
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
