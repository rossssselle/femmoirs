import { FormEvent, useEffect, useState } from "react";

import { submitModerationContact } from "../lib/forum";

type ContactViewProps = {
  prefill: {
    subject: string;
    message: string;
  } | null;
};

export function ContactView({ prefill }: ContactViewProps) {
  const [contactEmail, setContactEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!prefill) {
      return;
    }

    setSubject(prefill.subject);
    setMessage(prefill.message);
    setError(null);
    setNotice(null);
  }, [prefill]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError(null);
      setNotice(null);
      setIsSubmitting(true);
      await submitModerationContact({
        contact_email: contactEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setNotice("your moderation message was sent.");
      setSubject("");
      setMessage("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "unable to send your message.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="static-page">
      <div className="static-page-header">
        <h1>reach the people behind it*</h1>
        <p className="compose-page-copy">
          if something needs moderation attention, you can send it here and it
          will go straight to the moderation inbox email configured on the
          backend.
        </p>
      </div>

      <div className="contact-layout">
        <form
          className="window-panel mint-panel contact-form-panel"
          onSubmit={handleSubmit}
        >
          <div className="panel-head">
            <label className="mini-label" htmlFor="contact-email">
              your email
            </label>
            <span className="meta-note">so moderation can reply if needed</span>
          </div>

          <input
            id="contact-email"
            autoComplete="email"
            className="subject-input"
            placeholder="you@example.com"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />

          <label className="mini-label" htmlFor="contact-subject">
            subject
          </label>
          <input
            id="contact-subject"
            className="subject-input"
            maxLength={140}
            placeholder="brief summary"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />

          <label className="mini-label" htmlFor="contact-message">
            message
          </label>
          <textarea
            id="contact-message"
            className="story-input contact-textarea"
            maxLength={2400}
            placeholder="share what happened, what post is involved, and anything moderation should know..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          <div className="composer-footer">
            <button
              className="mini-button lavender-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "sending..." : "send to moderation"}
            </button>
            <span className="meta-note">
              only use this form for moderation or safety issues
            </span>
          </div>

          {error ? (
            <div className="message-banner error-banner" role="alert">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="message-banner notice-banner" role="status">
              {notice}
            </div>
          ) : null}
        </form>

        <section className="window-panel peach-panel static-panel contact-help-panel">
          <p className="mini-label">what to include</p>
          <ul className="static-list">
            <li>the post title or a quote that helps identify the story</li>
            <li>why you think it needs review</li>
            <li>whether the issue feels urgent or safety-related</li>
          </ul>
        </section>
      </div>
    </section>
  );
}
