package services

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
)

var (
	ErrModerationContactNotConfigured = errors.New("moderation contact is not configured")
	ErrModerationContactEmailRequired = errors.New("contact email is required")
	ErrModerationContactEmailInvalid  = errors.New("contact email is invalid")
	ErrModerationContactMessageEmpty  = errors.New("message cannot be empty")
)

type ModerationContactInput struct {
	ContactEmail string
	Subject      string
	Message      string
}

type ContactService struct {
	smtpHost  string
	smtpPort  int
	smtpUser  string
	smtpPass  string
	fromEmail string
	toEmail   string
}

func NewContactServiceFromEnv() *ContactService {
	return &ContactService{
		smtpHost:  strings.TrimSpace(os.Getenv("SMTP_HOST")),
		smtpPort:  parseSMTPPort(os.Getenv("SMTP_PORT")),
		smtpUser:  strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
		smtpPass:  os.Getenv("SMTP_PASSWORD"),
		fromEmail: strings.TrimSpace(os.Getenv("MODERATION_FROM_EMAIL")),
		toEmail:   strings.TrimSpace(os.Getenv("MODERATION_TO_EMAIL")),
	}
}

func (cs *ContactService) SendModerationContact(_ context.Context, input ModerationContactInput) error {
	if !cs.isConfigured() {
		return ErrModerationContactNotConfigured
	}

	contactEmail := strings.TrimSpace(input.ContactEmail)
	if contactEmail == "" {
		return ErrModerationContactEmailRequired
	}

	if _, err := mail.ParseAddress(contactEmail); err != nil {
		return ErrModerationContactEmailInvalid
	}

	message := strings.TrimSpace(input.Message)
	if message == "" {
		return ErrModerationContactMessageEmpty
	}

	subject := strings.TrimSpace(input.Subject)
	if subject == "" {
		subject = "moderation request"
	}

	auth := smtp.PlainAuth("", cs.smtpUser, cs.smtpPass, cs.smtpHost)
	addr := fmt.Sprintf("%s:%d", cs.smtpHost, cs.smtpPort)
	body := strings.Join([]string{
		fmt.Sprintf("To: %s", cs.toEmail),
		fmt.Sprintf("From: %s", cs.fromEmail),
		fmt.Sprintf("Reply-To: %s", contactEmail),
		fmt.Sprintf("Subject: [femmoirs] %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		"New moderation contact submission",
		"",
		fmt.Sprintf("Reply email: %s", contactEmail),
		fmt.Sprintf("Subject: %s", subject),
		"",
		"Message:",
		message,
	}, "\r\n")

	return smtp.SendMail(addr, auth, cs.fromEmail, []string{cs.toEmail}, []byte(body))
}

func (cs *ContactService) isConfigured() bool {
	return cs.smtpHost != "" &&
		cs.smtpPort > 0 &&
		cs.smtpUser != "" &&
		cs.smtpPass != "" &&
		cs.fromEmail != "" &&
		cs.toEmail != ""
}

func parseSMTPPort(value string) int {
	port, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || port <= 0 {
		return 0
	}

	return port
}
