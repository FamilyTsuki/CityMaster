import { ApiService } from '../services/ApiService.js';
import { I18nService } from '../services/I18nService.js';
import { NetworkService } from '../services/NetworkService.js';
import { FlashMessageService } from '../services/FlashMessageService.js';

/**
 * Classements. Les scores eux-mêmes sont enregistrés par le serveur à la fin
 * de chaque partie en ligne (POST /api/game/submit-round) : le client n'envoie
 * jamais de score directement. Les parties hors-ligne ne sont pas classées.
 */
const LEGACY_PENDING_SCORES_KEY = 'citymaster_pending_scores';

export class ScoreController {
  #gameView;

  constructor(gameView) {
    this.#gameView = gameView;
    // Ancienne file d'envoi de scores hors-ligne, jamais synchronisable.
    try {
      localStorage.removeItem(LEGACY_PENDING_SCORES_KEY);
    } catch (e) {
      console.warn('Unable to clean legacy pending scores:', e);
    }
  }

  async loadLeaderboard(type = 'monthly', difficulty = 'hard') {
    if (!NetworkService.getInstance().isOnline()) {
      FlashMessageService.show(
        I18nService.getInstance().t(
          'offline.leaderboard_requires_connection',
          {},
          'Le classement nécessite une connexion Internet.',
        ),
        'info',
      );
      return;
    }
    const res = await ApiService.get(
      `/scores?type=${encodeURIComponent(type)}&difficulty=${encodeURIComponent(difficulty)}`,
      { includeAuth: false },
    );
    if (res.ok && res.data) {
      this.#gameView.renderLeaderboard(res.data, type, difficulty);
    } else {
      console.error('Failed to load leaderboard', res.status, res.error || res.data?.error);
    }
  }
}
