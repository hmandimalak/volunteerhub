export const STATUS_LABELS: Record<string, string> = {
  publie: "Publié",
  en_cours: "En cours",
  termine: "Terminé",
  brouillon: "Brouillon",
  annule: "Annulé",
  complet: "Complet",
  ouverte: "Ouverte",
  fermee: "Fermée",
  complete: "Complète",
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  liste_attente: "Liste d'attente",
  annulee: "Annulée",
  confirmee: "Confirmée",
  presente: "Présent",
  absente: "Absent",
  terminee: "Terminé",
  attended: "Présent",
  completed: "Terminé",
  absent: "Absent",
  qr_code: "QR Code",
  manuel: "Manuel",
  validee: "Validée",
  documents_requis: "Documents requis",
  suspendu: "Suspendu",
  actif: "Actif",
  inactif: "Inactif",
  ouvert: "Ouvert",
  traite: "Traité",
  rejete: "Rejeté",
};

export const ROLE_LABELS: Record<string, string> = {
  benevole: "Bénévole",
  organisation: "Organisation",
  admin: "Administrateur",
};

export function labelStatus(value?: string | null): string {
  if (!value) return "—";
  return STATUS_LABELS[value] ?? value.replaceAll("_", " ");
}

export function labelRole(value?: string | null): string {
  if (!value) return "—";
  return ROLE_LABELS[value] ?? value;
}
