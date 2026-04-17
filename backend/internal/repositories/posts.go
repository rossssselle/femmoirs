package repositories

import (
	"context"
	"database/sql"

	"femmoirs-backend/internal/models"

	"github.com/rs/zerolog/log"
)

type PostRepository interface {
	Create(post *models.Post) error
}

type PostgresPostRepository struct {
	db *sql.DB
}

func NewPostgresPostRepository(db *sql.DB) *PostgresPostRepository {
	return &PostgresPostRepository{
		db: db,
	}
}

func (prp *PostgresPostRepository) CreatePost(ctx context.Context, post *models.Post) error {
	query := `
		INSERT INTO posts (pseudo_user_id, title, body)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, status
	`

	err := prp.db.QueryRowContext(ctx, query, post.PseudoUserID, post.Title, post.Body).
		Scan(&post.ID, &post.CreatedAt, &post.Status)

	if err != nil {
		log.Error().Err(err).Msg("prp - could not insert post")
		return err
	}

	return nil
}

func (prp *PostgresPostRepository) GetPost(ctx context.Context, postID int) (*models.Post, error) {
	query := `
		SELECT id, title, body, pseudo_user_id, created_at, status
		FROM posts
		WHERE id = $1
		LIMIT 1
	`

	var p models.Post
	err := prp.db.QueryRowContext(ctx, query, postID).Scan(
		&p.ID,
		&p.Title,
		&p.Body,
		&p.PseudoUserID,
		&p.CreatedAt,
		&p.Status,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Error().Err(err).Msg("prp - sql error no rows")
			return nil, err
		}
		log.Error().Err(err).Msg("prp - failed to get post")
		return nil, err
	}
	return &p, nil
}

func (prp *PostgresPostRepository) GetAllPosts(ctx context.Context, limit int, admin bool) ([]models.Post, error) {
	var query string

	if admin {
		query = `
			SELECT id, pseudo_user_id, title, body, created_at, status
			FROM posts
			ORDER BY created_at DESC
			LIMIT $1
		`
	} else {
		query = `
			SELECT id, pseudo_user_id, title, body, created_at, status
			FROM posts
			WHERE status = 'visible'
			ORDER BY created_at DESC
			LIMIT $1
		`
	}

	rows, err := prp.db.QueryContext(ctx, query, limit)
	if err != nil {
		log.Error().Err(err).Msg("prp - failed to query all posts")
		return nil, err
	}

	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(&p.ID, &p.PseudoUserID, &p.Title, &p.Body, &p.CreatedAt, &p.Status); err != nil {
			log.Error().Err(err).Msg("prp - failed to scan post rows")
			return nil, err
		}
		posts = append(posts, p)
	}

	if err := rows.Err(); err != nil {
		log.Error().Err(err).Msg("prp - failed to get all posts")
		return nil, err
	}

	return posts, nil
}

func (prp *PostgresPostRepository) UpdatePostStatus(ctx context.Context, postID int, status string) (*models.Post, error) {
	query := `
		UPDATE posts
		SET status = $2
		WHERE id = $1
		RETURNING id, title, body, pseudo_user_id, created_at, status
	`

	var p models.Post
	err := prp.db.QueryRowContext(ctx, query, postID, status).Scan(
		&p.ID,
		&p.Title,
		&p.Body,
		&p.PseudoUserID,
		&p.CreatedAt,
		&p.Status,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Error().Err(err).Msg("prp - no post found to update status")
			return nil, err
		}

		log.Error().Err(err).Msg("prp - failed to update post status")
		return nil, err
	}

	return &p, nil
}
