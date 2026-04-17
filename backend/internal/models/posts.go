package models

import (
	"time"
)

type Post struct {
	ID           int       `json:"id"`
	Title        *string   `json:"title"`
	Body         string    `json:"body"`
	CreatedAt    time.Time `json:"created_at"`
	PseudoUserID string    `json:"-"`
	Status       string    `json:"status"`
}

type PostVote struct {
	ID           int       `json:"id"`
	PostID       int       `json:"post_id"`
	PseudoUserID string    `json:"-"`
	Vote         int       `json:"vote"`
	CreatedAt    time.Time `json:"created_at"`
}

type PostInfo struct {
	Post      Post `json:"post"`
	DownVotes int  `json:"down_votes"`
	UpVotes   int  `json:"up_votes"`
}
