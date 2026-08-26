#!/usr/bin/env python3
"""Convert CHAMP MAS analysis Markdown files to PDF using markdown + weasyprint."""

import os
import subprocess
import sys

files = [
    "FFY2020_summary",
    "FFY2021_summary",
    "FFY2022_summary",
    "FFY2023_summary",
    "FFY2024_summary",
    "FFY2025_summary",
    "CROSS_YEAR_TRACKING",
    "FFY2026_RECOMMENDATIONS",
]

base = os.path.expanduser("~/champ-pm/MAS_analysis/")

CSS = """
<style>
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10pt;
    line-height: 1.5;
    margin: 0;
    padding: 0;
    color: #1a1a1a;
  }
  h1 {
    font-size: 18pt;
    color: #1a3a6a;
    border-bottom: 2px solid #1a3a6a;
    padding-bottom: 4px;
    margin-top: 24px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 14pt;
    color: #2a4a8a;
    border-bottom: 1px solid #ccc;
    margin-top: 20px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    color: #1a3a6a;
    margin-top: 16px;
    page-break-after: avoid;
  }
  h4 {
    font-size: 11pt;
    color: #333;
    margin-top: 12px;
    page-break-after: avoid;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 9pt;
    page-break-inside: auto;
  }
  th {
    background-color: #1a3a6a;
    color: white;
    padding: 5px 8px;
    text-align: left;
    font-size: 9pt;
  }
  td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background-color: #f5f7fa;
  }
  code {
    background-color: #f0f0f0;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9pt;
    font-family: "Courier New", monospace;
  }
  pre {
    background-color: #f4f4f4;
    padding: 10px;
    border-left: 3px solid #1a3a6a;
    font-size: 8.5pt;
    overflow-x: auto;
    font-family: "Courier New", monospace;
  }
  blockquote {
    border-left: 4px solid #1a3a6a;
    margin: 10px 20px;
    padding: 5px 10px;
    color: #444;
    background-color: #f5f7fa;
  }
  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 16px 0;
  }
  ul, ol {
    padding-left: 20px;
  }
  li {
    margin-bottom: 3px;
  }
  strong {
    font-weight: bold;
  }
  em {
    font-style: italic;
    color: #555;
  }
  @page {
    size: letter;
    margin: 0.75in 0.75in 0.75in 0.75in;
    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-size: 8pt;
      color: #888;
    }
    @bottom-left {
      content: "ISWS CHAMP Program — Confidential Working Document";
      font-size: 8pt;
      color: #888;
    }
  }
</style>
"""

import markdown as md_lib

results = []

for f in files:
    md_path = base + f + ".md"
    pdf_path = base + f + ".pdf"
    html_path = base + f + "_tmp.html"

    if not os.path.exists(md_path):
        results.append(f"  SKIP  {f}.md — file not found")
        continue

    print(f"Converting {f}.md → {f}.pdf ...", end=" ", flush=True)

    # Read markdown
    with open(md_path, "r", encoding="utf-8") as fp:
        md_text = fp.read()

    # Convert to HTML
    html_body = md_lib.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "nl2br"]
    )

    full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{f}</title>
{CSS}
</head>
<body>
{html_body}
</body>
</html>"""

    # Write temp HTML
    with open(html_path, "w", encoding="utf-8") as fp:
        fp.write(full_html)

    # Convert with weasyprint
    try:
        result = subprocess.run(
            ["python3", "-m", "weasyprint", html_path, pdf_path],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            size_kb = os.path.getsize(pdf_path) // 1024
            results.append(f"  OK    {f}.pdf ({size_kb} KB)")
            print(f"OK ({size_kb} KB)")
        else:
            results.append(f"  FAIL  {f}.pdf — weasyprint error: {result.stderr[:200]}")
            print(f"FAILED")
            print(f"  stderr: {result.stderr[:400]}")
    except subprocess.TimeoutExpired:
        results.append(f"  TIMEOUT  {f}.pdf")
        print("TIMEOUT")
    except Exception as e:
        results.append(f"  ERROR  {f}.pdf — {e}")
        print(f"ERROR: {e}")
    finally:
        # Clean up temp HTML
        if os.path.exists(html_path):
            os.remove(html_path)

print("\n=== PDF Conversion Summary ===")
for r in results:
    print(r)
