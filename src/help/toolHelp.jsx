import { HelpSection, DocLink } from '../components/HelpModal';

const placeholder = (
  <HelpSection title="Documentation">
    <p>Documentation coming soon. Contact Glenn Heistand (<a href="mailto:heistand@illinois.edu" className="text-blue-600 underline">heistand@illinois.edu</a>) with questions about this tool.</p>
  </HelpSection>
);

export const TOOL_HELP = {
  dashboard: {
    title: "Dashboard",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>High-level overview of CHAMP program health — budget status, active grants, recent timesheet activity, and alerts.</p>
        </HelpSection>
        <HelpSection title="Key Metrics">
          <ul className="list-disc pl-4 space-y-1">
            <li>Active grants count</li>
            <li>Total budget vs. spent across all grants</li>
            <li>Staff with pending timesheet submissions</li>
            <li>Upcoming grant expirations</li>
          </ul>
        </HelpSection>
        <HelpSection title="Alerts">
          <p>The dashboard automatically flags:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Critical:</strong> grants past period of performance end date</li>
            <li><strong>Warning:</strong> grants expiring within 90 days, staff with missing timesheets</li>
            <li><strong>Info:</strong> budget overruns, staff without active grant assignments</li>
          </ul>
        </HelpSection>
        <DocLink to="dashboard" />
      </div>
    ),
  },

  staff: {
    title: "Staff Management",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Manage the CHAMP staff roster — add/remove staff, view profiles, track salary history, and assign staff to grants.</p>
        </HelpSection>
        <HelpSection title="Access">
          <p><strong>Admin only.</strong> Staff can view their own profile via My Profile.</p>
        </HelpSection>
        <HelpSection title="Key Actions">
          <ul className="list-disc pl-4 space-y-1">
            <li>Add new staff member (name, email, role, title, classification)</li>
            <li>View and edit staff profile details</li>
            <li>View salary history for a staff member</li>
            <li>Navigate to salary records and assignments</li>
          </ul>
        </HelpSection>
        <HelpSection title="Important Notes">
          <ul className="list-disc pl-4 space-y-1">
            <li>Salary records are <strong>append-only</strong> — history is never deleted or overwritten</li>
            <li>Role in CHAMP-PM (admin / staff / hourly) is separate from HR classification</li>
            <li>Band classification and role start date are needed for the Equity Dashboard</li>
          </ul>
        </HelpSection>
        <DocLink to="staff" />
      </div>
    ),
  },

  grants: {
    title: "Grants",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Manage the FEMA and other grant portfolio. Each grant tracks its budget, period of performance, F&A rate, and status.</p>
        </HelpSection>
        <HelpSection title="Key Fields">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Grant number:</strong> Full CFOP account string (e.g., 1-470736-740000-191200-A00)</li>
            <li><strong>Funder:</strong> FEMA, DHS, GRF, etc.</li>
            <li><strong>Start / End dates:</strong> Official period of performance</li>
            <li><strong>Total budget:</strong> Total award amount</li>
            <li><strong>F&A rate:</strong> Facilities & Administrative rate applied to direct labor</li>
          </ul>
        </HelpSection>
        <HelpSection title="Important: Grant Numbers">
          <p>The grant number field stores the <strong>full account string</strong>, not just the fund number. Fund numbers alone are not unique across the University system. Always use the full account string (e.g., 1-470736-740000-191200-A00).</p>
        </HelpSection>
        <HelpSection title="F&A Rates">
          <p>All FEMA/DHS grants use <strong>31.7% MTDC</strong>. GRF and other grant types may use different rates — check the award terms.</p>
        </HelpSection>
        <DocLink to="grants" />
      </div>
    ),
  },

  budget: {
    title: "Program Budget",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Track actual spending against grant budgets using timesheet data. Shows burn rate and projected exhaustion dates for each grant.</p>
        </HelpSection>
        <HelpSection title="Data Source">
          <p>All figures are calculated from <strong>approved timesheet entries</strong> multiplied by loaded salary rates. Only hours entered and approved in CHAMP-PM are reflected.</p>
        </HelpSection>
        <HelpSection title="Loaded Rate Formula">
          <ul className="list-disc pl-4 space-y-1">
            <li>Hourly rate = Annual salary ÷ 2080</li>
            <li>Loaded hourly = Hourly rate × (1 + fringe rate)</li>
            <li>F&A is calculated separately at the grant level using the grant's F&A rate</li>
          </ul>
        </HelpSection>
        <HelpSection title="Limitations">
          <p>This view only reflects <strong>labor costs</strong> from CHAMP timesheets. Non-labor costs (travel, equipment, subcontracts) are not included. For a full budget picture, reconcile against PRIDE.</p>
        </HelpSection>
        <DocLink to="budget" />
      </div>
    ),
  },

  runway: {
    title: "Program Runway",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Macro-level view of total remaining grant balances vs. projected monthly burn rate across all staff and grants combined. Estimates how many months of funding remain at the current spend rate.</p>
        </HelpSection>
        <HelpSection title="Inputs">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Grant balances:</strong> Entered manually by Glenn from PRIDE (the University financial system)</li>
            <li>Balances should be updated quarterly or after any significant financial event</li>
          </ul>
        </HelpSection>
        <HelpSection title="Output">
          <ul className="list-disc pl-4 space-y-1">
            <li>Estimated months of funding remaining at current burn rate</li>
            <li>Visual runway chart showing projected balance over time</li>
            <li>Per-grant breakdown of remaining balance</li>
          </ul>
        </HelpSection>
        <HelpSection title="Important Limitation">
          <p>Balances are <strong>manually entered</strong> — this is not a live feed from PRIDE. Accuracy depends on how recently balances were updated. Always note the "last updated" date when interpreting results.</p>
        </HelpSection>
        <HelpSection title="Connection to Staff Plans">
          <p>Grant balances entered here are also used by the <strong>Staff Plans</strong> tool as the constraint for optimizer calculations.</p>
        </HelpSection>
        <DocLink to="runway" />
      </div>
    ),
  },

  staffPlans: {
    title: "Staff Plans",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Optimize staff salary appointments across grants to ensure smooth spend-down of each grant before its period of performance ends.</p>
        </HelpSection>
        <HelpSection title="Inputs">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Appointment spreadsheet:</strong> Exported directly from PRIDE (University HR/financial system) — represents current official appointments</li>
            <li><strong>Grant balances:</strong> From the Runway tool (manually updated from PRIDE)</li>
            <li><strong>Salary records:</strong> From CHAMP-PM staff records</li>
          </ul>
        </HelpSection>
        <HelpSection title="Key Assumptions">
          <ul className="list-disc pl-4 space-y-1">
            <li>All staff in scope are Academic Professional (AP) appointment type</li>
            <li>Fringe rate: <strong>45.1%</strong> (SURS-eligible AP rate, FY2026)</li>
            <li>F&A rate: <strong>31.7% MTDC</strong> (all FEMA/DHS grants)</li>
            <li>Burn rate formula: (salary ÷ 12) × allocation% × 1.451 × 1.317</li>
            <li>Staff are only appointed to grants they have historically worked on</li>
            <li>Minimum appointment: <strong>5%</strong> (PRIDE system constraint)</li>
            <li>No appointment past grant period of performance end date</li>
            <li>No appointment exceeding total remaining grant balance</li>
          </ul>
        </HelpSection>
        <HelpSection title="Output">
          <p>Proposed appointment schedule (periods + percentages) exportable to Excel in PRIDE-ready format.</p>
        </HelpSection>
        <HelpSection title="Workflow">
          <ol className="list-decimal pl-4 space-y-1">
            <li>Import current appointment spreadsheet from PRIDE</li>
            <li>Review optimizer output</li>
            <li>Adjust overrides as needed</li>
            <li>Export to Excel</li>
            <li>Manually enter into PRIDE quarterly</li>
          </ol>
        </HelpSection>
        <HelpSection title="Important">
          <p>Results are a <strong>starting point, not a final answer.</strong> Glenn reviews and adjusts before any PRIDE entry.</p>
        </HelpSection>
        <DocLink to="staff-plans" />
      </div>
    ),
  },

  timesheets: {
    title: "Timesheet Approvals",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Admin view of all staff timesheet submissions — approve, reject, or return for correction. View by period or by staff member.</p>
        </HelpSection>
        <HelpSection title="Workflow">
          <ol className="list-decimal pl-4 space-y-1">
            <li>Staff submit weekly timesheets from their My Timesheet page</li>
            <li>Admin reviews submissions here</li>
            <li>Approve correct timesheets or return with a rejection reason</li>
            <li>Staff correct and resubmit rejected timesheets</li>
          </ol>
        </HelpSection>
        <HelpSection title="Important">
          <p><strong>Only approved hours</strong> are used in budget burn calculations and reports. Pending or rejected timesheets have no effect on reported spend.</p>
        </HelpSection>
        <DocLink to="timesheets" />
      </div>
    ),
  },

  timesheet: {
    title: "My Timesheet",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Enter your weekly work hours by project task and submit for admin approval each week.</p>
        </HelpSection>
        <HelpSection title="Rules">
          <ul className="list-disc pl-4 space-y-1">
            <li>Hours are entered against tasks you have been assigned to</li>
            <li>Overhead tasks (leave, admin time, professional development) are available to all staff</li>
            <li>You can only edit timesheets that are in draft or rejected status</li>
          </ul>
        </HelpSection>
        <HelpSection title="Submission">
          <p>Submit your timesheet by the end of each work week. Late submissions are flagged. Once submitted, your timesheet goes to the admin queue for approval.</p>
        </HelpSection>
        <HelpSection title="After Submission">
          <p>If your timesheet is returned (rejected), you will need to correct it and resubmit. Check the rejection reason for guidance.</p>
        </HelpSection>
        <DocLink to="timesheets" />
      </div>
    ),
  },

  reports: {
    title: "Reports",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Generate detailed timesheet and budget reports. Export to CSV or Excel for external reporting, grant invoicing, or internal analysis.</p>
        </HelpSection>
        <HelpSection title="Available Reports">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Timesheet detail:</strong> Hours by staff member, grant, or time period</li>
            <li><strong>Budget summary:</strong> Spend vs. budget by grant</li>
            <li><strong>Labor cost breakdown:</strong> Salary + fringe + F&A detail by grant and employee</li>
          </ul>
        </HelpSection>
        <HelpSection title="Data">
          <p>Reports are based on <strong>approved timesheet entries only.</strong> Pending or rejected timesheets are excluded.</p>
        </HelpSection>
        <DocLink to="reports" />
      </div>
    ),
  },

  equity: {
    title: "Equity Dashboard",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Analyze salary equity across staff — compare compensation relative to tenure, role, and performance band.</p>
        </HelpSection>
        <HelpSection title="Data Requirements">
          <p>Full analysis requires these fields to be populated for each staff member:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Band classification:</strong> Salary band (set in Staff Management)</li>
            <li><strong>Role start date:</strong> When staff member entered their current role</li>
          </ul>
        </HelpSection>
        <HelpSection title="Status">
          <p>Partially operational — requires band_classification and role_start_date data for full analysis. These fields are currently being populated.</p>
        </HelpSection>
        <DocLink to="equity" />
      </div>
    ),
  },

  promotions: {
    title: "Promotion Readiness",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Track staff promotion history and readiness scores. Supports performance review and advancement decisions.</p>
        </HelpSection>
        <HelpSection title="Inputs">
          <ul className="list-disc pl-4 space-y-1">
            <li>Role history and tenure in current role</li>
            <li>Performance indicators</li>
            <li>Band classification</li>
          </ul>
        </HelpSection>
        <HelpSection title="Status">
          <p>Active — full scoring methodology documentation to be added.</p>
        </HelpSection>
      </div>
    ),
  },

  salary: {
    title: "Salary Records",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>View and manage staff salary history. All records are append-only — salary history is never deleted or modified.</p>
        </HelpSection>
        <HelpSection title="Core Rule">
          <p><strong>Never edit existing salary records.</strong> Always add a new record with the correct effective date for any salary change. This preserves accurate historical records for budget calculations and audits.</p>
        </HelpSection>
        <HelpSection title="Used By">
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Budget burndown:</strong> Calculates loaded cost per hour for timesheet entries</li>
            <li><strong>Staff Plans optimizer:</strong> Projects future spend based on current salary</li>
          </ul>
        </HelpSection>
        <DocLink to="salary" />
      </div>
    ),
  },

  salaryAdjustments: {
    title: "Salary Adjustments",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Process salary adjustments — create new salary records with correct effective dates for all staff in a single workflow.</p>
        </HelpSection>
        <HelpSection title="Access">
          <p><strong>Admin only.</strong> Creates append-only records in salary history.</p>
        </HelpSection>
        <HelpSection title="Important">
          <p>Salary adjustments always create <em>new</em> records — they do not modify existing history. Set the effective date correctly to ensure accurate budget calculations going forward.</p>
        </HelpSection>
      </div>
    ),
  },

  import: {
    title: "Import Timesheets",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Bulk import timesheet data from CSV exports. Maps external project and task names to CHAMP task IDs.</p>
        </HelpSection>
        <HelpSection title="Use Cases">
          <ul className="list-disc pl-4 space-y-1">
            <li>Import historical timesheet data during initial setup</li>
            <li>Import data from external time tracking systems</li>
            <li>Bulk load data for a specific time period</li>
          </ul>
        </HelpSection>
        <HelpSection title="Mapping">
          <p>External project/task names must be mapped to CHAMP task IDs before import. Manage mappings on the Import page. Unmapped entries are flagged for review before import completes.</p>
        </HelpSection>
        <DocLink to="import" />
      </div>
    ),
  },

  crm: {
    title: "CRM — Contacts",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>Track contacts, organizations, and interactions related to CHAMP grants. Links contacts to specific grants with relationship types.</p>
        </HelpSection>
        <HelpSection title="Access">
          <p><strong>Admin writes, all staff read.</strong> Any staff member can view contacts; only admins can add or edit.</p>
        </HelpSection>
        <HelpSection title="Contact Types">
          <ul className="list-disc pl-4 space-y-1">
            <li>Program officers (FEMA/DHS)</li>
            <li>Partners and collaborators</li>
            <li>Subrecipients</li>
            <li>Consultants and contractors</li>
          </ul>
        </HelpSection>
        <HelpSection title="Grant Links">
          <p>Contacts can be linked to specific grants with a relationship type (program officer, partner, subrecipient, etc.). This helps track who to contact for each active grant.</p>
        </HelpSection>
        <DocLink to="crm" />
      </div>
    ),
  },

  workload: {
    title: "Workload",
    content: (
      <div>
        <HelpSection title="Purpose">
          <p>View staff workload distribution across grants — helps identify over- or under-allocated staff and balance assignments.</p>
        </HelpSection>
        <HelpSection title="Data Source">
          <p>Based on active task assignments and recent timesheet hours.</p>
        </HelpSection>
        <HelpSection title="Status">
          <p>Documentation coming soon. Contact Glenn Heistand (<a href="mailto:heistand@illinois.edu" className="text-blue-600 underline">heistand@illinois.edu</a>) with questions.</p>
        </HelpSection>
      </div>
    ),
  },

  projects: { title: "Projects", content: placeholder },
  tasks: { title: "Tasks", content: placeholder },
  assignments: { title: "Assignments", content: placeholder },
  myAssignments: { title: "My Assignments", content: placeholder },
  myProfile: { title: "My Profile", content: placeholder },
  classifications: { title: "Classifications", content: placeholder },
  fringeRates: { title: "Fringe Rates", content: placeholder },
  grantDetail: { title: "Grant Detail", content: placeholder },
  projectDetail: { title: "Project Detail", content: placeholder },
};
