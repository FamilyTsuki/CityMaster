import { ApiService } from '../services/ApiService.js';
import { I18nService } from '../services/I18nService.js';

export class ScoreController {
  #gameView;

  constructor(gameView) {
    this.#gameView = gameView;
  }

  async loadLeaderboard(type = 'monthly', difficulty = 'hard') {
    try {
      const res = await ApiService.get(`/scores?type=${encodeURIComponent(type)}&difficulty=${encodeURIComponent(difficulty)}`, { includeAuth: false });
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

    try {
      const res = await ApiService.post('/scores', { player: playerName, score });

      if (res.status === 401 || res.status === 403) {
        ApiService.clearToken();
        localStorage.removeItem('username');
        this.#gameView.showError(I18nService.getInstance().t('errors.session_expired'));
        return false;
      }
      
      return res.ok;
    } catch (e) {
      console.error('Failed to post score', e);
      return false;
    }
  }
}

