export type PostJob = {
  tenant: string;
  template: string;
  channels: string[]; // e.g., ["yt","fb","ig"]
  data: Record<string, unknown>;
  createdAt: number;
  idemKey: string;
};
