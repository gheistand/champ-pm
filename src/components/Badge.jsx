import clsx from 'clsx';

const variants = {
  active:     'bg-green-100 text-green-800',
  approved:   'bg-green-100 text-green-800',
  complete:   'bg-blue-100 text-blue-800',
  closed:     'bg-gray-100 text-gray-700',
  pending:    'bg-amber-100 text-amber-800',
  submitted:  'bg-amber-100 text-amber-800',
  on_hold:    'bg-amber-100 text-amber-800',
  draft:      'bg-gray-100 text-gray-700',
  rejected:   'bg-red-100 text-red-800',
  admin:      'bg-brand-100 text-brand-800',
  staff:      'bg-gray-100 text-gray-700',
  hourly:     'bg-purple-100 text-purple-800',
};

export default function Badge({ status, label, className }) {
  const text = label || status?.replace('_', ' ') || '';
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
        variants[status] || 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {text}
    </span>
  );
}
