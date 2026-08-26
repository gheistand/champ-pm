"""
Revision script for 2026 Illinois CTP Business Plan
Applies all 16 editorial/content fixes to a new copy.
Original file is never modified.
"""

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import os

path_in  = os.path.expanduser("~/champ-pm/BusinessPlan_2026/2026StateILJointBusinessPlan_June2026-May2027.docx")
path_out = os.path.expanduser("~/champ-pm/BusinessPlan_2026/2026StateILJointBusinessPlan_REVISED.docx")

doc = Document(path_in)
log = []

# ══════════════════════════════════════════════════════════════
# UTILITIES
# ══════════════════════════════════════════════════════════════

def full_text(para):
    return ''.join(r.text or '' for r in para.runs)

def replace_in_para(para, old, new):
    if old not in full_text(para):
        return False
    for run in para.runs:
        if old in (run.text or ''):
            run.text = run.text.replace(old, new)
            return True
    # Multi-run fallback
    combined = full_text(para)
    if old in combined:
        if para.runs:
            para.runs[0].text = combined.replace(old, new)
            for r in para.runs[1:]:
                r.text = ''
        return True
    return False

def replace_all(doc, old, new, max_count=None):
    count = 0
    for para in doc.paragraphs:
        if replace_in_para(para, old, new):
            count += 1
            if max_count and count >= max_count:
                return count
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    if replace_in_para(para, old, new):
                        count += 1
    return count

def del_para(para):
    elem = para._element
    parent = elem.getparent()
    if parent is not None:
        parent.remove(elem)

def make_para_elem(text_content, heading_level=None):
    new_p = OxmlElement('w:p')
    if heading_level is not None:
        pPr = OxmlElement('w:pPr')
        pStyle = OxmlElement('w:pStyle')
        pStyle.set(qn('w:val'), f'Heading{heading_level}')
        pPr.append(pStyle)
        new_p.append(pPr)
    new_r = OxmlElement('w:r')
    new_t = OxmlElement('w:t')
    new_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    new_t.text = text_content
    new_r.append(new_t)
    new_p.append(new_r)
    return new_p

