"""
Builds sheet/ExpenseManager-template.xlsx — the uploadable starting point.

Requires: python -m pip install openpyxl
Run from the project root: python sheet/build_template.py

Keep this in sync with:
  packages/core/src/schema.ts   (headers, schema version)
  apps/script/Setup.gs          (seed categories/budgets)
The script's Setup / repair sheet only appends missing columns, so this file
must already match the current schema exactly.
"""

from datetime import datetime, timezone
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent / "ExpenseManager-template.xlsx"

SCHEMA_VERSION = 2
NOW = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
DEVICE = "seed"

BASE = ["updated_at", "device_id", "deleted"]

HEADERS = {
    "Expenses": ["id", "date", "amount_paise", "category_id", "account_id", "payee",
                 "notes", "tags", "created_at", *BASE],
    "Income": ["id", "date", "amount_paise", "category_id", "account_id", "payee",
               "notes", "tags", "created_at", *BASE],
    "Transfers": ["id", "date", "amount_paise", "from_account_id", "to_account_id",
                  "notes", "created_at", *BASE],
    "Accounts": ["id", "name", "type", "opening_balance_paise", "active", *BASE],
    "Categories": ["id", "name", "type", "parent_id", "icon", "color",
                   "monthly_budget_paise", "active", *BASE, "pinned", "sort_order"],
    "Budgets": ["id", "month", "kind", "category_id", "amount_paise", *BASE],
    "Recurring": ["id", "amount_paise", "type", "category_id", "account_id", "payee",
                  "rule", "next_date", "active", *BASE],
    "Meta": ["key", "value"],
}

WIDTHS = {
    "Expenses": [26, 12, 14, 16, 16, 22, 30, 18, 22, 22, 22, 9],
    "Income": [26, 12, 14, 16, 16, 22, 30, 18, 22, 22, 22, 9],
    "Transfers": [26, 12, 14, 16, 16, 30, 22, 22, 22, 9],
    "Accounts": [14, 18, 12, 20, 9, 22, 12, 9],
    "Categories": [12, 16, 11, 12, 7, 10, 20, 9, 22, 12, 9, 8, 10],
    "Budgets": [14, 12, 10, 16, 14, 22, 12, 9],
    "Recurring": [26, 14, 12, 16, 16, 22, 16, 12, 9, 22, 12, 9],
    "Meta": [18, 28],
}

# Columns that must stay text, so Sheets does not turn ids into numbers or
# "2026-12" into a date.
TEXT_COLUMNS = {
    "id", "date", "created_at", "updated_at", "device_id", "category_id",
    "account_id", "from_account_id", "to_account_id", "month", "next_date",
    "tags", "rule", "parent_id", "color",
}
PAISE_COLUMNS = {"amount_paise", "opening_balance_paise", "monthly_budget_paise"}

BOOL_COLUMNS = {"active", "deleted", "pinned"}

HEADER_FILL = PatternFill("solid", fgColor="F1F3F4")

SEED_CATEGORIES = [
    # id, name, icon, colour, pinned, sort_order
    ["cat-exp-1", "Food", "🍜", "#f97316", True, 1],
    ["cat-exp-2", "Groceries", "🛒", "#22c55e", True, 2],
    ["cat-exp-3", "Transport", "🚌", "#3b82f6", True, 3],
    ["cat-exp-4", "Bills", "⚡", "#eab308", True, 4],
    ["cat-exp-5", "Shopping", "🛍️", "#ec4899", False, 0],
    ["cat-exp-6", "Health", "💊", "#ef4444", False, 0],
    ["cat-exp-7", "Entertainment", "🎬", "#06b6d4", False, 0],
    ["cat-exp-8", "Travel", "✈️", "#0ea5e9", False, 0],
    ["cat-exp-9", "Other", "📦", "#64748b", False, 0],
    ["cat-inc-1", "Salary", "💰", "#16a34a", True, 1],
    ["cat-inc-2", "Refund", "↩️", "#0d9488", False, 0],
    ["cat-inc-3", "Interest", "📈", "#7c3aed", False, 0],
    ["cat-inc-4", "Gift", "🎁", "#db2777", False, 0],
    ["cat-inc-5", "Other", "📦", "#64748b", False, 0],
]


def category_rows():
    rows = []
    for cid, name, icon, color, pinned, order in SEED_CATEGORIES:
        ctype = "income" if cid.startswith("cat-inc") else "expense"
        rows.append([cid, name, ctype, "", icon, color, 0, True, NOW, DEVICE, False, pinned, order])
    return rows


