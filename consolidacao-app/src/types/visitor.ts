export type VisitorStatus =
  | "NEW"
  | "CONTACT_PENDING"
  | "CONTACTED"
  | "IN_FOLLOW_UP"
  | "COMPLETED";

export type Visitor = {
  id: string;
  organizationId: string;
  cellId: string | null;
  cellName: string | null;

  name: string;
  phone: string | null;
  address: string | null;
  invitedBy: string | null;
  visitDate: string;
  notes: string | null;
followUpOwnerName: string | null;
nextContactDate: string | null;
nextAction: string | null;
  receivedAtService: boolean;
  receivedGift: boolean;
  phoneConfirmed: boolean;
  firstContactMade: boolean;
  invitedToCell: boolean;
  attendedCell: boolean;
  followUpCompleted: boolean;

  status: VisitorStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Cell = {
  id: string;
  name: string;
  leaderName: string | null;
};