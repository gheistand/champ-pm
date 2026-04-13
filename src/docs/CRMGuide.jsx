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

export default function CRMGuide() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideHeader
        title="CRM — Contacts & Organizations"
        subtitle="Track program officers, partners, subrecipients, and consultants linked to your grants."
      />

      <GuideSection title="What This Page Does">
        <p>
          The CRM (Contact Relationship Manager) lets you maintain a directory of people and organizations
          that CHAMP works with externally — federal program officers, state agency partners, subrecipients,
          and independent consultants. Contacts can be linked to specific grants with a defined relationship
          type, and interactions (calls, emails, meetings) can be logged for reference.
        </p>
        <p>
          Admins have full read/write access. Staff users have read-only access — they can view contacts
          linked to grants they are working on but cannot add, edit, or delete records.
        </p>
      </GuideSection>

      <GuideSection title="When to Use It">
        <p>
          Use the CRM when a new grant is awarded (add the program officer and sponsoring agency),
          when a subrecipient agreement is executed (add the subrecipient organization and contact),
          after a check-in call with a program officer (log the interaction), or when you need to find
          the right contact for a grant without digging through old emails.
        </p>
      </GuideSection>

      <GuideSection title="Contact Types">
        <ColDef
          cols={[
            ["Program Officer", "The federal or state agency staff member responsible for administering the grant. This is the person you call when there is a compliance question or when submitting a progress report."],
            ["Partner", "A collaborating organization or individual contributing to the grant-funded work but not as a formal subrecipient. Examples: another university research group, a state agency co-investigator."],
            ["Subrecipient", "An entity that receives a portion of the grant funds from ISWS to perform a defined scope of work. Subrecipients have formal subaward agreements and require monitoring."],
            ["Contractor / Consultant", "An individual or firm providing services to CHAMP under a contract (not a subaward). Example: a GIS firm, a technical reviewer, a legal consultant."],
            ["Other", "Any external contact that does not fit the above categories — conference contacts, advisory board members, media contacts, etc."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Adding a Contact">
        <Steps
          items={[
            "Navigate to CRM in the sidebar.",
            "Click \"Add Contact\".",
            "Enter the contact's first and last name, email address, and phone number (optional).",
            "Select their contact_type from the dropdown.",
            "If the contact belongs to an organization already in the CRM, select it from the Organization dropdown. If the organization is new, click 'Add Organization' inline and enter the organization name and type.",
            "Add a title (job title at their organization) if known — this is helpful for program officers whose role affects their authority.",
            "Click Save. The contact is now searchable in the CRM directory.",
          ]}
        />
        <Tips
          items={[
            "Add the organization first if you will be adding multiple contacts from the same agency — it saves time.",
            "Email address is not required, but including it makes the contact record much more useful for quick reference.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Linking a Contact to a Grant">
        <p>
          A contact can be linked to one or more grants with a specific relationship type. This is how
          you associate a program officer with the grant they manage, or a subrecipient with the grant
          that funds their subaward.
        </p>
        <Steps
          items={[
            "Open the contact's record from the CRM directory.",
            "Click the \"Grant Links\" tab.",
            "Click \"Link to Grant\".",
            "Select the grant from the dropdown.",
            "Select the relationship_type: Program Officer, Technical POC, Subrecipient, Partner, or Contractor.",
            "Optionally enter a start_date and end_date for the relationship (useful if the program officer changes mid-grant).",
            "Click Save. The contact now appears on the grant's contact list.",
          ]}
        />
        <Tips
          items={[
            "You can also link contacts to a grant from the Grants & Projects page — open a grant and click the Contacts tab.",
            "A contact can be linked to multiple grants with different relationship types.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Grant Link Fields">
        <ColDef
          cols={[
            ["relationship_type", "How this contact relates to the grant: Program Officer, Technical POC, Subrecipient, Partner, or Contractor."],
            ["start_date", "When this relationship began. Optional — useful for tracking changes in program officer assignment."],
            ["end_date", "When this relationship ended. Leave blank for active relationships. Fill in if the program officer changed or a subaward ended."],
            ["notes", "Free text for additional context about this relationship (e.g., 'Backup contact is Sarah Lee', 'Subaward #12345, expires 9/30/2026')."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Logging an Interaction">
        <p>
          Interactions are notes about communications with a contact — phone calls, emails, meetings,
          and site visits. They create an audit trail that is helpful when questions arise later about
          what was discussed or agreed.
        </p>
        <Steps
          items={[
            "Open the contact's record.",
            "Click the \"Interactions\" tab.",
            "Click \"Log Interaction\".",
            "Select the interaction type: Phone Call, Email, Meeting, Site Visit, or Other.",
            "Enter the date of the interaction.",
            "Write a brief summary of what was discussed and any action items in the notes field.",
            "Optionally link the interaction to a specific grant if it was grant-specific.",
            "Click Save.",
          ]}
        />
        <Tips
          items={[
            "Log interactions while the conversation is fresh — even a one-line summary ('Confirmed no-cost extension request received, decision expected by May 15') is valuable months later.",
            "If a program officer makes a verbal statement that modifies grant terms, log it immediately and follow up in writing.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Viewing Contacts for a Specific Grant">
        <Steps
          items={[
            "Navigate to Grants & Projects and open a grant.",
            "Click the \"Contacts\" tab on the grant detail page.",
            "All contacts linked to this grant appear, grouped by relationship type.",
            "Click any contact name to open their full CRM record.",
          ]}
        />
        <Tips
          items={[
            "Alternatively, use the CRM search bar and filter by grant to see all contacts linked to a specific grant.",
            "The Contacts tab on a grant shows the most recent interaction logged for each contact, so you can see at a glance when you last communicated.",
          ]}
        />
      </GuideSection>

      <GuideSection title="Organizations">
        <p>
          Organizations are the agencies, companies, or institutions that contacts belong to. They have
          their own records with type, address, and website fields.
        </p>
        <ColDef
          cols={[
            ["name", "Full legal name of the organization (e.g., 'FEMA Region V', 'Illinois Department of Natural Resources', 'Jacobs Engineering Group')."],
            ["type", "Agency, University, Private Company, Nonprofit, State Agency, or Federal Agency."],
            ["website", "Optional URL for reference."],
            ["notes", "Any relevant context about the organization's relationship with CHAMP (e.g., 'Primary funder for coastal grants', 'Subrecipient under multiple FEMA awards')."],
          ]}
        />
      </GuideSection>

      <GuideSection title="Tips & Common Questions">
        <Tips
          items={[
            "Staff users see the CRM in read-only mode — they can look up program officer contact info but cannot modify any records.",
            "Contacts and organizations are shared across all grants — there is one directory, not a separate one per grant.",
            "If a program officer leaves and is replaced, do not delete the old contact. Set an end_date on their grant link and add the new contact with a new grant link.",
            "The CRM is not a replacement for formal grant documentation. Important correspondence should still be stored in your grants file system (SharePoint, Box, etc.).",
            "You can search the CRM by name, organization, or contact type using the search bar at the top of the CRM page.",
          ]}
        />
      </GuideSection>

      <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <a href="/admin/docs/user-guide/crm" className="text-blue-600 underline">View full documentation →</a>
      </div>
    </div>
  );
}
