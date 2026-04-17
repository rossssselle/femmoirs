package services

import (
	"context"
	"errors"
	"femmoirs-backend/internal/models"
	repos "femmoirs-backend/internal/repositories"
	"strings"

	"github.com/rs/zerolog/log"
)

var ErrInvalidPostStatus = errors.New("post status must be visible or invisible")

type AdminService struct {
	prp  repos.PostgresPostRepository
	pvrp repos.PostgresPostVoteRepository
}

func NewAdminService(prp repos.PostgresPostRepository, pvrp repos.PostgresPostVoteRepository) *AdminService {
	return &AdminService{
		prp:  prp,
		pvrp: pvrp,
	}
}

func (as *AdminService) ListPosts(ctx context.Context, limit int) ([]*models.PostInfo, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	posts, err := as.prp.GetAllPosts(ctx, limit, true)
	if err != nil {
		return nil, err
	}

	var postsWithInfo []*models.PostInfo
	for _, post := range posts {
		postVotes, err := as.pvrp.GetPostVotesByPostID(ctx, post.ID)
		if err != nil {
			log.Error().Msg("error getting votes for post")
			return nil, err
		}

		votes := calculatePostVotes(postVotes)

		postInfo := &models.PostInfo{
			Post:      post,
			DownVotes: votes.DownVotes,
			UpVotes:   votes.UpVotes,
		}

		postsWithInfo = append(postsWithInfo, postInfo)
	}

	return postsWithInfo, nil
}

func (as *AdminService) UpdatePostStatus(ctx context.Context, postID int, status string) (*models.Post, error) {
	nextStatus := strings.ToLower(strings.TrimSpace(status))
	if nextStatus != "visible" && nextStatus != "invisible" {
		return nil, ErrInvalidPostStatus
	}

	return as.prp.UpdatePostStatus(ctx, postID, nextStatus)
}
