import { CityCustomization } from '../models/CityCustomization.js';
import { EditHistory, EditProposals } from '../models/EditRecords.js';
import { Report } from '../models/Report.js';

/**
 * Modifications de carte : application directe, propositions et historique.
 *
 * Une modification (« edit ») est décrite par :
 *   { cityKey, itemType: 'district'|'route'|'difficulty', action: 'save'|'delete', payload }
 * avec payload :
 *   - save district/route : { feature, originalName } (+ difficulty pour une rue)
 *   - delete district/route : { id }
 *   - difficulty : { streetName, difficulty }
 *
 * Pour chaque modification on sait lire l'état de l'élément visé (readState),
 * l'appliquer (applyEdit) et remettre un état lu auparavant (restoreState).
 * L'état avant sert à détecter les conflits (l'élément a changé entre la
 * proposition et sa validation) et à annuler.
 */
export const ITEM_TYPES = ['district', 'route', 'difficulty'];
const COLLECTION_TYPES = ['district', 'route'];

/**
 * Erreurs métier : NOT_FOUND, NOT_PENDING, FORBIDDEN, CONFLICT,
 * REASON_REQUIRED, ALREADY_UNDONE. `details` accompagne CONFLICT.
 */
export class EditError extends Error {
  constructor(code, details = null) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

const normalizeStreetName = (name) => String(name).toLowerCase().trim();

/** JSON aux clés triées : deux états égaux donnent la même chaîne. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function sameState(a, b) {
  return canonical(a) === canonical(b);
}

function targetId(edit) {
  return edit.action === 'save' ? edit.payload.feature.properties.id : String(edit.payload.id);
}

export function elementKey(edit) {
  if (edit.itemType === 'difficulty') return `difficulty:${normalizeStreetName(edit.payload.streetName)}`;
  return `${edit.itemType}:${targetId(edit)}`;
}

export function editLabel(edit) {
  if (edit.itemType === 'difficulty') return edit.payload.streetName;
  if (edit.action === 'save') return edit.payload.feature.properties.name;
  return String(edit.payload.id);
}

async function difficultyOf(cityKey, streetName) {
  const overrides = await CityCustomization.getDifficultyOverrides(cityKey);
  return overrides[normalizeStreetName(streetName)] ?? null;
}

function touchesDifficulty(edit) {
  return edit.itemType === 'route' && edit.action === 'save' && 'difficulty' in edit.payload;
}

export async function readState(edit) {
  const { cityKey, itemType, action, payload } = edit;
  if (itemType === 'difficulty') {
    return { difficulty: await difficultyOf(cityKey, payload.streetName) };
  }
  const feature =
    action === 'save'
      ? await CityCustomization.findStored(itemType, cityKey, {
        id: payload.feature.properties.id,
        originalName: payload.originalName || null,
      })
      : await CityCustomization.findStored(itemType, cityKey, { id: payload.id, forDelete: true });
  const state = { feature };
  if (touchesDifficulty(edit)) {
    state.difficulty = await difficultyOf(cityKey, payload.feature.properties.name);
  }
  return state;
}

async function applyEdit(edit) {
  const { cityKey, itemType, action, payload } = edit;
  if (itemType === 'difficulty') {
    await CityCustomization.setDifficultyOverride(cityKey, payload.streetName, payload.difficulty);
    return;
  }
  if (action === 'delete') {
    if (itemType === 'district') await CityCustomization.deleteDistrict(cityKey, payload.id);
    else await CityCustomization.deleteRoute(cityKey, payload.id);
    return;
  }
  if (touchesDifficulty(edit)) {
    await CityCustomization.setDifficultyOverride(cityKey, payload.feature.properties.name, payload.difficulty);
  }
  if (itemType === 'district') await CityCustomization.saveDistrict(cityKey, payload.feature, payload.originalName);
  else await CityCustomization.saveRoute(cityKey, payload.feature, payload.originalName);
}

async function restoreState(edit, state) {
  const { cityKey, itemType, payload } = edit;
  if (itemType === 'difficulty') {
    await CityCustomization.setDifficultyOverride(cityKey, payload.streetName, state?.difficulty ?? null);
    return;
  }
  if (COLLECTION_TYPES.includes(itemType)) {
    await CityCustomization.restoreStored(itemType, cityKey, targetId(edit), state?.feature ?? null);
  }
  if (touchesDifficulty(edit) && state && 'difficulty' in state) {
    await CityCustomization.setDifficultyOverride(cityKey, payload.feature.properties.name, state.difficulty);
  }
}

function editOf(record) {
  return {
    cityKey: record.city_key,
    itemType: record.item_type,
    action: record.action,
    payload: record.payload,
  };
}

/** Le signalement à l'origine de la modification est marqué comme traité. */
async function resolveReport(reportId) {
  if (!reportId) return;
  try {
    await Report.updateStatus(reportId, 'resolved');
  } catch (err) {
    console.error('[edits] Signalement non mis à jour :', err);
  }
}

async function applyAndRecord(edit, { author, validator = null, proposalId = null, reportId = null }) {
  const before = await readState(edit);
  await applyEdit(edit);
  const after = await readState(edit);
  const entry = await EditHistory.insert({
    city_key: edit.cityKey,
    author,
    validator,
    item_type: edit.itemType,
    action: edit.action,
    element_key: elementKey(edit),
    label: editLabel(edit),
    payload: edit.payload,
    before_state: before,
    after_state: after,
    proposal_id: proposalId,
    report_id: reportId,
  });
  await resolveReport(reportId);
  return entry;
}

/**
 * Un relecteur peut traiter une proposition : administrateur partout,
 * super-modérateur dans sa zone.
 * @param {{ role: string, cities: Array<{key: string}> }} access
 */
export function canReview(access, cityKey) {
  if (access.role === 'admin') return true;
  return access.role === 'super_moderator' && access.cities.some((c) => c.key === cityKey);
}

export class EditService {
  /**
   * Modification envoyée depuis l'éditeur. Un modérateur crée une proposition ;
   * un super-modérateur ou un administrateur l'applique directement.
   * @returns {Promise<{ proposal?: object, history?: object }>}
   */
  static async submit(edit, { username, access, reportId = null }) {
    if (access.role === 'moderator') {
      const proposal = await EditProposals.insert({
        city_key: edit.cityKey,
        author: username,
        item_type: edit.itemType,
        action: edit.action,
        element_key: elementKey(edit),
        label: editLabel(edit),
        payload: edit.payload,
        before_state: await readState(edit),
        report_id: reportId,
        status: 'pending',
      });
      return { proposal };
    }
    const history = await applyAndRecord(edit, { author: username, reportId });
    return { history };
  }

