import { ApiService } from '../services/ApiService.js';
import { I18nService } from '../services/I18nService.js';
import { NetworkService } from '../services/NetworkService.js';
import { FlashMessageService } from '../services/FlashMessageService.js';

export class ScoreController {
  #gameView;
  static #STORAGE_KEY = 'citymaster_pending_scores';

  constructor(gameView) {
    this.#gameView = gameView;

    NetworkService.getInstance().onStatusChange((isOnline) => {
      if (isOnline) {
        this.flushPendingScores();
      }
    });

    if (NetworkService.getInstance().isOnline()) {
      setTimeout(() => this.flushPendingScores(), 1500);
    }
  }

  async loadLeaderboard(type = 'monthly', difficulty = 'hard') {
    if (!NetworkService.getInstance().isOnline()) {
      FlashMessageService.show(
        I18nService.getInstance().t(
          'offline.leaderboard_requires_connection',
          {},
          'Le classement nécessite une connexion Internet.'
        ),
        'info'
      );
      return;
    }
    try {
      const res = await ApiService.get(
        `/scores?type=${encodeURIComponent(type)}&difficulty=${encodeURIComponent(difficulty)}`,
        { includeAuth: false }
      );
      if (res.ok && res.data) {
        this.#gameView.renderLeaderboard(res.data, type, difficulty);
      } else {
        console.error('Failed to load leaderboard', res.status);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    }
  }

  async submitScore(playerName, score) {
    if (!ApiService.getToken()) return false;

    if (!NetworkService.getInstance().isOnline()) {
      this.queuePendingScore(playerName, score);
      FlashMessageService.show(
        I18nService.getInstance().t(
          'offline.score_saved_locally',
          {},
          'Score enregistré localement. Il sera synchronisé dès le retour de la connexion.'
        ),
        'info'
      );
      return { ok: true, queued: true };
    }

    try {
      const res = await ApiService.post('/scores', { player: playerName, score });

      if (res.status === 401 || res.status === 403) {
        ApiService.clearToken();
        localStorage.removeItem('username');
        this.#gameView.showError(I18nService.getInstance().t('errors.session_expired'));
        return false;
      }

      if (!res.ok) {
        this.queuePendingScore(playerName, score);
        FlashMessageService.show(
          I18nService.getInstance().t(
            'offline.score_saved_locally',
            {},
            'Score enregistré localement. Il sera synchronisé dès le retour de la connexion.'
          ),
          'info'
        );
        return { ok: true, queued: true };
      }
      
      return res.ok;
    } catch (e) {
      console.error('Failed to post score', e);
      this.queuePendingScore(playerName, score);
      FlashMessageService.show(
        I18nService.getInstance().t(
          'offline.score_saved_locally',
          {},
          'Score enregistré localement. Il sera synchronisé dès le retour de la connexion.'
        ),
        'info'
      );
      return { ok: true, queued: true };
    }
  }

  queuePendingScore(playerName, score) {
    if (typeof localStorage === 'undefined') return;
    try {
      const pending = JSON.parse(localStorage.getItem(ScoreController.#STORAGE_KEY) || '[]');
      pending.push({
        player: playerName,
        score,
        timestamp: Date.now()
      });
      localStorage.setItem(ScoreController.#STORAGE_KEY, JSON.stringify(pending));
    } catch (err) {
      console.warn('Error queueing pending score:', err);
    }
  }

  async flushPendingScores() {
    if (typeof localStorage === 'undefined' || !ApiService.getToken()) return;
    let pending = [];
    try {
      pending = JSON.parse(localStorage.getItem(ScoreController.#STORAGE_KEY) || '[]');
    } catch {
      pending = [];
    }
    if (!pending.length) return;

    const remaining = [];
    let syncedCount = 0;

    for (const item of pending) {
      try {
        const res = await ApiService.post('/scores', {
          player: item.player,
          score: item.score
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    try {
      if (remaining.length > 0) {
        localStorage.setItem(ScoreController.#STORAGE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(ScoreController.#STORAGE_KEY);
      }
    } catch {}

    if (syncedCount > 0) {
      FlashMessageService.show(
        I18nService.getInstance().t(
          'offline.scores_synced',
          {},
          'Vos scores en attente ont été synchronisés avec succès !'
        ),
        'success'
      );
    }
  }
}
