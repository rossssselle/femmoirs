package services

import (
	"context"
	"errors"
	"strings"

	"femmoirs-backend/internal/models"
	repos "femmoirs-backend/internal/repositories"

	"github.com/rs/zerolog/log"
)

var ErrEmptyBody = errors.New("post body cannot be empty")

type PostService struct {
	prp  repos.PostgresPostRepository
	pvrp repos.PostgresPostVoteRepository
}

func NewPostService(prp repos.PostgresPostRepository, pvrp repos.PostgresPostVoteRepository) *PostService {
	return &PostService{
		prp:  prp,
		pvrp: pvrp,
	}
}

func (ps *PostService) CreatePost(ctx context.Context, puID string, title *string, body string) (*models.Post, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, ErrEmptyBody
	}

	post := &models.Post{
		Title:        title,
		Body:         body,
		PseudoUserID: puID,
	}

	if err := ps.prp.CreatePost(ctx, post); err != nil {
		return nil, err
	}

	return post, nil
}

func (ps *PostService) ListPosts(ctx context.Context, limit int) ([]*models.PostInfo, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	posts, err := ps.prp.GetAllPosts(ctx, limit, false)
	if err != nil {
		return nil, err
	}

	postsWithInfo := make([]*models.PostInfo, 0, len(posts))
	for _, post := range posts {
		postVotes, err := ps.pvrp.GetPostVotesByPostID(ctx, post.ID)
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

func (ps *PostService) HandlePostVote(ctx context.Context, puID string, postID int, vote int) (*models.PostVote, error) {
	// 1) Look up existing vote (if any)
	existing, err := ps.pvrp.GetVoteByUserAndPost(ctx, puID, postID)
	if err != nil {
		return nil, err
	}

	// 2) No existing vote → insert new one
	if existing == nil {
		postVote := &models.PostVote{
			PseudoUserID: puID,
			PostID:       postID,
			Vote:         vote,
		}

		if err := ps.pvrp.CreatePostVote(ctx, postVote); err != nil {
			return nil, err
		}

		return postVote, nil
	}

	// 3) Existing vote is the same as incoming → undo (delete)
	if existing.Vote == vote {
		if err := ps.pvrp.DeletePostVote(ctx, existing); err != nil {
			return nil, err
		}
		// You can choose what to return here. Options:
		// - (nil, nil) = "no current vote"
		// - existing with some special marker
		return nil, nil
	}

	// 4) Existing vote is opposite → flip it
	existing.Vote = vote
	if err := ps.pvrp.UpdatePostVote(ctx, existing); err != nil {
		return nil, err
	}

	return existing, nil
}

func (ps *PostService) GetPostInfo(ctx context.Context, postID int) (*models.PostInfo, error) {
	existingPost, err := ps.prp.GetPost(ctx, postID)
	if err != nil {
		return nil, err
	}

	existingPostVotes, err := ps.pvrp.GetPostVotesByPostID(ctx, postID)
	if err != nil {
		return nil, err
	}

	votes := calculatePostVotes(existingPostVotes)

	postInfo := &models.PostInfo{
		Post:      *existingPost,
		DownVotes: votes.DownVotes,
		UpVotes:   votes.UpVotes,
	}

	return postInfo, nil
}

type Votes struct {
	DownVotes int `json:"down_votes"`
	UpVotes   int `json:"up_votes"`
}

func calculatePostVotes(postVotes []models.PostVote) *Votes {
	downVotes := 0
	upVotes := 0
	for _, value := range postVotes {
		switch value.Vote {
		case -1:
			downVotes += 1
		case 1:
			upVotes += 1
		default:
			log.Error().Msg("error calculating post votes")
		}
	}

	return &Votes{
		DownVotes: downVotes,
		UpVotes:   upVotes,
	}
}
