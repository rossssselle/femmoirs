package routers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

func NewRouter(postsRouter *PostRouter, contactRouter *ContactRouter) http.Handler {
	r := chi.NewRouter()

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Post("/posts", postsRouter.CreatePost)
	r.Post("/posts/{postID}/votes", postsRouter.HandlePostVote)
	r.Post("/moderation-contact", contactRouter.SubmitModerationContact)

	r.Get("/posts/{postID}", postsRouter.GetPost)
	r.Get("/posts", postsRouter.ListPosts)
	r.Get("/admin/posts", postsRouter.AdminListPosts)
	r.Patch("/admin/posts/{postID}", postsRouter.UpdateAdminPostStatus)
	r.NotFound(newSPAHandler("frontend/dist", "../frontend/dist").ServeHTTP)
	return r
}

func newSPAHandler(distDirs ...string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.NotFound(w, r)
			return
		}

		distDir := firstExistingDir(distDirs...)
		if distDir == "" {
			http.NotFound(w, r)
			return
		}

		cleanPath := strings.TrimPrefix(filepath.Clean("/"+r.URL.Path), "/")
		if cleanPath != "" && cleanPath != "." {
			assetPath := filepath.Join(distDir, cleanPath)
			if stat, err := os.Stat(assetPath); err == nil && !stat.IsDir() {
				http.ServeFile(w, r, assetPath)
				return
			}
		}

		indexPath := filepath.Join(distDir, "index.html")
		if stat, err := os.Stat(indexPath); err == nil && !stat.IsDir() {
			http.ServeFile(w, r, indexPath)
			return
		}

		http.NotFound(w, r)
	})
}

func firstExistingDir(candidates ...string) string {
	for _, candidate := range candidates {
		if stat, err := os.Stat(candidate); err == nil && stat.IsDir() {
			return candidate
		}
	}

	return ""
}