SEEDS = {
    "Categories": category_rows(),
    "Budgets": [
        ["bud-total", "*", "total", "", 0, NOW, DEVICE, False],
        ["bud-daily", "*", "daily", "", 0, NOW, DEVICE, False],
    ],
    "Meta": [
        ["schema_version", str(SCHEMA_VERSION)],
        ["currency", "INR"],
        ["locale", "en-IN"],
        ["week_start", "1"],
    ],
}


def build_start_here(wb):
    ws = wb.create_sheet("START HERE", 0)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 110

    title = Font(bold=True, size=16)
    bold = Font(bold=True)
    normal = Font(size=11)

    lines = [
        ("Expense Manager — start here", title),
        ("", normal),
        ("This workbook is the database. The app talks to it through a small Apps Script", normal),
        ("Web App; the sheet stays private in your Google Drive. Once the script is", normal),
        ("installed, the View and Read me tabs are generated automatically.", normal),
        ("", normal),
        ("1. If this is still an .xlsx file: File → Save as Google Sheets.", bold),
        ("2. Extensions → Apps Script.", bold),
        ("3. Delete the default Code.gs contents and paste all of sheet/AppsScript.gs.", bold),
        ("4. File → New → HTML file, name it ConnectionInfo, paste apps/script/ConnectionInfo.html.", bold),
        ("5. Project Settings → tick “Show appsscript.json”; replace it with apps/script/appsscript.json.", bold),
        ("6. Save, reload the sheet, then run Expense Tracker → 1. Setup / repair sheet.", bold),
        ("7. Deploy → New deployment → Web app. Execute as Me, access Anyone. Authorise when asked.", bold),
        ("8. Expense Tracker → 2. Show connection info. Copy the URL and the token.", bold),
        ("9. In the app: Connect, paste both. Done — add an expense and check the Expenses tab.", bold),
        ("", normal),
        ("Rules that keep sync safe:", bold),
        ("• Amounts are integer paise: 12500 = ₹125.00. Never type ₹125 or 125.00 into a paise column.", normal),
        ("• Never delete rows by hand, and never edit id, created_at, updated_at, device_id or deleted.", normal),
        ("• deleted = TRUE is a tombstone (a delete that travels to other devices).", normal),
        ("• You can add your own columns; the app preserves and ignores them.", normal),
        ("• Do not rename or remove the required columns. Matching is by column name.", normal),
        ("• Budgets: month = * for every month or YYYY-MM; kind = total | daily | category.", normal),
        ("", normal),
        ("You can delete this tab once the app is connected.", normal),
    ]

    for i, (text, font) in enumerate(lines, start=1):
        cell = ws.cell(row=i, column=1, value=text if text else None)
        cell.font = font
        cell.alignment = Alignment(wrap_text=True, vertical="top")

    ws.freeze_panes = "A2"
    return ws


def main():
    wb = Workbook()
    wb.remove(wb.active)

    build_start_here(wb)

    for tab, headers in HEADERS.items():
        ws = wb.create_sheet(tab)
        ws.append(headers)

        for row in SEEDS.get(tab, []):
            ws.append([None if v == "" else v for v in row])

        for col, width in enumerate(WIDTHS[tab], start=1):
            ws.column_dimensions[get_column_letter(col)].width = width

        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col)
            cell.font = Font(bold=True)
            cell.fill = HEADER_FILL
            cell.alignment = Alignment(vertical="center")

            # Format the first 500 data rows so manual edits stay text/paise.
            for row in range(2, 502):
                target = ws.cell(row=row, column=col)
                if header in PAISE_COLUMNS:
                    target.number_format = "#,##0"
                elif header in TEXT_COLUMNS:
                    target.number_format = "@"
                elif header in BOOL_COLUMNS:
                    target.alignment = Alignment(horizontal="center")

        ws.freeze_panes = "A2"
        ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}1"

        # Dropdowns for the small enums.
        if tab == "Accounts":
            dv = DataValidation(type="list", formula1='"cash,bank,upi,credit,wallet"', allow_blank=True)
            ws.add_data_validation(dv)
            dv.add("C2:C1000")
        elif tab == "Categories":
            dv = DataValidation(type="list", formula1='"expense,income"', allow_blank=True)
            ws.add_data_validation(dv)
            dv.add("C2:C1000")
        elif tab == "Budgets":
            dv = DataValidation(type="list", formula1='"total,daily,category"', allow_blank=True)
            ws.add_data_validation(dv)
            dv.add("C2:C1000")
        elif tab == "Recurring":
            dv = DataValidation(type="list", formula1='"expense,income"', allow_blank=True)
            ws.add_data_validation(dv)
            dv.add("C2:C1000")

    wb.properties.title = "Expense Manager"
    wb.properties.description = "Private expense tracker — sheet-backed database (schema v2)."
    wb.save(OUT)
    print(f"wrote {OUT}")
    print("tabs:", ", ".join(wb.sheetnames))


if __name__ == "__main__":
    main()
