import { EDIT_HISTORY_FILE, EDIT_PROPOSALS_FILE } from '../config/paths.js';
import { RecordStore } from '../utils/recordStore.js';

/**
 * Propositions de modification de carte faites par les modérateurs.
 * Statuts : pending, accepted, rejected.
 */
export const EditProposals = new RecordStore({
  table: 'edit_proposals',
  file: EDIT_PROPOSALS_FILE,
  jsonColumns: ['payload', 'before_state'],
});

/**
 * Modifications de carte appliquées (directes ou propositions acceptées),
 * avec l'état de l'élément avant et après, pour pouvoir les annuler.
 */
export const EditHistory = new RecordStore({
  table: 'edit_history',
  file: EDIT_HISTORY_FILE,
  jsonColumns: ['payload', 'before_state', 'after_state'],
});
