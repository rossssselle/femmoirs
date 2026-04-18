import { FormEvent, useEffect, useState } from "react";

import { AboutView } from "./components/AboutView";
import { AdminView } from "./components/AdminView";
import { ComposeView } from "./components/ComposeView";
import { ContactView } from "./components/ContactView";
import { HomeView } from "./components/HomeView";
import {
  applyVoteToPost,
  createPost,
  fetchPost,
  fetchPosts,
  getPseudoUserId,
  persistVoteMap,
  readVoteMap,
  sendVote
} from "./lib/forum";
import { ComposerState, FeedSort, PostInfo, ViewMode } from "./types";

type ContactPrefill = {
  subject: string;
  message: string;
};

function getViewModeFromPath(pathname: string): ViewMode {
  if (pathname === "/create") {
    return "compose";
  }

  if (pathname === "/about") {
    return "about";
  }

  if (pathname === "/contact") {
    return "contact";
  }

  if (pathname === "/admin") {
    return "admin";
  }

  return "home";
}

function getPathForViewMode(viewMode: ViewMode) {
  if (viewMode === "compose") {
    return "/create";
  }

  if (viewMode === "about") {
    return "/about";
  }

  if (viewMode === "contact") {
    return "/contact";
  }

  if (viewMode === "admin") {
    return "/admin";
  }

  return "/";
}

