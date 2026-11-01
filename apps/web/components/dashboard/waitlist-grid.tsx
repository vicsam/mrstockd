"use client";

import type { ColDef } from "ag-grid-community";
import { DataGrid } from "./data-grid";

export interface WaitlistRow {
  id: string;
  email: string;
  role: string;
  name: string | null;
  agentDescription: string | null;
  agentLink: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

const columns: ColDef<WaitlistRow>[] = [
  { field: "createdAt", headerName: "Joined", minWidth: 170 },
  { field: "email", headerName: "Email", minWidth: 220 },
  { field: "role", headerName: "Role", minWidth: 90 },
  { field: "name", headerName: "Name", minWidth: 140 },
  { field: "agentDescription", headerName: "Agent description", minWidth: 220 },
  { field: "agentLink", headerName: "Agent link", minWidth: 200 },
  { field: "utmSource", headerName: "UTM source", minWidth: 120 },
  { field: "utmMedium", headerName: "UTM medium", minWidth: 120 },
  { field: "utmCampaign", headerName: "UTM campaign", minWidth: 140 },
];

export function WaitlistGrid({ rows }: { rows: WaitlistRow[] }) {
  return <DataGrid rows={rows} columns={columns} label="Waitlist signups" paginate emptyMessage="No signups yet." fit="content" />;
}
