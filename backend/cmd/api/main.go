package main

import (
	"log"
	"net/http"
	"os"

	"femmoirs-backend/internal/providers"
	"femmoirs-backend/internal/repositories"
	"femmoirs-backend/internal/routers"
	"femmoirs-backend/internal/services"
)

func main() {
	db, err := providers.NewDB()
	if err != nil {
		log.Fatalf("could not connect to db: %v", err)
	}
	defer db.Close()

	postRepo := repositories.NewPostgresPostRepository(db)
	postVoteRepo := repositories.NewPostgresPostVoteRepository(db)
	postService := services.NewPostService(*postRepo, *postVoteRepo)
	adminService := services.NewAdminService(*postRepo, *postVoteRepo)
	contactService := services.NewContactServiceFromEnv()
	postRouter := routers.NewPostRouter(postService, adminService, os.Getenv("ADMIN_SECRET"))
	contactRouter := routers.NewContactRouter(contactService)
	router := routers.NewRouter(postRouter, contactRouter)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	log.Printf("Femmoirs backend listening on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatal(err)
	}
}
