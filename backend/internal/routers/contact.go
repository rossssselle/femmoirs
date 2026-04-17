package routers

import (
	"encoding/json"
	"errors"
	"net/http"

	"femmoirs-backend/internal/services"

	"github.com/rs/zerolog/log"
)

type ContactRouter struct {
	contactService *services.ContactService
}

func NewContactRouter(contactService *services.ContactService) *ContactRouter {
	return &ContactRouter{
		contactService: contactService,
	}
}

type moderationContactRequest struct {
	ContactEmail string `json:"contact_email"`
	Subject      string `json:"subject"`
	Message      string `json:"message"`
}

func (cr *ContactRouter) SubmitModerationContact(w http.ResponseWriter, r *http.Request) {
	var request moderationContactRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "moderation contact request invalid", http.StatusBadRequest)
		return
	}

	err := cr.contactService.SendModerationContact(r.Context(), services.ModerationContactInput{
		ContactEmail: request.ContactEmail,
		Subject:      request.Subject,
		Message:      request.Message,
	})
	if err != nil {
		log.Error().Err(err).Str("contact_email", request.ContactEmail).Msg("failed to send moderation contact")
		switch {
		case errors.Is(err, services.ErrModerationContactEmailRequired),
			errors.Is(err, services.ErrModerationContactEmailInvalid),
			errors.Is(err, services.ErrModerationContactMessageEmpty):
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		case errors.Is(err, services.ErrModerationContactTimedOut):
			http.Error(w, err.Error(), http.StatusGatewayTimeout)
			return
		case errors.Is(err, services.ErrModerationContactNotConfigured):
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		default:
			http.Error(w, "failed to send moderation contact", http.StatusInternalServerError)
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}