export default function App() {
  const [pseudoUserId] = useState(() => getPseudoUserId());
  const [voteMap, setVoteMap] = useState<Record<number, number>>(() => readVoteMap());
  const [posts, setPosts] = useState<PostInfo[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getViewModeFromPath(window.location.pathname));
  const [sort, setSort] = useState<FeedSort>("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [composer, setComposer] = useState<ComposerState>({ title: "", body: "" });
  const [hasMissionAcknowledgement, setHasMissionAcknowledgement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVotingPostId, setIsVotingPostId] = useState<number | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [contactPrefill, setContactPrefill] = useState<ContactPrefill | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    persistVoteMap(voteMap);
  }, [voteMap]);

  useEffect(() => {
    const handlePopState = () => {
      setComposerError(null);
      const nextViewMode = getViewModeFromPath(window.location.pathname);
      if (nextViewMode !== "compose") {
        setHasMissionAcknowledgement(false);
      }
      setViewMode(nextViewMode);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setFeedError(null);
        setNotice(null);
        setIsLoading(true);
        const nextPosts = await fetchPosts();
        if (cancelled) {
          return;
        }

        setPosts(nextPosts);
        setSelectedPostId((current) => current ?? nextPosts[0]?.post.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setFeedError(loadError instanceof Error ? loadError.message : "Unable to load the feed.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedPostId == null) {
      setSelectedPost(null);
      return;
    }

    const postId = selectedPostId;
    let cancelled = false;

    async function loadDetail() {
      try {
        setIsDetailLoading(true);
        const detail = await fetchPost(postId);
        if (!cancelled) {
          setSelectedPost(detail);
        }
      } catch {
        if (!cancelled) {
          const fallback = posts.find((entry) => entry.post.id === postId) ?? null;
          setSelectedPost(fallback);
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [posts, selectedPostId]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = posts.filter((entry) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    const haystack = `${entry.post.title ?? ""} ${entry.post.body}`.toLowerCase();
    return haystack.includes(normalizedSearchQuery);
  });

  if (sort === "affirmed") {
    filteredPosts.sort((left, right) => {
      const leftScore = left.up_votes - left.down_votes;
      const rightScore = right.up_votes - right.down_votes;
      return rightScore - leftScore;
    });
  }

  if (sort === "engaged") {
    filteredPosts.sort((left, right) => {
      const leftScore = left.up_votes + left.down_votes;
      const rightScore = right.up_votes + right.down_votes;
      return rightScore - leftScore;
    });
  }

  const trendingPosts = [...posts]
    .sort((left, right) => {
      const leftScore = left.up_votes + left.down_votes;
      const rightScore = right.up_votes + right.down_votes;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return new Date(right.post.created_at).getTime() - new Date(left.post.created_at).getTime();
    })
    .slice(0, 3);

  const selectedPostVote = selectedPost == null ? 0 : voteMap[selectedPost.post.id] ?? 0;
  const totalAffirmations = posts.reduce((sum, item) => sum + item.up_votes, 0);

  function navigateTo(nextViewMode: ViewMode) {
    const nextPath = getPathForViewMode(nextViewMode);
    if (nextViewMode !== "compose") {
      setComposerError(null);
      setHasMissionAcknowledgement(false);
    }
    if (nextViewMode !== "contact") {
      setContactPrefill(null);
    }
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setViewMode(nextViewMode);
  }

  function handleReportPost(postInfo: PostInfo) {
    const reportTitle = postInfo.post.title?.trim() || "untitled memory";
    setContactPrefill({
      subject: `report post #${postInfo.post.id}`,
      message: [
        `i want to report post #${postInfo.post.id}.`,
        "",
        `title: ${reportTitle}`,
        `created: ${postInfo.post.created_at}`,
        "",
        "reason for review:",
        ""
      ].join("\n")
    });
    navigateTo("contact");
  }

  async function handleRefresh() {
    try {
      setFeedError(null);
      setNotice(null);
      setIsRefreshing(true);
      const nextPosts = await fetchPosts();
      setPosts(nextPosts);
      setSelectedPostId((current) => {
        if (current && nextPosts.some((entry) => entry.post.id === current)) {
          return current;
        }
        return nextPosts[0]?.post.id ?? null;
      });
    } catch (refreshError) {
      setFeedError(refreshError instanceof Error ? refreshError.message : "Unable to refresh the feed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!composer.body.trim()) {
      setComposerError("A story needs a body before it can be shared.");
      return;
    }

    if (!hasMissionAcknowledgement) {
      setComposerError("Please confirm your post aligns with the femmoirs mission before submitting.");
      return;
    }

    try {
      setComposerError(null);
      setNotice(null);
      setIsSubmitting(true);
      const post = await createPost(composer, pseudoUserId);
      const nextPostInfo: PostInfo = {
        post,
        up_votes: 0,
        down_votes: 0
      };

      if (post.status === "visible") {
        setPosts((current) => [nextPostInfo, ...current]);
        setSelectedPostId(post.id);
        setSelectedPost(nextPostInfo);
        setNotice("your post is now live in femmoirs.");
      } else {
        setNotice("your post was received and may need a visibility review before it appears.");
      }

      setComposer({ title: "", body: "" });
      setHasMissionAcknowledgement(false);
      navigateTo("home");
    } catch (submitError) {
      setComposerError(submitError instanceof Error ? submitError.message : "Unable to share right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVote(postId: number, vote: number) {
    const previousVote = voteMap[postId] ?? 0;
    const nextVote = previousVote === vote ? 0 : vote;

    try {
      setFeedError(null);
      setNotice(null);
      setIsVotingPostId(postId);
      setVoteMap((current) => ({
        ...current,
        [postId]: nextVote
      }));
      setPosts((current) =>
        current.map((entry) =>
          entry.post.id === postId ? applyVoteToPost(entry, previousVote, nextVote) : entry
        )
      );
      setSelectedPost((current) =>
        current && current.post.id === postId ? applyVoteToPost(current, previousVote, nextVote) : current
      );

      await sendVote(postId, vote, pseudoUserId);
    } catch (voteError) {
      setVoteMap((current) => ({
        ...current,
        [postId]: previousVote
      }));
      setPosts((current) =>
        current.map((entry) =>
          entry.post.id === postId ? applyVoteToPost(entry, nextVote, previousVote) : entry
        )
      );
      setSelectedPost((current) =>
        current && current.post.id === postId ? applyVoteToPost(current, nextVote, previousVote) : current
      );
      setFeedError(voteError instanceof Error ? voteError.message : "Unable to save your reaction.");
    } finally {
      setIsVotingPostId(null);
    }
  }

  let currentView = (
    <ContactView prefill={contactPrefill} />
  );

  if (viewMode === "home") {
    currentView = (
      <HomeView
        error={feedError}
        filteredPosts={filteredPosts}
        isDetailLoading={isDetailLoading}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        isVotingPostId={isVotingPostId}
        notice={notice}
        posts={posts}
        pseudoUserId={pseudoUserId}
        searchQuery={searchQuery}
        selectedPost={selectedPost}
        selectedPostId={selectedPostId}
        selectedPostVote={selectedPostVote}
        sort={sort}
        totalAffirmations={totalAffirmations}
        trendingPosts={trendingPosts}
        voteMap={voteMap}
        onOpenCompose={() => {
          setComposerError(null);
          navigateTo("compose");
        }}
        onRefresh={handleRefresh}
        onReportPost={handleReportPost}
        onSearchChange={setSearchQuery}
        onSelectPost={setSelectedPostId}
        onSetSort={setSort}
        onVote={handleVote}
      />
    );
  } else if (viewMode === "compose") {
    currentView = (
      <ComposeView
        composer={composer}
        error={composerError}
        hasMissionAcknowledgement={hasMissionAcknowledgement}
        notice={notice}
        isSubmitting={isSubmitting}
        pseudoUserId={pseudoUserId}
        onBack={() => {
          setComposerError(null);
          navigateTo("home");
        }}
        onComposerChange={(nextComposer) => {
          if (composerError) {
            setComposerError(null);
          }
          setComposer(nextComposer);
        }}
        onMissionAcknowledgementChange={(nextValue) => {
          if (composerError) {
            setComposerError(null);
          }
          setHasMissionAcknowledgement(nextValue);
        }}
        onSubmit={handleSubmit}
      />
    );
  } else if (viewMode === "about") {
    currentView = (
      <AboutView
        onOpenCompose={() => {
          setComposerError(null);
          navigateTo("compose");
        }}
      />
    );
  } else if (viewMode === "admin") {
    currentView = <AdminView />;
  } else if (viewMode === "contact") {
    currentView = <ContactView prefill={contactPrefill} />;
  }

  return (
    <div className="page-shell">
      <main className="page">
        {currentView}

        <footer className="page-footer">
          <div className="footer-nav" aria-label="Footer navigation">
            <button
              className={viewMode === "home" ? "text-link footer-link is-active" : "text-link footer-link"}
              onClick={() => navigateTo("home")}
              type="button"
            >
              home
            </button>
            <button
              className={viewMode === "about" ? "text-link footer-link is-active" : "text-link footer-link"}
              onClick={() => navigateTo("about")}
              type="button"
            >
              about
            </button>
            <button
              className={viewMode === "contact" ? "text-link footer-link is-active" : "text-link footer-link"}
              onClick={() => {
                setContactPrefill(null);
                navigateTo("contact");
              }}
              type="button"
            >
              contact
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
