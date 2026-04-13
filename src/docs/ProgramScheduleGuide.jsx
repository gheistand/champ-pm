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

export default function ProgramScheduleGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="Program Schedule (Cross-Grant Gantt)"
        subtitle="Full-program timeline showing all projects across all grants, organized by study area swim lanes."
      />

      <GuideSection title="What This Page Does">
        <p>
          The Program Schedule is a full-program Gantt chart that displays every project across all active
          grants simultaneously, organized into study area swim lanes. It also shows cross-project dependency
          connectors, making it possible to see at a glance how projects in different grants are sequenced
          and where bottlenecks might cascade.
        </p>
        <p>
          For a single-project view with scenario editing, use the Project Schedule page instead. The
          Program Schedule is read-oriented — it is best used for program-level reviews and presentations.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use the Program Schedule for section leadership reviews, program officer briefings, or any
          situation where you need to communicate the full scope of CHAMP's active work and its timeline.
          It is also useful for spotting resource conflicts — two projects with heavy workloads in the
          same swim lane at the same time.
        </p>
      </GuideSection>

      <GuideSection title="Understanding Swim Lanes">
        <p>
          Projects are grouped into horizontal swim lanes by study area. A study area is a thematic or
          geographic grouping of work (e.g., Coastal Flood Mapping, River Hydrology, Groundwater). Each
          swim lane has a labeled header and contains all the projects in that study area regardless of
          which grant funds them.
        </p>
        <ColDef
          cols={[
            ["Swim lane header", "The study area name, shown as a sticky label on the left side of the chart. Always visible when scrolling right through long timelines."],
            ["Project bars", "Horizontal bars within the swim lane representing each project's duration. Each bar is labeled with the project name."],
            ["Grant badge", "A small colored badge on each project bar showing which grant funds it. Useful when multiple grants fund projects in the same swim lane."],
            ["Milestone diamonds", "Key milestones from each project's schedule. PoP Anchors appear as filled diamonds; Key Decisions as outlined diamonds."],
          ]}
        />
        <Tips
          items={[
            "Study areas are assigned at the project level in the Grants & Projects page — look for the 'Study Area' field when creating or editing a project.",
            "Projects without a study area assigned will appear in an 'Unassigned' swim lane at the bottom of the chart.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Reading the Cross-Grant View">
        <p>
          The Program Schedule shows all grants simultaneously. This allows you to see:
        </p>
        <Tips
          items={[
            "Which grants are running in parallel vs. sequentially.",
            "Whether a study area has a gap in coverage (no active project) between grant periods.",
            "Which study areas have the most concurrent workload in a given period.",
            "How grant end dates (shown as PoP Anchor milestones) line up with project completion.",
          ]}
        />
        <p>
          The timeline header shows months. A vertical red line marks today's date. Horizontal scroll
          moves through time; vertical scroll moves through swim lanes.
        </p>
      </GuideSection>

      <GuideSection title="Dependency Connector Lines">
        <p>
          Dependency connectors are lines drawn between projects (or phases) in different grants to show
          that one piece of work must complete before another can start, or that two projects are linked
          by data handoffs.
        </p>
        <ColDef
          cols={[
            ["Finish-to-Start connector", "A line from the end of one project bar to the start of another. The most common type — means 'Project B cannot start until Project A is complete.'"],
            ["Data dependency connector", "A dashed line indicating a data handoff (e.g., 'Coastal flood analysis results feed into the Hydrology risk model')."],
            ["Connector color", "Connectors are color-coded by status: gray = on schedule, yellow = at risk (dependent is starting before predecessor is complete), red = broken (predecessor has missed its end date)."],
          ]}
        />
        <Tips
          items={[
            "Dependencies are defined in the Project Schedule page on each individual project. They appear on the Program Schedule as connectors between projects.",
            "A red connector is a trigger for a cross-grant schedule review — the delay in one project may require adjusting the start date of a dependent project.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Filtering by Grant">
        <Steps
          items={[
            "Use the Grant filter at the top of the Program Schedule to show only projects from one or more selected grants.",
            "Select a grant from the dropdown. Only swim lanes containing projects from that grant will be shown.",
            "To show multiple grants, hold Ctrl (Windows) or Cmd (Mac) while selecting in the dropdown.",
            "To clear the filter and show all grants, click the X in the filter field or select 'All Grants'.",
          ]}
        />
        <Tips
          items={[
            "Filtering by grant is useful when briefing a program officer — show them only their grant's projects, not the full cross-program view.",
            "Even with a grant filter active, cross-grant dependency connectors are still shown so you can see how the filtered grant's work depends on or is depended upon by other grants.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Navigating Large Timelines">
        <p>
          The Program Schedule can span multiple years across many grants and projects. Several navigation
          features help you orient yourself:
        </p>
        <ColDef
          cols={[
            ["Sticky label column", "The leftmost column (swim lane names and project labels) stays fixed as you scroll horizontally through time. You always know which row you are looking at."],
            ["Sticky timeline header", "The month/year header at the top stays fixed as you scroll vertically through swim lanes. You always know what time period you are looking at."],
            ["Synchronized scroll", "Horizontal scrolling in the Gantt area and the timeline header are synchronized — they always show the same time period."],
            ["Zoom controls", "Use the + / − buttons to zoom in (showing weeks) or out (showing quarters or years) on the timeline."],
            ["Jump to today", "The 'Today' button in the toolbar scrolls the timeline to center on the current date."],
            ["Jump to grant", "Clicking a grant in the filter dropdown scrolls the timeline to show that grant's start date on the left edge."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "The Program Schedule is read-only — you cannot edit phases or milestones directly here. Use the Project Schedule page for editing.",
            "If a project is missing from the Program Schedule, verify that it has at least one phase with dates defined in the Project Schedule.",
            "For very large programs (20+ projects spanning 5+ years), use the Zoom Out control to get a high-level overview, then zoom in on the time period of interest.",
            "The Program Schedule is print/export friendly — use your browser's print function for a PDF snapshot suitable for reports.",
            "Dependency connectors only appear if they have been defined in the individual project schedules. If you expect connectors but don't see them, check the dependency settings in the relevant project.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/program-schedule" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
