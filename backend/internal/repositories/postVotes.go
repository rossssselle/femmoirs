package repositories

import (
	"context"
	"database/sql"

	"femmoirs-backend/internal/models"

	"github.com/rs/zerolog/log"
)

type PostgresPostVoteRepository struct {
	db *sql.DB
}

func NewPostgresPostVoteRepository(db *sql.DB) *PostgresPostVoteRepository {
	return &PostgresPostVoteRepository{
		db: db,
	}
}

func (pvrp *PostgresPostVoteRepository) GetVoteByUserAndPost(ctx context.Context, puID string, postID int) (*models.PostVote, error) {
	query := `
		SELECT id, post_id, pseudo_user_id, vote, created_at
		FROM post_votes
		WHERE post_id = $1 AND pseudo_user_id = $2
		LIMIT 1
	`

	var pv models.PostVote
	err := pvrp.db.QueryRowContext(ctx, query, postID, puID).Scan(
		&pv.ID,
		&pv.PostID,
		&pv.PseudoUserID,
		&pv.Vote,
		&pv.CreatedAt, // note: matches your struct field name
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Error().Err(err).Msg("pvrp - sql error no rows")
			return nil, nil
		}
		log.Error().Err(err).Msg("pvrp - failed to get post")
		return nil, err
	}

	return &pv, nil
}

func (pvrp *PostgresPostVoteRepository) CreatePostVote(ctx context.Context, postVote *models.PostVote) error {
	query := `
		INSERT INTO post_votes (pseudo_user_id, post_id, vote)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
	`

	err := pvrp.db.QueryRowContext(ctx, query, postVote.PseudoUserID, postVote.PostID, postVote.Vote).
		Scan(&postVote.ID, &postVote.CreatedAt)

	if err != nil {
		log.Error().Err(err).Msg("pvrp - failed to creat post vote")
		return err
	}

	return nil
}

func (pvrp *PostgresPostVoteRepository) DeletePostVote(ctx context.Context, postVote *models.PostVote) error {
	query := `
		DELETE FROM post_votes 
		WHERE id = $1
	`

	_, err := pvrp.db.ExecContext(ctx, query, postVote.ID)
	if err != nil {
		log.Error().Err(err).Msg("pvrp - failed to delete post vote")
		return err
	}

	return nil
}

func (pvrp *PostgresPostVoteRepository) UpdatePostVote(ctx context.Context, postVote *models.PostVote) error {
	query := `
        UPDATE post_votes
        SET vote = $1, created_at = NOW()
        WHERE id = $2
    `
	_, err := pvrp.db.ExecContext(ctx, query, postVote.Vote, postVote.ID)
	if err != nil {
		log.Error().Err(err).Msg("pvrp - failed to update post vote")
		return err
	}

	return nil
}

func (pvrp *PostgresPostVoteRepository) GetPostVotesByPostID(ctx context.Context, postID int) ([]models.PostVote, error) {
	query := `
		SELECT id, pseudo_user_id, post_id, vote, created_at
		FROM post_votes
		WHERE post_id = $1
	`

	rows, err := pvrp.db.QueryContext(ctx, query, postID)
	if err != nil {
		log.Error().Err(err).Msg("pvrp - failed to get post votes by postID")
		return nil, err
	}

	defer rows.Close()

	var postVotes []models.PostVote
	for rows.Next() {
		var pv models.PostVote
		if err := rows.Scan(&pv.ID, &pv.PseudoUserID, &pv.PostID, &pv.Vote, &pv.CreatedAt); err != nil {
			log.Error().Err(err).Msg("pvrp - failed to scan post vote rows")
			return nil, err
		}
		postVotes = append(postVotes, pv)
	}

	if err := rows.Err(); err != nil {
		log.Error().Err(err).Msg("pvrp - failed get all post votes")
		return nil, err
	}

	return postVotes, nil

}
