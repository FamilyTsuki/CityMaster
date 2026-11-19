import { EditError, EditService } from '../services/EditService.js';
import { isValidCityKey } from '../config/paths.js';
import { parsePositiveId } from '../utils/identifiers.js';

const PROPOSAL_STATUSES = ['pending', 'accepted', 'rejected'];

const ERROR_RESPONSES = {
  NOT_FOUND: [404, 'Not found'],
  NOT_PENDING: [409, 'Proposal already reviewed'],
  CONFLICT: [409, 'Element changed since'],
  REASON_REQUIRED: [400, 'A reason is required'],
  ALREADY_UNDONE: [409, 'Change already undone'],
};

function optionalCityKey(value) {
  return isValidCityKey(value) ? value : undefined;
}

/**
 * Exécute une action et traduit les EditError en réponses HTTP. Un conflit
 * renvoie aussi ses détails (code: 'CONFLICT').
 */
async function handle(res, label, action) {
  try {
    return await action();
  } catch (err) {
    if (err instanceof EditError && ERROR_RESPONSES[err.code]) {
      const [status, error] = ERROR_RESPONSES[err.code];
      return res.status(status).json({ error, code: err.code, ...(err.details || {}) });
    }
    console.error(`EditController ${label} error:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export class EditController {
  static listProposals(req, res) {
    return handle(res, 'listProposals', async () => {
      const status = PROPOSAL_STATUSES.includes(req.query.status) ? req.query.status : undefined;
      const proposals = await EditService.listProposals(req.access, req.user.username, {
        status,
        cityKey: optionalCityKey(req.query.cityKey),
      });
      return res.json(proposals);
    });
  }

  static getProposal(req, res) {
    return handle(res, 'getProposal', async () => {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      return res.json(await EditService.getProposal(id, req.access, req.user.username));
    });
  }

  static acceptProposal(req, res) {
    return handle(res, 'acceptProposal', async () => {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      return res.json(await EditService.accept(id, req.access, req.user.username));
    });
  }

  static rejectProposal(req, res) {
    return handle(res, 'rejectProposal', async () => {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const proposal = await EditService.reject(id, req.access, req.user.username, req.body?.reason);
      return res.json({ proposal });
    });
  }

  static listHistory(req, res) {
    return handle(res, 'listHistory', async () => {
      const author = typeof req.query.author === 'string' && req.query.author.trim() ? req.query.author.trim() : undefined;
      return res.json(await EditService.listHistory({ cityKey: optionalCityKey(req.query.cityKey), author }));
    });
  }

  static undo(req, res) {
    return handle(res, 'undo', async () => {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const entry = await EditService.undo(id, req.user.username, { force: req.body?.force === true });
      return res.json({ entry });
    });
  }
}
