import type { KpiStatus } from '../lib/types';
import { STATUS_LABEL } from '../lib/format';

const BADGE_CLASS: Record<KpiStatus, string> = {
  green: 'badge--green',
  yellow: 'badge--yellow',
  red: 'badge--red',
  no_data: 'badge--gray',
};

// Status is never communicated by color alone: a dot plus a text label.
export function StatusBadge({ status }: { status: KpiStatus }) {
  return (
    <span className={`badge ${BADGE_CLASS[status]}`}>
      <span className="dot" /> {STATUS_LABEL[status]}
    </span>
  );
}
