package services

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

var (
	ErrModerationContactNotConfigured = errors.New("moderation contact is not configured")
	ErrModerationContactEmailRequired = errors.New("contact email is required")
	ErrModerationContactEmailInvalid  = errors.New("contact email is invalid")
	ErrModerationContactMessageEmpty  = errors.New("message cannot be empty")
	ErrModerationContactTimedOut      = errors.New("moderation email timed out")
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
	timeout   time.Duration
}

func NewContactServiceFromEnv() *ContactService {
	return &ContactService{
		smtpHost:  strings.TrimSpace(os.Getenv("SMTP_HOST")),
		smtpPort:  parseSMTPPort(os.Getenv("SMTP_PORT")),
		smtpUser:  strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
		smtpPass:  os.Getenv("SMTP_PASSWORD"),
		fromEmail: strings.TrimSpace(os.Getenv("MODERATION_FROM_EMAIL")),
		toEmail:   strings.TrimSpace(os.Getenv("MODERATION_TO_EMAIL")),
		timeout:   15 * time.Second,
	}
}

func (cs *ContactService) SendModerationContact(ctx context.Context, input ModerationContactInput) error {
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

	if err := cs.sendMail(ctx, addr, auth, contactEmail, []byte(body)); err != nil {
		return err
	}

	return nil
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

func (cs *ContactService) sendMail(ctx context.Context, addr string, auth smtp.Auth, contactEmail string, body []byte) error {
	if ctx == nil {
		ctx = context.Background()
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, cs.timeout)
	defer cancel()

	dialer := &net.Dialer{
		Timeout: cs.timeout,
	}

	conn, err := dialer.DialContext(timeoutCtx, "tcp", addr)
	if err != nil {
		if timeoutCtx.Err() != nil {
			return ErrModerationContactTimedOut
		}
		return err
	}
	defer conn.Close()

	if err := conn.SetDeadline(time.Now().Add(cs.timeout)); err != nil {
		return err
	}

	client, err := smtp.NewClient(conn, cs.smtpHost)
	if err != nil {
		if timeoutCtx.Err() != nil {
			return ErrModerationContactTimedOut
		}
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: cs.smtpHost, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}

	if auth != nil {
		if ok, _ := client.Extension("AUTH"); ok {
			if err := client.Auth(auth); err != nil {
				return err
			}
		}
	}

	if err := client.Mail(cs.fromEmail); err != nil {
		return err
	}

	if err := client.Rcpt(cs.toEmail); err != nil {
		return err
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}

	if _, err := writer.Write(body); err != nil {
		_ = writer.Close()
		return err
	}

	if err := writer.Close(); err != nil {
		return err
	}

	if err := client.Quit(); err != nil {
		return err
	}

	return nil
}
