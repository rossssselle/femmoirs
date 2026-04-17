import { FormEvent, useMemo, useState } from "react";

import { clampText, fetchAdminPosts, formatCount, formatTimestamp, updateAdminPostStatus } from "../lib/forum";
import { PostInfo } from "../types";

type AdminSort = "questioned" | "latest" | "affirmed";
type AdminFilter = "all" | "visible" | "invisible";

export function AdminView() {
  const [adminSecret, setAdminSecret] = useState("");
  const [adminPosts, setAdminPosts] = useState<PostInfo[]>([]);
  const [adminSort, setAdminSort] = useState<AdminSort>("questioned");
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("all");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isUpdatingPostId, setIsUpdatingPostId] = useState<number | null>(null);

  const filteredAdminPosts = useMemo(() => {
    const nextPosts = adminPosts.filter((entry) => {
      if (adminFilter === "all") {
        return true;
      }

      return entry.post.status === adminFilter;
    });

    nextPosts.sort((left, right) => {
      if (adminSort === "latest") {
        return new Date(right.post.created_at).getTime() - new Date(left.post.created_at).getTime();
      }

      if (adminSort === "affirmed") {
        if (right.up_votes !== left.up_votes) {
          return right.up_votes - left.up_votes;
        }

        return new Date(right.post.created_at).getTime() - new Date(left.post.created_at).getTime();
      }

      if (right.down_votes !== left.down_votes) {
        return right.down_votes - left.down_votes;
      }

      return new Date(right.post.created_at).getTime() - new Date(left.post.created_at).getTime();
    });

    return nextPosts;
  }, [adminFilter, adminPosts, adminSort]);

  const questionedCount = adminPosts.filter((entry) => entry.down_votes > 0).length;
  const invisibleCount = adminPosts.filter((entry) => entry.post.status === "invisible").length;

  async function loadAdminPosts(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const nextSecret = adminSecret.trim();
    if (!nextSecret) {
      setIsUnlocked(false);
      setAdminError("enter your admin secret to load moderation tools.");
      return;
    }

    try {
      setAdminError(null);
      setAdminNotice(null);
      setIsAdminLoading(true);
      const posts = await fetchAdminPosts(nextSecret);
      setAdminPosts(posts);
      setIsUnlocked(true);
      setAdminNotice("moderation queue loaded.");
    } catch (loadError) {
      setIsUnlocked(false);
      setAdminError(loadError instanceof Error ? loadError.message : "unable to load admin posts.");
    } finally {
      setIsAdminLoading(false);
    }
  }

  async function handleStatusChange(postId: number, status: "visible" | "invisible") {
    const nextSecret = adminSecret.trim();
    if (!nextSecret) {
      setAdminError("enter your admin secret before changing post visibility.");
      return;
    }

    try {
      setAdminError(null);
      setAdminNotice(null);
      setIsUpdatingPostId(postId);
      const updatedPost = await updateAdminPostStatus(postId, status, nextSecret);
      setAdminPosts((current) =>
        current.map((entry) =>
          entry.post.id === postId
            ? {
                ...entry,
                post: updatedPost
              }
            : entry
        )
      );
      setAdminNotice(
        status === "invisible"
          ? "post hidden from the public feed."
          : "post restored to the public feed."
      );
    } catch (updateError) {
      setAdminError(updateError instanceof Error ? updateError.message : "unable to update post status.");
    } finally {
      setIsUpdatingPostId(null);
    }
  }

  return (
    <section className="admin-page">
      <form className="window-panel pink-panel admin-auth-panel" onSubmit={loadAdminPosts}>
        <label className="mini-label" htmlFor="admin-secret">
          admin secret
        </label>
        <div className="admin-auth-row">
          <input
            id="admin-secret"
            autoComplete="current-password"
            className="subject-input"
            placeholder="enter admin secret"
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
          />
          <button className="mini-button lavender-button" disabled={isAdminLoading} type="submit">
            {isAdminLoading ? "loading..." : "unlock"}
          </button>
          <button
            className="mini-button"
            disabled={isAdminLoading || !adminSecret.trim()}
            onClick={() => void loadAdminPosts()}
            type="button"
          >
            refresh
          </button>
        </div>

        {adminError ? (
          <div className="message-banner error-banner" role="alert">
            {adminError}
          </div>
        ) : null}

        {adminNotice ? (
          <div className="message-banner notice-banner" role="status">
            {adminNotice}
          </div>
        ) : null}
      </form>

      {isUnlocked ? (
        <>
          <div className="static-page-header">
            <p className="kicker">admin moderation</p>
            <h1>review what needs a closer look*</h1>
            <p className="compose-page-copy">
              this page is for checking highly questioned posts and changing whether a story is visible
              in the public feed.
            </p>
          </div>

          <div className="status-grid">
            <div className="status-box">
              <span className="status-value">{adminPosts.length}</span>
              <span className="status-label">posts loaded</span>
            </div>
            <div className="status-box">
              <span className="status-value">{questionedCount}</span>
              <span className="status-label">questioned posts</span>
            </div>
            <div className="status-box">
              <span className="status-value">{invisibleCount}</span>
              <span className="status-label">currently invisible</span>
            </div>
          </div>

          <div className="window-panel admin-toolbar-panel">
            <div className="admin-toolbar-row">
              <div>
                <p className="mini-label">sort</p>
                <div className="sort-group">
                  <button
                    className={adminSort === "questioned" ? "sort-chip is-active" : "sort-chip"}
                    onClick={() => setAdminSort("questioned")}
                    type="button"
                  >
                    most questioned
                  </button>
                  <button
                    className={adminSort === "latest" ? "sort-chip is-active" : "sort-chip"}
                    onClick={() => setAdminSort("latest")}
                    type="button"
                  >
                    latest
                  </button>
                  <button
                    className={adminSort === "affirmed" ? "sort-chip is-active" : "sort-chip"}
                    onClick={() => setAdminSort("affirmed")}
                    type="button"
                  >
                    most affirmed
                  </button>
                </div>
              </div>

              <div>
                <p className="mini-label">filter</p>
                <div className="sort-group">
                  <button
                    className={adminFilter === "all" ? "sort-chip is-active" : "sort-chip"}
                    onClick={() => setAdminFilter("all")}
                    type="button"
                  >
                    all
                  </button>
                  <button
                    className={adminFilter === "visible" ? "sort-chip is-active" : "sort-chip"}
                    onClick={() => setAdminFilter("visible")}
                    type="button"
                  >
                    visible
                  </button>
                  <button
                    className={adminFilter === "invisible" ? "sort-chip is-active" : "sort-chip"}
                    onClick={() => setAdminFilter("invisible")}
                    type="button"
                  >
                    invisible
                  </button>
                </div>
              </div>
            </div>

            <p className="feed-meta">
              {formatCount(filteredAdminPosts.length, "post")} shown
            </p>
          </div>

          <div className="admin-post-list">
            {filteredAdminPosts.length === 0 ? (
              <div className="empty-panel">
                <p className="empty-title">no posts match this view.</p>
                <p className="empty-copy">
                  try a different filter, or refresh the moderation queue.
                </p>
              </div>
            ) : null}

            {filteredAdminPosts.map((entry) => {
              const nextStatus = entry.post.status === "visible" ? "invisible" : "visible";
              const netScore = entry.up_votes - entry.down_votes;

              return (
                <article key={entry.post.id} className="window-panel admin-post-card">
                  <div className="admin-post-head">
                    <div>
                      <p className="mini-label">post #{entry.post.id}</p>
                      <h3>{entry.post.title?.trim() || "untitled memory"}</h3>
                    </div>
                    <span className={entry.post.status === "visible" ? "admin-status-chip is-visible" : "admin-status-chip is-invisible"}>
                      {entry.post.status}
                    </span>
                  </div>

                  <div className="feed-meta">
                    <span>{formatTimestamp(entry.post.created_at)}</span>
                    <span>{formatCount(entry.up_votes, "affirmation")}</span>
                    <span>{formatCount(entry.down_votes, "question")}</span>
                    <span>{netScore >= 0 ? `+${netScore}` : `${netScore}`} net</span>
                  </div>

                  <p className="admin-post-body">{entry.post.body}</p>
                  <p className="card-note">preview: {clampText(entry.post.body, 180)}</p>

                  <div className="admin-post-actions">
                    <button
                      className={nextStatus === "invisible" ? "mini-button yellow-button" : "mini-button lavender-button"}
                      disabled={isUpdatingPostId === entry.post.id}
                      onClick={() => void handleStatusChange(entry.post.id, nextStatus)}
                      type="button"
                    >
                      {isUpdatingPostId === entry.post.id
                        ? "saving..."
                        : nextStatus === "invisible"
                          ? "make invisible"
                          : "restore visibility"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
