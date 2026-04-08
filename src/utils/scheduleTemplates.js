export const SCHEDULE_TEMPLATES = {
  data_development: {
    phases: [
      { label: 'PICC Planning', duration_days: 60, display_order: 1 },
      { label: 'Modeling', duration_days: 730, display_order: 2 },
      { label: 'Delineations', duration_days: 180, display_order: 3 },
      { label: 'FRR Planning', duration_days: 60, display_order: 4 },
      { label: 'Webmap', duration_days: 60, display_order: 5 },
      { label: 'Transition Spreadsheet', duration_days: 120, display_order: 6 },
      { label: 'SID 621 DB', duration_days: 60, display_order: 7 },
      { label: 'SID 621 Comment Period', duration_days: 30, display_order: 8 },
    ],
    milestones: [
      { label: 'Project Kickoff', display_order: 1, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'PICC Meeting', display_order: 2, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'SID 620 Issued', display_order: 3, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'KDP1', display_order: 4, is_key_decision: 1, is_pop_anchor: 0 },
      { label: 'FRR Meeting', display_order: 5, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'SID 621 Issued', display_order: 6, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'KDP2', display_order: 7, is_key_decision: 1, is_pop_anchor: 0 },
      { label: 'MIP Upload Complete', display_order: 8, is_key_decision: 0, is_pop_anchor: 1 },
    ],
  },
  mapping: {
    phases: [
      { label: 'Panel Review', duration_days: 90, display_order: 1 },
      { label: 'Preliminary FIRM Production', duration_days: 120, display_order: 2 },
      { label: 'Community Appeal Period', duration_days: 90, display_order: 3 },
      { label: 'Letter of Final Determination', duration_days: 60, display_order: 4 },
      { label: 'Effective Date Preparation', duration_days: 30, display_order: 5 },
    ],
    milestones: [
      { label: 'Project Kickoff', display_order: 1, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'Preliminary FIRM Issued', display_order: 2, is_key_decision: 1, is_pop_anchor: 0 },
      { label: 'Appeal Period Opens', display_order: 3, is_key_decision: 0, is_pop_anchor: 0 },
      { label: 'Letter of Final Determination', display_order: 4, is_key_decision: 1, is_pop_anchor: 0 },
      { label: 'Effective Date', display_order: 5, is_key_decision: 0, is_pop_anchor: 1 },
    ],
  },
};

/**
 * Build a schedule from a template by working backward from grantEndDate.
 * Last phase ends on grantEndDate; each prior phase ends where the next begins.
 * Milestones are distributed proportionally across the schedule span.
 *
 * @param {object} template - One of the SCHEDULE_TEMPLATES values
 * @param {string} grantEndDate - ISO date string (YYYY-MM-DD), the anchor
 * @returns {{ phases: object[], milestones: object[] }}
 */
export function buildTemplateSchedule(template, grantEndDate) {
  const anchor = parseDate(grantEndDate);

  // Work backward: build phase end/start dates from anchor
  const phases = [];
  let cursor = anchor;

  // Process phases in reverse order so the last one ends at anchor
  const reversed = [...template.phases].reverse();
  for (const tpl of reversed) {
    const end = new Date(cursor);
    const start = new Date(cursor);
    start.setUTCDate(start.getUTCDate() - tpl.duration_days);

    phases.unshift({
      ...tpl,
      start_date: toISODate(start),
      end_date: toISODate(end),
      duration_days: tpl.duration_days,
    });

    cursor = start;
  }

  // Schedule span
  const scheduleStart = cursor; // start of first phase
  const scheduleEnd = anchor;
  const totalSpan = (scheduleEnd - scheduleStart) / MS_PER_DAY;

  // Place milestones proportionally within the span
  // Special cases: first milestone = kickoff = scheduleStart, last = scheduleEnd if is_pop_anchor
  const milestones = template.milestones.map((tpl, i) => {
    let targetDate;
    if (i === 0) {
      targetDate = toISODate(scheduleStart);
    } else if (tpl.is_pop_anchor) {
      targetDate = toISODate(scheduleEnd);
    } else {
      // Distribute evenly between start and end, excluding anchored first/last
      const nonAnchoredCount = template.milestones.length - 2; // exclude first and last
      const nonAnchoredIndex = i - 1; // 0-based index among non-anchored
      const frac = nonAnchoredCount > 0
        ? (nonAnchoredIndex + 1) / (nonAnchoredCount + 1)
        : 0.5;
      const dayOffset = Math.round(totalSpan * frac);
      const d = new Date(scheduleStart);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      targetDate = toISODate(d);
    }
    return { ...tpl, target_date: targetDate };
  });

  return { phases, milestones };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(str) {
  return new Date(str + 'T00:00:00Z');
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}
