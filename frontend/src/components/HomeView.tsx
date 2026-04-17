import { PostInfo, FeedSort } from "../types";
import {
  clampText,
  formatCount,
  formatTimestamp,
  voiceTag,
} from "../lib/forum";

type HomeViewProps = {
  error: string | null;
  filteredPosts: PostInfo[];
  isDetailLoading: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isVotingPostId: number | null;
  notice: string | null;
  posts: PostInfo[];
  pseudoUserId: string;
  searchQuery: string;
  selectedPost: PostInfo | null;
  selectedPostId: number | null;
  selectedPostVote: number;
  sort: FeedSort;
  totalAffirmations: number;
  trendingPosts: PostInfo[];
  voteMap: Record<number, number>;
  onOpenCompose: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSelectPost: (postId: number) => void;
  onSetSort: (sort: FeedSort) => void;
  onReportPost: (postInfo: PostInfo) => void;
  onVote: (postId: number, vote: number) => void;
};

export function HomeView({
  error,
  filteredPosts,
  isDetailLoading,
  isLoading,
  isRefreshing,
  isVotingPostId,
  notice,
  posts,
  pseudoUserId,
  searchQuery,
  selectedPost,
  selectedPostId,
  selectedPostVote,
  sort,
  totalAffirmations,
  trendingPosts,
  voteMap,
  onOpenCompose,
  onRefresh,
  onSearchChange,
  onSelectPost,
  onSetSort,
  onReportPost,
  onVote,
}: HomeViewProps) {
  return (
    <section className="home-layout">
      <div className="home-main-column">
        <section className="rules-panel">
          {/* <p className="kicker">
            anonymous forum for women and femme-identifying people
          </p> */}
          <h1>rules of femmoirs*</h1>
          <ol className="rules-list">
            <li>
              if you are a womxn*, bipoc, or femme-identifying, please feel free
              to share any or all of your experiences about relationships, work,
              and life.
            </li>
            <li>be you, be authentic, be uncensored, be unapologetic.</li>
            <li>this is a safe space for you. you are not alone.</li>
          </ol>

          <div className="identity-strip">
            <button
              className="desktop-badge desktop-badge-button"
              onClick={onOpenCompose}
              type="button"
            >
              i&apos;m ready
            </button>
            <span className="identity-note">
              local voice: {voiceTag(pseudoUserId)}
            </span>
          </div>
        </section>

        <section className="feed-panel window-panel">
          <div className="feed-toolbar">
            <div>
              <p className="mini-label">feed</p>
              <h2>visible stories</h2>
            </div>

            <div className="toolbar-actions">
              <div className="sort-group" role="tablist" aria-label="Feed sort">
                <button
                  className={
                    sort === "latest" ? "sort-chip is-active" : "sort-chip"
                  }
                  onClick={() => onSetSort("latest")}
                  type="button"
                >
                  latest
                </button>
                <button
                  className={
                    sort === "affirmed" ? "sort-chip is-active" : "sort-chip"
                  }
                  onClick={() => onSetSort("affirmed")}
                  type="button"
                >
                  affirmed
                </button>
                <button
                  className={
                    sort === "engaged" ? "sort-chip is-active" : "sort-chip"
                  }
                  onClick={() => onSetSort("engaged")}
                  type="button"
                >
                  engaged
                </button>
              </div>

              <button
                className="mini-button yellow-button"
                onClick={onRefresh}
                type="button"
              >
                {isRefreshing ? "refreshing..." : "refresh"}
              </button>
            </div>
          </div>

          <div className="feed-meta">
            <span>{formatCount(filteredPosts.length, "result")}</span>
            <span>
              {formatCount(posts.length, "visible story", "visible stories")}{" "}
              total
            </span>
          </div>

          {notice ? (
            <div className="message-banner notice-banner" role="status">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="message-banner error-banner" role="alert">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="loading-panel">
              <div className="loading-line" />
              <div className="loading-line short" />
              <div className="loading-line" />
            </div>
          ) : null}

          {!isLoading && filteredPosts.length === 0 ? (
            <div className="empty-panel">
              <p className="empty-title">nothing matched that topic.</p>
              <p className="empty-copy">
                try a different word or publish the first story that makes the
                page feel less quiet.
              </p>
            </div>
          ) : null}

          <div className="post-list">
            {filteredPosts.map((postInfo, index) => {
              const userVote = voteMap[postInfo.post.id] ?? 0;
              const isSelected = selectedPostId === postInfo.post.id;
              const netSupport = postInfo.up_votes - postInfo.down_votes;

              return (
                <article
                  key={postInfo.post.id}
                  className={isSelected ? "post-card is-selected" : "post-card"}
                  style={{ ["--card-index" as string]: index }}
                >
                  <button
                    className="post-card-main"
                    onClick={() => onSelectPost(postInfo.post.id)}
                    type="button"
                  >
                    <div className="post-topline">
                      <span>{formatTimestamp(postInfo.post.created_at)}</span>
                      <span>
                        {netSupport >= 0 ? `+${netSupport}` : netSupport} net
                      </span>
                    </div>
                    <h3>{postInfo.post.title?.trim() || "untitled memory"}</h3>
                    <p>{clampText(postInfo.post.body, 260)}</p>
                  </button>

                  <div className="post-actions">
                    <div className="vote-group">
                      <button
                        className={
                          userVote === 1 ? "vote-chip is-active" : "vote-chip"
                        }
                        disabled={isVotingPostId === postInfo.post.id}
                        onClick={() => onVote(postInfo.post.id, 1)}
                        type="button"
                      >
                        affirm {postInfo.up_votes}
                      </button>
                      <button
                        className={
                          userVote === -1 ? "vote-chip is-active" : "vote-chip"
                        }
                        disabled={isVotingPostId === postInfo.post.id}
                        onClick={() => onVote(postInfo.post.id, -1)}
                        type="button"
                      >
                        question {postInfo.down_votes}
                      </button>
                    </div>

                    <button
                      className="text-link"
                      onClick={() => onSelectPost(postInfo.post.id)}
                      type="button"
                    >
                      read fully
                    </button>
                    <button
                      className="text-link"
                      onClick={() => onReportPost(postInfo)}
                      type="button"
                    >
                      report post
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="home-side-column">
        <div className="window-panel yellow-panel identity-card">
          <p className="mini-label">this device</p>
          <p className="static-copy">
            local voice: {voiceTag(pseudoUserId)}. the device id stays tied to
            this browser, not to any single post.
          </p>
          <p className="card-note">device id: {pseudoUserId.slice(0, 4)}</p>

          <div className="status-grid">
            <div className="status-box">
              <span className="status-value">{posts.length}</span>
              <span className="status-label">visible posts</span>
            </div>
            <div className="status-box">
              <span className="status-value">
                {Object.keys(voteMap).length}
              </span>
              <span className="status-label">local reactions</span>
            </div>
          </div>
        </div>

        <div className="search-card window-panel peach-panel">
          <label className="mini-label" htmlFor="topic-search">
            search topics
          </label>
          <div className="search-field">
            <input
              id="topic-search"
              autoComplete="off"
              className="search-input"
              placeholder="search topics"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
          </div>
          <p className="card-note">
            searches visible titles and stories already loaded on the page.
          </p>
        </div>

        <aside className="trending-panel window-panel pink-panel">
          <div className="panel-head">
            <p className="mini-label">trending</p>
            <span className="meta-note">
              {formatCount(trendingPosts.length, "story", "stories")}
            </span>
          </div>

          {trendingPosts.length > 0 ? (
            <div className="trending-list">
              {trendingPosts.map((entry) => (
                <button
                  key={entry.post.id}
                  className="trending-item"
                  onClick={() => onSelectPost(entry.post.id)}
                  type="button"
                >
                  <strong>
                    {entry.post.title?.trim() || "untitled memory"}
                  </strong>
                  <span>{clampText(entry.post.body, 96)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-copy">
              posts with the most reactions will show up here.
            </p>
          )}
        </aside>

        <aside className="reader-panel window-panel cyan-panel">
          <div className="panel-head">
            <div>
              <p className="mini-label">reading pane</p>
              <h2>full transparency</h2>
            </div>
            {/* <span className="meta-note">
              {formatCount(totalAffirmations, "affirmation")}
            </span> */}
          </div>

          {isDetailLoading ? (
            <p className="reader-copy">loading story...</p>
          ) : null}

          {selectedPost ? (
            <div className="reader-story">
              <div className="reader-meta">
                <span>{formatTimestamp(selectedPost.post.created_at)}</span>
                <span>{formatCount(selectedPost.up_votes, "affirmation")}</span>
                <span>{formatCount(selectedPost.down_votes, "question")}</span>
              </div>
              <h3>{selectedPost.post.title?.trim() || "untitled memory"}</h3>
              <div className="reader-body-shell">
                <p className="reader-body">{selectedPost.post.body}</p>
              </div>

              <div className="reader-actions">
                <button
                  className={
                    selectedPostVote === 1 ? "vote-chip is-active" : "vote-chip"
                  }
                  disabled={isVotingPostId === selectedPost.post.id}
                  onClick={() => onVote(selectedPost.post.id, 1)}
                  type="button"
                >
                  affirm
                </button>
                <button
                  className={
                    selectedPostVote === -1
                      ? "vote-chip is-active"
                      : "vote-chip"
                  }
                  disabled={isVotingPostId === selectedPost.post.id}
                  onClick={() => onVote(selectedPost.post.id, -1)}
                  type="button"
                >
                  question
                </button>
                <button
                  className="text-link"
                  onClick={() => onReportPost(selectedPost)}
                  type="button"
                >
                  report post
                </button>
              </div>
            </div>
          ) : (
            <p className="reader-copy">
              choose a post from the feed or trending panel to read it in full.
            </p>
          )}

          {/* <div className="status-grid">
            <div className="status-box">
              <span className="status-value">{posts.length}</span>
              <span className="status-label">visible posts</span>
            </div>
            <div className="status-box">
              <span className="status-value">
                {Object.keys(voteMap).length}
              </span>
              <span className="status-label">local reactions</span>
            </div>
          </div> */}
        </aside>
      </aside>
    </section>
  );
}
