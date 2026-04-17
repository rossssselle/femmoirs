import { FormEvent } from "react";

import { ComposerState } from "../types";
import { voiceTag } from "../lib/forum";

type ComposeViewProps = {
  composer: ComposerState;
  error: string | null;
  notice: string | null;
  isSubmitting: boolean;
  pseudoUserId: string;
  onBack: () => void;
  onComposerChange: (next: ComposerState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ComposeView({
  composer,
  error,
  notice,
  isSubmitting,
  pseudoUserId,
  onBack,
  onComposerChange,
  onSubmit
}: ComposeViewProps) {
  return (
    <section className="compose-page">
      <div className="compose-page-header">
        <p className="kicker">say it how it happened</p>
        <h1>create a post*</h1>
        <p className="compose-page-copy">
          this page is just for writing. your post stays anonymous and is attached only to the
          local voice on this device.
        </p>
      </div>

      <form className="composer-panel composer-panel-page window-panel mint-panel" onSubmit={onSubmit}>
        <div className="panel-head">
          <label className="mini-label" htmlFor="story-title">
            subject:
          </label>
          <span className="meta-note">{composer.body.trim().length}/2400</span>
        </div>

        <input
          id="story-title"
          className="subject-input"
          maxLength={140}
          placeholder="subject"
          value={composer.title}
          onChange={(event) =>
            onComposerChange({
              ...composer,
              title: event.target.value
            })
          }
        />

        <label className="visually-hidden" htmlFor="story-body">
          story body
        </label>
        <textarea
          id="story-body"
          className="story-input story-input-page"
          maxLength={2400}
          placeholder="this bullshit and/or cool shit happened to me..."
          value={composer.body}
          onChange={(event) =>
            onComposerChange({
              ...composer,
              body: event.target.value
            })
          }
        />

        <div className="composer-footer">
          <div className="compose-page-actions">
            <button className="mini-button lavender-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "submitting..." : "submit"}
            </button>
            <button className="mini-button" onClick={onBack} type="button">
              not ready yet
            </button>
          </div>
          <span className="meta-note">local voice: {voiceTag(pseudoUserId)}</span>
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
    </section>
  );
}
