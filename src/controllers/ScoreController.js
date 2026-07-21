export class ScoreController {
  #gameView;

  constructor(gameView) {
    this.#gameView = gameView;
  }

  async loadLeaderboard() {
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const scores = await response.json();
        this.#gameView.renderLeaderboard(scores);
      } else {
        console.error('Failed to load leaderboard', response.status);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    }
  }

  async submitScore(playerName, score) {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ player: playerName, score })
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        this.#gameView.showError('Session expirée. Veuillez vous reconnecter pour enregistrer votre score.');
        return false;
      }
      
      return response.ok;
    } catch (e) {
      console.error('Failed to post score', e);
      return false;
    }
  }
}
