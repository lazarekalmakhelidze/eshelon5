CREATE TABLE IF NOT EXISTS arcade_scores (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES arcade_games(id)
);

-- Index for fast leaderboard retrieval
CREATE INDEX IF NOT EXISTS idx_arcade_scores_game_id ON arcade_scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_arcade_scores_user_game ON arcade_scores(user_id, game_id);