  /**
   * Propositions visibles : toutes pour l'administrateur ; celles de sa zone
   * et les siennes pour un super-modérateur ; les siennes pour un modérateur.
   */
  static async listProposals(access, username, { status, cityKey } = {}) {
    const all = await EditProposals.find({ status, city_key: cityKey });
    return all.filter((p) => p.author === username || canReview(access, p.city_key));
  }

  /** Proposition avec l'état actuel de l'élément (aperçu avant / après). */
  static async getProposal(id, access, username) {
    const proposal = await EditProposals.findById(id);
    if (!proposal || (proposal.author !== username && !canReview(access, proposal.city_key))) {
      throw new EditError('NOT_FOUND');
    }
    const current = await readState(editOf(proposal));
    return { ...proposal, current_state: current, changed: !sameState(current, proposal.before_state) };
  }

  /**
   * Applique une proposition. Refusée (CONFLICT) si l'élément a changé depuis.
   */
  static async accept(id, access, reviewer) {
    const proposal = await EditProposals.findById(id);
    if (!proposal || !canReview(access, proposal.city_key)) throw new EditError('NOT_FOUND');
    if (proposal.status !== 'pending') throw new EditError('NOT_PENDING');
    const edit = editOf(proposal);
    const current = await readState(edit);
    if (!sameState(current, proposal.before_state)) {
      throw new EditError('CONFLICT', { current_state: current });
    }
    const claimed = await EditProposals.updateIf(id, { status: 'pending' }, {
      status: 'accepted',
      reviewer,
      reviewed_at: new Date().toISOString(),
    });
    if (!claimed) throw new EditError('NOT_PENDING');
    const history = await applyAndRecord(edit, {
      author: proposal.author,
      validator: reviewer,
      proposalId: proposal.id,
      reportId: proposal.report_id,
    });
    return { proposal: claimed, history };
  }

  static async reject(id, access, reviewer, reason) {
    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
    if (!cleanReason) throw new EditError('REASON_REQUIRED');
    const proposal = await EditProposals.findById(id);
    if (!proposal || !canReview(access, proposal.city_key)) throw new EditError('NOT_FOUND');
    const rejected = await EditProposals.updateIf(id, { status: 'pending' }, {
      status: 'rejected',
      reviewer,
      reject_reason: cleanReason,
      reviewed_at: new Date().toISOString(),
    });
    if (!rejected) throw new EditError('NOT_PENDING');
    return rejected;
  }

  /** Historique, filtrable par commune et par auteur. */
  static listHistory({ cityKey, author } = {}) {
    return EditHistory.find({ city_key: cityKey, author });
  }

  /**
   * Remet l'élément dans son état d'avant la modification. Sans `force`,
   * refuse (CONFLICT) si l'élément a changé depuis : modification plus
   * récente non annulée, ou état actuel différent de l'état après.
   */
  static async undo(id, admin, { force = false } = {}) {
    const entry = await EditHistory.findById(id);
    if (!entry) throw new EditError('NOT_FOUND');
    if (entry.undone_at) throw new EditError('ALREADY_UNDONE');
    const edit = editOf(entry);
    const later = (await EditHistory.find({ city_key: entry.city_key, element_key: entry.element_key, undone_at: null }))
      .filter((e) => e.id > entry.id);
    const current = await readState(edit);
    const changed = !sameState(current, entry.after_state);
    if ((later.length > 0 || changed) && !force) {
      throw new EditError('CONFLICT', {
        later: later.map(({ id: laterId, author, created_at: createdAt }) => ({ id: laterId, author, created_at: createdAt })),
        changed,
      });
    }
    const claimed = await EditHistory.updateIf(id, { undone_at: null }, {
      undone_by: admin,
      undone_at: new Date().toISOString(),
    });
    if (!claimed) throw new EditError('ALREADY_UNDONE');
    await restoreState(edit, entry.before_state);
    return claimed;
  }
}
