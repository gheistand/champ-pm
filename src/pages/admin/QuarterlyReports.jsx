import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '../../hooks/useToast';

function currentFiscalYear() {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

function quarterDateRange(fy, q) {
  // Calendar year quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
  switch (q) {
    case 'Q1': return { start: new Date(fy, 0, 1),  end: new Date(fy, 2, 31) };
    case 'Q2': return { start: new Date(fy, 3, 1),  end: new Date(fy, 5, 30) };
    case 'Q3': return { start: new Date(fy, 6, 1),  end: new Date(fy, 8, 30) };
    case 'Q4': return { start: new Date(fy, 9, 1),  end: new Date(fy, 11, 31) };
    default:   return { start: new Date(fy, 0, 1),  end: new Date(fy, 2, 31) };
  }
}

function quarterLabel(fy, q) {
  const { start, end } = quarterDateRange(fy, q);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

async function parseFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });
}

function parseStatusDate(text) {
  if (!text || typeof text !== 'string') return null;
  const slashMatch = text.match(/As of\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  const monthMatch = text.match(/As of\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (monthMatch) {
    const [, month, d, y] = monthMatch;
    return new Date(`${month} ${d}, ${y}`);
  }
  return null;
}

// Regex to identify a valid MIP Case# (e.g. "22-05-0007S" or "16-05-2865S")
const MIP_CASE_RE = /^\d{2}-\d{2}-\d{4}[A-Z]$/;

function buildStatusMap(workbook, quarterStart, quarterEnd) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const statusMap = {};

  // Detect which column holds the MIP Case# by scanning the header row for known labels
  // and which column first has the status-update pattern
  let mipCol = -1;
  let statusStartCol = -1;

  for (const row of rows) {
    // Find the MIP Case# column: look for a cell matching the pattern OR the header label
    if (mipCol === -1) {
      for (let c = 0; c < row.length; c++) {
        const v = String(row[c] || '');
        if (MIP_CASE_RE.test(v.trim()) || v.replace(/\s+/g, ' ').toLowerCase().includes('mip') && v.toLowerCase().includes('case')) {
          mipCol = c;
          break;
        }
      }
    }
    // Find the first status-update column: look for a cell starting with "As of"
    if (statusStartCol === -1) {
      for (let c = 0; c < row.length; c++) {
        if (/^as of/i.test(String(row[c] || '').trim())) {
          statusStartCol = c;
          break;
        }
      }
    }
    if (mipCol !== -1 && statusStartCol !== -1) break;
  }

  // Fallback to known offsets if detection failed
  if (mipCol === -1) mipCol = 1;        // column C when B is first (B=0,C=1)
  if (statusStartCol === -1) statusStartCol = 6; // column H when B is first

  for (const row of rows) {
    const mipCase = String(row[mipCol] || '').trim();
    if (!mipCase || !MIP_CASE_RE.test(mipCase)) continue; // skip non-data rows

    let bestUpdate = null;

    for (let col = statusStartCol; col < row.length; col++) {
      const cellText = String(row[col] || '').trim();
      if (!cellText) continue;
      const cellDate = parseStatusDate(cellText);
      if (!cellDate) continue;
      if (cellDate >= quarterStart && cellDate <= quarterEnd) {
        if (!bestUpdate || cellDate > bestUpdate.date) {
          bestUpdate = { date: cellDate, text: cellText };
        }
      }
    }

    if (bestUpdate) {
      if (!statusMap[mipCase]) statusMap[mipCase] = [];
      statusMap[mipCase].push(bestUpdate);
    } else if (!(mipCase in statusMap)) {
      // Mark as found but no in-quarter update
      statusMap[mipCase] = null;
    }
  }

  return statusMap;
}

function parseProgressTab(workbook) {
  const wsName = workbook.SheetNames[0];
  const ws = workbook.Sheets[wsName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
}

function FileDropZone({ label, helper, file, fileName, onFile, onClear }) {
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  function handleChange(e) {
    const f = e.target.files[0];
    if (f) onFile(f);
  }

  if (fileName) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 truncate">{fileName}</p>
          <p className="text-xs text-green-600">{label}</p>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-red-500 hover:text-red-700 shrink-0"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleChange}
      />
      <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{helper}</p>
      <p className="text-xs text-gray-400 mt-2">Click or drag .xlsx file here</p>
    </div>
  );
}

function MatchBadge({ status }) {
  if (status === 'matched') {
    return (
      <span className="inline-flex items-center gap-1 text-green-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === 'no_quarter_update') {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600" title="Project found but no update within this quarter">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </span>
    );
  }
  return <span className="text-gray-400 text-sm">—</span>;
}

export default function QuarterlyReports() {
  const { addToast } = useToast();
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear);
  const [quarter, setQuarter] = useState('Q1');
  const [previousReport, setPreviousReport] = useState(null);
  const [previousReportName, setPreviousReportName] = useState('');
  const [statusSheet, setStatusSheet] = useState(null);
  const [statusSheetName, setStatusSheetName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const canProcess = previousReport && statusSheet && fiscalYear > 2000;

  function toggleExpand(idx) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function processFiles() {
    if (!canProcess) return;
    setProcessing(true);
    setResult(null);
    try {
      const { start, end } = quarterDateRange(fiscalYear, quarter);

      const prevWb = await parseFile(previousReport);
      const statusWb = await parseFile(statusSheet);

      const statusMap = buildStatusMap(statusWb, start, end);
      const progressRows = parseProgressTab(prevWb);

      const updatedRows = [];
      const matchResults = [];

      for (let i = 0; i < progressRows.length; i++) {
        const row = [...progressRows[i]];
        if (i === 0) { updatedRows.push(row); continue; }

        const mipCase = String(row[1] || '').trim();
        if (!mipCase) { updatedRows.push(row); continue; }

        const updates = statusMap[mipCase];
        let matchStatus;

        if (Array.isArray(updates) && updates.length > 0) {
          const best = updates.reduce((a, b) => a.date > b.date ? a : b);
          // Append the new status to the end of existing comments.
          // best.text already starts with "As of MM/DD/YYYY:" from the status spreadsheet.
          const existing = String(row[4] || '').trim();
          const newEntry = best.text.trim();
          row[4] = existing ? `${existing}\n\n${newEntry}` : newEntry;
          matchStatus = 'matched';
        } else if (mipCase in statusMap) {
          matchStatus = 'no_quarter_update';
        } else {
          matchStatus = 'not_found';
        }

        updatedRows.push(row);
        matchResults.push({
          masNum: row[0],
          mipCase,
          projectName: row[2],
          status: row[3],
          comments: row[4],
          matchStatus,
        });
      }

      const outWb = XLSX.utils.book_new();
      const progressWs = XLSX.utils.aoa_to_sheet(updatedRows);
      progressWs['!cols'] = [
        { wch: 14 },
        { wch: 16 },
        { wch: 35 },
        { wch: 14 },
        { wch: 80 },
      ];
      XLSX.utils.book_append_sheet(outWb, progressWs, 'Progress');

      for (const sheetName of prevWb.SheetNames.slice(1)) {
        XLSX.utils.book_append_sheet(outWb, prevWb.Sheets[sheetName], sheetName);
      }

      setResult({ rows: matchResults, workbook: outWb });
      setExpandedRows(new Set());
    } catch (err) {
      addToast('Processing failed: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  }

  function downloadReport() {
    if (!result) return;
    const filename = `FFY${fiscalYear}_${quarter}_ISWS_ProgressReport.xlsx`;
    XLSX.writeFile(result.workbook, filename);
  }

  const matchedCount = result?.rows.filter(r => r.matchStatus === 'matched').length ?? 0;
  const totalCount = result?.rows.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quarterly Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate FEMA quarterly progress reports from your status updates.
        </p>
      </div>

      {/* Step 1: Quarter selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Step 1 — Select Quarter
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Federal Fiscal Year</label>
            <input
              type="number"
              value={fiscalYear}
              onChange={e => setFiscalYear(parseInt(e.target.value) || currentFiscalYear())}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              min="2000"
              max="2099"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quarter</label>
            <select
              value={quarter}
              onChange={e => setQuarter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="Q1">Q1 (Jan–Mar)</option>
              <option value="Q2">Q2 (Apr–Jun)</option>
              <option value="Q3">Q3 (Jul–Sep)</option>
              <option value="Q4">Q4 (Oct–Dec)</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Date range:</span>{' '}
          {quarterLabel(fiscalYear, quarter)}
        </p>
      </div>

      {/* Step 2: Previous report upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Step 2 — Upload Previous Quarterly Report
        </h2>
        <FileDropZone
          label="Previous quarterly report (template)"
          helper="The .xlsx report from last quarter for the same grant"
          file={previousReport}
          fileName={previousReportName}
          onFile={f => { setPreviousReport(f); setPreviousReportName(f.name); setResult(null); }}
          onClear={() => { setPreviousReport(null); setPreviousReportName(''); setResult(null); }}
        />
      </div>

      {/* Step 3: Status spreadsheet upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Step 3 — Upload Running Status Spreadsheet
        </h2>
        <FileDropZone
          label="Running status spreadsheet"
          helper="The IL_Status_Updates spreadsheet with all project narratives"
          file={statusSheet}
          fileName={statusSheetName}
          onFile={f => { setStatusSheet(f); setStatusSheetName(f.name); setResult(null); }}
          onClear={() => { setStatusSheet(null); setStatusSheetName(''); setResult(null); }}
        />
      </div>

      {/* Step 4: Process & Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Step 4 — Preview &amp; Generate
        </h2>

        <button
          onClick={processFiles}
          disabled={!canProcess || processing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </>
          ) : 'Process Files'}
        </button>

        {!canProcess && !processing && (
          <p className="text-xs text-gray-400">
            Upload both files and select a quarter to enable processing.
          </p>
        )}

        {result && (
          <div className="space-y-4 pt-2">
            {/* Preview table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">MAS #</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">MIP Case #</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Project Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Match</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.rows.map((row, idx) => {
                    const isExpanded = expandedRows.has(idx);
                    const comment = String(row.comments || '');
                    const truncated = comment.length > 80 ? comment.slice(0, 80) + '…' : comment;
                    return (
                      <tr key={idx} className={row.matchStatus === 'matched' ? 'bg-green-50/30' : row.matchStatus === 'no_quarter_update' ? 'bg-amber-50/30' : ''}>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.masNum}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono text-xs">{row.mipCase}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-xs">{row.projectName}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{row.status}</td>
                        <td className="px-3 py-2 text-center">
                          <MatchBadge status={row.matchStatus} />
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs max-w-sm">
                          {comment.length > 80 ? (
                            <>
                              {isExpanded ? comment : truncated}
                              {' '}
                              <button
                                onClick={() => toggleExpand(idx)}
                                className="text-brand-600 hover:underline"
                              >
                                {isExpanded ? 'less' : 'more'}
                              </button>
                            </>
                          ) : comment}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">{matchedCount}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> projects matched with in-quarter status updates.
            </p>

            {/* CTP/SPI note */}
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-800">
                CTP and SPI/CPI tabs are copied unchanged from your uploaded report. Fill those in manually before submitting to FEMA.
              </p>
            </div>

            {/* Download button */}
            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Updated Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