# ══════════════════════════════════════════════════════════════
# FIX 1 — "fiscal year 2022" -> "fiscal year 2026"
# ══════════════════════════════════════════════════════════════
n = replace_all(doc, "fiscal year 2022", "fiscal year 2026")
log.append(f"[1]  'fiscal year 2022' -> 'fiscal year 2026': {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 3 — survesy -> surveys
# ══════════════════════════════════════════════════════════════
n = replace_all(doc, "survesy", "surveys")
log.append(f"[3]  'survesy' -> 'surveys': {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 4 — stray apostrophe "of' Illinois"
# ══════════════════════════════════════════════════════════════
n  = replace_all(doc, "of\u2019 Illinois", "of Illinois")
n += replace_all(doc, "of' Illinois",      "of Illinois")
log.append(f"[4]  Stray apostrophe fixed: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 6 — "to for" grammar
# ══════════════════════════════════════════════════════════════
n = replace_all(doc, "federal funding to for planning", "federal funding for planning")
log.append(f"[6]  'to for' -> 'for': {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 7 — Flag expired contract dates
# ══════════════════════════════════════════════════════════════
n  = replace_all(doc, "contract thru 12-31-2025",
                 "contract [EXPIRED 12-31-2025 \u2014 verify current status]")
n += replace_all(doc, "contract thru  2-28-2026",
                 "contract [EXPIRED 2-28-2026 \u2014 verify current status]")
n += replace_all(doc, "contract thru 2-28-2026",
                 "contract [EXPIRED 2-28-2026 \u2014 verify current status]")
log.append(f"[7]  Expired contract dates flagged: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 8 — Stale hiring / retirement dates -> past tense
# ══════════════════════════════════════════════════════════════
n  = replace_all(doc, "1 starting 10/1/2025", "1 started 10/1/2025")
n += replace_all(doc, "retiring 12/31/25 (to be backfilled)",
                 "retired 12/31/25 [verify backfill status as of June 2026]")
log.append(f"[8]  Stale staffing dates updated: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 11 — Appendix LiDAR text: future -> past tense
# ══════════════════════════════════════════════════════════════
lidar_subs = [
    ("are in the process of being acquired in Winter 2019/2020",
     "were acquired in Winter 2019/2020"),
    ("are in the process of being acquired in Spring 2020",
     "were acquired in Spring 2020"),
    ("are contracted to be acquired in Spring 2020",
     "were contracted and acquired in Spring 2020"),
    ("if flooding conditions subside before leaf-out",
     "(acquisition subsequently completed)"),
]
n = 0
for old, new in lidar_subs:
    n += replace_all(doc, old, new)
log.append(f"[11] Appendix LiDAR text updated to past tense: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 14 — "Potential Actions Identified:" -> better framing
# ══════════════════════════════════════════════════════════════
n = replace_all(doc, "Potential Actions Identified:", "Actions planned and underway:")
log.append(f"[14] 'Potential Actions Identified:' reframed: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 15 — Update outreach activity period one year forward
# ══════════════════════════════════════════════════════════════
n = replace_all(doc,
    "June 2023 - May 2024",
    "June 2024 \u2013 May 2025 [verify statistics below reflect updated period]")
log.append(f"[15] Activity period updated June 2024\u2013May 2025: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 13 — CTP Award: add landmark-achievement framing
# ══════════════════════════════════════════════════════════════
OLD_AWARD = ("In 2021, FEMA recognized the Illinois Department of Natural Resources "
             "and Illinois State Water Survey for the fifth annual CTP Recognition Award")
NEW_AWARD = ("In 2021, FEMA recognized the Illinois Department of Natural Resources "
             "and Illinois State Water Survey for the fifth annual CTP Recognition Award "
             "\u2014 a landmark achievement reflecting the program\u2019s sustained excellence")
n = replace_all(doc, OLD_AWARD, NEW_AWARD)
log.append(f"[13] CTP Award framing updated: {n} change(s)")

# ══════════════════════════════════════════════════════════════
# FIX 5 — Remove duplicate coastal-hazard bullet pairs
# (after text fixes above so "to for" bullet is already fixed)
# ══════════════════════════════════════════════════════════════
COASTAL_A = ("Coordinate with agency, NGO and community partners develop and support "
             "plans to build resilience to coastal hazards")
COASTAL_B = "coastal hazards"   # secondary marker alongside "pass-through federal funding"

removed_c = 0
paras_a = [p for p in doc.paragraphs if COASTAL_A in full_text(p)]
for p in paras_a[1:]:
    del_para(p)
    removed_c += 1

paras_b = [p for p in doc.paragraphs
           if "Provide pass-through federal funding" in full_text(p)
           and COASTAL_B in full_text(p)]
for p in paras_b[1:]:
    del_para(p)
    removed_c += 1
log.append(f"[5]  Duplicate coastal-hazard bullets removed: {removed_c}")

# ══════════════════════════════════════════════════════════════
# FIX 2 — Remove duplicate Engineering Studies / Technical
#          Services activity block from Section 3 body text.
#
#  The duplicate starts at a non-heading paragraph whose exact
#  text is "Engineering Studies Section" and ends just before
#  the "Capital Appropriations" body paragraph (which we keep,
#  together with the project list that follows it).
# ══════════════════════════════════════════════════════════════
paras = list(doc.paragraphs)
eng_dup = [
    (i, p) for i, p in enumerate(paras)
    if p.text.strip() == "Engineering Studies Section"
    and not p.style.name.startswith("Heading")
]

removed_dup = 0
if eng_dup:
    dup_start = eng_dup[-1][0]  # LAST non-heading = Section 3 duplicate
    dup_end = None
    for i in range(dup_start, len(paras)):
        if paras[i].text.strip() == "Capital Appropriations":
            dup_end = i
            break
    if dup_end is not None:
        to_del = paras[dup_start:dup_end]
        for p in to_del:
            del_para(p)
            removed_dup += 1
        log.append(f"[2]  Removed {removed_dup} duplicate Eng Studies / Tech Services paragraphs")
    else:
        log.append("[2]  WARNING: 'Capital Appropriations' endpoint not found — MANUAL REVIEW NEEDED")
else:
    log.append("[2]  WARNING: 'Engineering Studies Section' body text not found — MANUAL REVIEW NEEDED")

# ══════════════════════════════════════════════════════════════
# FIX 16 — Placeholder for "Recommendations to FEMA"
# ══════════════════════════════════════════════════════════════
PLACEHOLDER = (
    "[INSERT: ISWS/IDNR recommendations to FEMA for the FFY2026\u20132027 program year. "
    "Include specific requests regarding mapping guidance, program priorities, technical standards, "
    "or other programmatic improvements requested of the FEMA Region V office.]"
)
fix16_done = False
paras = list(doc.paragraphs)
for i, para in enumerate(paras):
    if "Recommendations to FEMA" in para.text and para.style.name.startswith("Heading"):
        next_is_body = (
            i + 1 < len(paras)
            and paras[i + 1].text.strip()
            and not paras[i + 1].style.name.startswith("Heading")
        )
        if not next_is_body:
            ph = make_para_elem(PLACEHOLDER)
            para._element.addnext(ph)
            fix16_done = True
        break
log.append(f"[16] 'Recommendations to FEMA' placeholder added: {fix16_done}")

# ══════════════════════════════════════════════════════════════
# FIX 9 — Add Statewide 2D BLE narrative section
#          New Heading 2 + two body paragraphs inserted
#          immediately before "Programmatic Funding Requests"
# ══════════════════════════════════════════════════════════════
BLE_HEAD = "Statewide Two-Dimensional Base Level Engineering"

BLE_P1 = (
    "Beginning in FFY2026, ISWS will initiate a multi-year statewide two-dimensional (2D) Base Level "
    "Engineering (BLE) project to develop 2D hydraulic modeling coverage for the entire State of "
    "Illinois. This initiative represents a significant advancement in Illinois\u2019 flood hazard "
    "identification capability and aligns with FEMA\u2019s national emphasis on leveraging advanced "
    "modeling for flood risk mapping. The statewide 2D BLE results will be used to prioritize future "
    "data development and mapping needs across the state, help communities quickly assess flood hazards "
    "not currently shown on FEMA regulatory maps, and establish the technical foundation for targeted "
    "future investment in hydrologic and hydraulic studies throughout Illinois."
)

BLE_P2 = (
    "The project is planned as a phased, multi-year effort spanning FFY2026\u2013FFY2028. Phase 1 "
    "(FY26) initiates 2D BLE development in priority areas; Phase 2 (FY27) expands coverage statewide; "
    "and Phase 3 (FY28) completes statewide 2D BLE coverage. ISWS will develop Illinois-specific best "
    "practices for 2D watershed modeling in coordination with FEMA\u2019s guidance document \u201c2D "
    "Watershed Modeling in HEC-RAS Recommended Practices\u201d (November 2021). The completed statewide "
    "2D BLE will serve as a foundational planning and prioritization tool for communities, FEMA Region V, "
    "and IDNR/OWR for years to come."
)

ble_added = False
paras = list(doc.paragraphs)
for para in paras:
    if "Programmatic Funding Requests" in para.text and para.style.name.startswith("Heading"):
        ref = para._element
        # Insert in reverse order so they end up in correct sequence
        p2 = make_para_elem(BLE_P2)
        ref.addprevious(p2)
        p1 = make_para_elem(BLE_P1)
        p2.addprevious(p1)
        heading = make_para_elem(BLE_HEAD, heading_level=2)
        p1.addprevious(heading)
        ble_added = True
        break
log.append(f"[9]  Statewide 2D BLE section added before 'Programmatic Funding Requests': {ble_added}")

# ══════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════
doc.save(path_out)

print("=" * 60)
print("REVISION COMPLETE")
print("=" * 60)
for entry in log:
    print(entry)
print()
print(f"Saved: {path_out}")
print()
print("STILL REQUIRES MANUAL ACTION IN WORD:")
print("  [10] Regenerate TOC: Ctrl+A then F9, or right-click TOC > Update Field")
print("  [12] Publications: add any ISWS pubs from 2020-2026 if available")
print("  [15] Verify statistics in June 2024-May 2025 activity period are current")
