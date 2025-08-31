// constants/jobs.ts

export type Leads = {
  id: string;
  namn: string;
  created_at: string;
  status: "Godkänd" | "Schemalagd" | "Stängd";
};

export const mockLeads: Leads[] = [
  {
    id: "1",
    namn: "React AB",
    created_at: "2025-05-24",
    status: "Godkänd",
  },
  {
    id: "2",
    namn: "Google",
    created_at: "2025-05-23",
    status: "Schemalagd",
  },
  {
    id: "3",
    namn: "Playstation",
    created_at: "2025-05-22",
    status: "Stängd",
  },
  {
    id: "4",
    namn: "Apple",
    created_at: "2025-05-21",
    status: "Godkänd",
  },
  {
    id: "5",
    namn: "Microsoft",
    created_at: "2025-05-20",
    status: "Schemalagd",
  },
  {
    id: "6",
    namn: "Amazon",
    created_at: "2025-05-19",
    status: "Godkänd",
  },
  {
    id: "7",
    namn: "Facebook",
    created_at: "2025-05-18",
    status: "Schemalagd",
  },
];
