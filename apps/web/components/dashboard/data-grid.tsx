"use client";

import {
  CellStyleModule,
  ClientSideRowModelModule,
  type ColDef,
  ColumnAutoSizeModule,
  CsvExportModule,
  DateFilterModule,
  type GridApi,
  type GridReadyEvent,
  NumberFilterModule,
  PaginationModule,
  QuickFilterModule,
  TextFilterModule,
  themeQuartz,
  TooltipModule,
  ValidationModule,
} from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useDarkMode } from "@/lib/use-dark-mode";

const modules = [
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  QuickFilterModule,
  CsvExportModule,
  PaginationModule,
  CellStyleModule,
  ColumnAutoSizeModule,
  TooltipModule,
  // Explains misconfigured grids in the console during development only.
  ...(process.env.NODE_ENV === "production" ? [] : [ValidationModule]),
];

const shared = {
  fontFamily: "inherit",
  fontSize: 13,
  headerFontWeight: 600,
  borderRadius: 8,
  wrapperBorderRadius: 12,
  spacing: 7,
  accentColor: "#22a35a",
};

const lightTheme = themeQuartz.withParams({
  ...shared,
  backgroundColor: "#fbfaf7",
  foregroundColor: "#16181d",
  headerBackgroundColor: "#f2f1ec",
  borderColor: "#e3e1da",
  rowHoverColor: "#f0efe9",
});

const darkTheme = themeQuartz.withParams({
  ...shared,
  backgroundColor: "#16181d",
  foregroundColor: "#f3f2ee",
  headerBackgroundColor: "#1d2027",
  borderColor: "#2c3039",
  rowHoverColor: "#20242c",
  accentColor: "#2aa654",
});

export interface DataGridProps<T> {
  rows: T[];
  columns: ColDef<T>[];
  /** Used for the search box label and the CSV file name. */
  label: string;
  /** Show 25 rows per page instead of one long list. */
  paginate?: boolean;
  emptyMessage?: string;
  /** "content": columns as wide as their content (many columns). "width": share the grid's width (few columns). */
  fit?: "content" | "width";
}

/** AG Grid with MrStockd's look: search, sorting, filters, CSV export, light and dark. */
export function DataGrid<T>({ rows, columns, label, paginate, emptyMessage, fit = "content" }: DataGridProps<T>) {
  const dark = useDarkMode();
  const searchId = useId();
  const api = useRef<GridApi<T> | null>(null);
  const [search, setSearch] = useState("");

  const defaultColDef = useMemo<ColDef<T>>(() => ({ sortable: true, filter: true, resizable: true, minWidth: 90 }), []);
  const onGridReady = useCallback((e: GridReadyEvent<T>) => {
    api.current = e.api;
  }, []);

  return (
    <AgGridProvider modules={modules}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={searchId} className="sr-only">
            Search {label}
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-current/20 bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-stock/60 sm:max-w-xs"
          />
          <button
            type="button"
            onClick={() => api.current?.exportDataAsCsv({ fileName: `mrstockd-${label.toLowerCase().replace(/\s+/g, "-")}.csv` })}
            className="min-h-11 rounded-full border border-current/20 px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-stock/60"
          >
            Export CSV
          </button>
        </div>
        <div className="w-full">
          <AgGridReact<T>
            theme={dark ? darkTheme : lightTheme}
            rowData={rows}
            columnDefs={columns}
            defaultColDef={defaultColDef}
            quickFilterText={search}
            domLayout="autoHeight"
            pagination={paginate}
            paginationPageSize={25}
            paginationPageSizeSelector={[25, 50, 100]}
            autoSizeStrategy={fit === "width" ? { type: "fitGridWidth", defaultMinWidth: 110 } : { type: "fitCellContents" }}
            tooltipShowDelay={300}
            overlayNoRowsTemplate={`<span style="padding:16px">${emptyMessage ?? "Nothing here yet."}</span>`}
            onGridReady={onGridReady}
            enableCellTextSelection
            ensureDomOrder
          />
        </div>
      </div>
    </AgGridProvider>
  );
}
