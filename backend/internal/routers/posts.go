package routers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"femmoirs-backend/internal/services"

	"github.com/go-chi/chi/v5"
)

type PostRouter struct {
	postsService *services.PostService
	adminService *services.AdminService
	adminSecret  string
}

func NewPostRouter(postsService *services.PostService, adminService *services.AdminService, adminSecret string) *PostRouter {
	return &PostRouter{
		postsService: postsService,
		adminService: adminService,
		adminSecret:  adminSecret,
	}
}

type createPostRequest struct {
	Title *string `json:"title,omitempty"`
	Body  string  `json:"body"`
}

type voteRequest struct {
	Vote int `json:"vote"`
}

type updatePostStatusRequest struct {
	Status string `json:"status"`
}

func (pr *PostRouter) CreatePost(w http.ResponseWriter, r *http.Request) {
	pseudoUserID := r.Header.Get("X-Pseudo-User-Id")

	if pseudoUserID == "" {
		http.Error(w, "missing X-Pseudo-User-Id", http.StatusBadRequest)
		return
	}

	var request createPostRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "create post request invalid", http.StatusBadRequest)
		return
	}

	post, err := pr.postsService.CreatePost(r.Context(), pseudoUserID, request.Title, request.Body)
	if err != nil {
		if err == services.ErrEmptyBody {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		http.Error(w, "failed request to create post", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, post)

}

func (pr *PostRouter) ListPosts(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if q := r.URL.Query().Get("limit"); q != "" {
		if n, err := strconv.Atoi(q); err == nil {
			limit = n
		}
	}

	posts, err := pr.postsService.ListPosts(r.Context(), limit)
	if err != nil {
		http.Error(w, "failed request to list posts", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, posts)
}

func (pr *PostRouter) AdminListPosts(w http.ResponseWriter, r *http.Request) {
	if err := pr.authorizeAdmin(r); err != nil {
		status := http.StatusForbidden
		if errors.Is(err, errAdminSecretMissing) {
			status = http.StatusBadRequest
		}
		if errors.Is(err, errAdminSecretNotConfigured) {
			status = http.StatusInternalServerError
		}
		http.Error(w, err.Error(), status)
		return
	}

	limit := 50
	if q := r.URL.Query().Get("limit"); q != "" {
		if n, err := strconv.Atoi(q); err == nil {
			limit = n
		}
	}

	posts, err := pr.adminService.ListPosts(r.Context(), limit)
	if err != nil {
		http.Error(w, "failed request to list posts via admin", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, posts)
}

func (pr *PostRouter) UpdateAdminPostStatus(w http.ResponseWriter, r *http.Request) {
	if err := pr.authorizeAdmin(r); err != nil {
		status := http.StatusForbidden
		if errors.Is(err, errAdminSecretMissing) {
			status = http.StatusBadRequest
		}
		if errors.Is(err, errAdminSecretNotConfigured) {
			status = http.StatusInternalServerError
		}
		http.Error(w, err.Error(), status)
		return
	}

	postIDStr := chi.URLParam(r, "postID")
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "invalid postID", http.StatusBadRequest)
		return
	}

	var request updatePostStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "admin post update request invalid", http.StatusBadRequest)
		return
	}

	post, err := pr.adminService.UpdatePostStatus(r.Context(), postID, request.Status)
	if err != nil {
		if errors.Is(err, services.ErrInvalidPostStatus) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		http.Error(w, "failed request to update post status", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, post)
}

func (pr *PostRouter) HandlePostVote(w http.ResponseWriter, r *http.Request) {
	pseudoUserID := r.Header.Get("X-Pseudo-User-Id")
	if pseudoUserID == "" {
		http.Error(w, "missing X-Pseudo-User-Id", http.StatusBadRequest)
		return
	}

	postIDStr := chi.URLParam(r, "postID")
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "invalid postID", http.StatusBadRequest)
		return
	}

	var req voteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "post vote request invalid", http.StatusBadRequest)
		return
	}

	pv, err := pr.postsService.HandlePostVote(r.Context(), pseudoUserID, postID, req.Vote)
	if err != nil {
		http.Error(w, "failed request to handle post vote", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if pv == nil {
		writeJSON(w, http.StatusOK, map[string]string{"status": "cleared"})
		return
	}

	writeJSON(w, http.StatusOK, pv)
}

func (pr *PostRouter) GetPost(w http.ResponseWriter, r *http.Request) {
	postIDStr := chi.URLParam(r, "postID")
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		http.Error(w, "invalid postID", http.StatusBadRequest)
		return
	}

	post, err := pr.postsService.GetPostInfo(r.Context(), postID)
	if err != nil {
		http.Error(w, "failed request to get post info", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, post)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

var (
	errAdminSecretMissing       = errors.New("missing X-Admin-Secret")
	errAdminSecretInvalid       = errors.New("invalid X-Admin-Secret")
	errAdminSecretNotConfigured = errors.New("admin moderation is not configured")
)

func (pr *PostRouter) authorizeAdmin(r *http.Request) error {
	if pr.adminSecret == "" {
		return errAdminSecretNotConfigured
	}

	adminID := r.Header.Get("X-Admin-Secret")
	if adminID == "" {
		return errAdminSecretMissing
	}

	if adminID != pr.adminSecret {
		return errAdminSecretInvalid
	}

	return nil
}
