function GuideHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="text-xs text-gray-400 mb-1">User Guide → {title}</div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      <p className="text-xs text-gray-400 mt-2">Last reviewed: April 2026</p>
    </div>
  );
}

function GuideSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-2 pb-1 border-b border-gray-200">{title}</h3>
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol className="list-none space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
          <span className="text-sm text-gray-700">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tips({ items }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700">
          <span className="text-blue-500 shrink-0">→</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function ColDef({ cols }) {
  return (
    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">Column / Field</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">What it means</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {cols.map(([k, v], i) => (
          <tr key={i}>
            <td className="px-3 py-2 font-medium text-gray-800">{k}</td>
            <td className="px-3 py-2 text-gray-600">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ScheduleGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Project Schedule (Gantt)"
        subtitle="Per-project Gantt chart with phases, milestones, and what-if date scenarios."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Project Schedule page shows a Gantt chart for a single project: its phases (work blocks with
          start and end dates), milestones (key dates and decisions), and optional what-if scenarios that
          let you model date shifts without affecting the base schedule.
        </p>
        <p>
          For a multi-project, cross-grant view, see the Program Schedule page instead.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use the Project Schedule when planning or reviewing work for a specific project: setting up the
          initial schedule at project kickoff, tracking progress, creating a what-if scenario to explore
          the impact of a delay, or preparing a schedule update for a program officer report.
        </p>
      </GuideSection>

      <GuideSection title="Phases">
        <p>
          Phases are the primary building blocks of a project schedule. Each phase represents a distinct
          period of work or a project stage.
        </p>
        <ColDef
          cols={[
            ["name", "Descriptive label for the phase (e.g., 'Phase 1 — Data Collection', 'Phase 2 — Analysis')."],
            ["start_date", "The first day the phase work begins."],
            ["end_date", "The last day of the phase. Phases can overlap — this is common when different work streams run in parallel."],
            ["color", "Display color for the phase bar in the Gantt chart. Choose a color that visually distinguishes this phase from adjacent ones."],
            ["display_order", "Integer that controls the vertical order of phases in the Gantt. Lower numbers appear at the top. Use multiples of 10 (10, 20, 30) to leave room for reordering without renumbering."],
            ["notes", "Optional notes visible when hovering or clicking the phase bar."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Setting Up Phases for a New Project">
        <Steps
          items={[
            "Navigate to Project Schedule in the sidebar and select the project from the dropdown.",
            "Click \"Add Phase\".",
            "Enter the phase name, start_date, end_date, and select a color.",
            "Set display_order to 10 for the first phase, 20 for the second, etc.",
            "Click Save. The phase bar appears on the Gantt chart.",
            "Repeat for all phases in the project.",
            "Drag phase bars left or right on the Gantt to adjust dates visually, or edit the dates directly in the form.",
          ]}
        />
        <Tips
          items={[
            "If phases are heavily overlapping and the chart looks cluttered, consider whether some should be merged or represented as sub-tasks.",
            "Phase start and end dates should align with the grant Period of Performance — phases should not extend past the grant end_date.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Milestones">
        <p>
          Milestones mark specific target dates rather than durations. They appear as diamond icons on the
          Gantt timeline.
        </p>
        <ColDef
          cols={[
            ["name", "Label for the milestone (e.g., 'Draft Report Due', 'Final Deliverable', 'Program Officer Site Visit')."],
            ["target_date", "The date the milestone is expected to occur."],
            ["milestone_type", "PoP Anchor or Key Decision. PoP anchors are tied to the grant Period of Performance (e.g., 'Grant Start', 'Grant End', 'Extension Deadline'). Key Decisions are internal project gates."],
            ["status", "planned, achieved, or missed. Update status after a milestone date passes."],
            ["notes", "Context about the milestone — e.g., for a PoP anchor, note the relevant award document clause."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Adding Milestones">
        <Steps
          items={[
            "Click \"Add Milestone\" on the Project Schedule page.",
            "Enter the milestone name and target_date.",
            "Select the milestone_type. Use 'PoP Anchor' for any milestone that corresponds to a grant compliance date. Use 'Key Decision' for internal project gates.",
            "Set status to 'planned' initially.",
            "Click Save. The milestone diamond appears on the Gantt at the correct date.",
            "After the milestone date passes, update the status to 'achieved' or 'missed' to keep the schedule current.",
          ]}
        />
        <Tips
          items={[
            "Always create PoP Anchor milestones for the grant start_date and end_date. This makes it visually obvious when work is approaching the end of the funded period.",
            "A 'missed' milestone in red on the Gantt is an immediate visual cue for schedule review.",
          ]}
        />
      </GuideSection>

      <GuideSection title="What-If Scenarios">
        <p>
          Scenarios allow you to model schedule changes without altering the base schedule. A scenario
          is a saved set of date adjustments — you can shift phases and milestones forward or backward
          to explore the impact of a delay or acceleration.
        </p>
        <Steps
          items={[
            "Click \"New Scenario\" on the Project Schedule page.",
            "Enter a scenario name (e.g., '3-Month Delay — Data Delivery', 'Accelerated Completion').",
            "The scenario opens with a copy of the base schedule. All phases and milestones are editable.",
            "Adjust dates within the scenario. Changes appear highlighted in the scenario view but the base schedule is unaffected.",
            "Save the scenario. It is now available from the scenario switcher dropdown.",
            "Switch between the base schedule and scenarios using the dropdown at the top of the Gantt.",
          ]}
        />
        <Tips
          items={[
            "Scenarios are useful for presenting 'best case / worst case' options to a program officer or section chief.",
            "You can have multiple scenarios per project. Common examples: on-time, 3-month delay, accelerated.",
            "Scenario data is isolated — deleting a scenario does not affect the base schedule or other scenarios.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Reading the Gantt View">
        <ColDef
          cols={[
            ["Timeline header", "Displays months and years across the top. The current date is marked with a vertical red line ('today' indicator)."],
            ["Phase bars", "Horizontal bars showing the duration of each phase. Color-coded by the phase's color setting. Width represents duration."],
            ["Milestone diamonds", "Diamond icons on the timeline representing milestone target dates. PoP Anchors use a filled diamond; Key Decisions use an outlined diamond."],
            ["Status colors", "Achieved milestones are shown in green, missed milestones in red, planned milestones in the phase color or gray."],
            ["Hover tooltip", "Hovering over a bar or diamond shows the name, dates, and notes for that element."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "The Gantt automatically zooms to fit all phases and milestones. If the chart looks too compressed, use the zoom controls to expand the timeline.",
            "You can reorder phases by changing their display_order values — lower numbers appear higher in the chart.",
            "Phases and milestones can be on the same horizontal row if they don't overlap in time — the system stacks them automatically when they do overlap.",
            "The project Gantt is print-friendly — use your browser's print function to generate a PDF for reporting.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/schedule" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
