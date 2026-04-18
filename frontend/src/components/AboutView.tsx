type AboutViewProps = {
  onOpenCompose: () => void;
};

export function AboutView({ onOpenCompose }: AboutViewProps) {
  return (
    <section className="static-page">
      <div className="static-page-header">
        <h1>why femmoirs exists*</h1>
        <p className="compose-page-copy">
          femmoirs is a small anonymous space for women and femme-identifying
          people to share what happened in their own words, without performing
          polish for anyone else.
        </p>
      </div>

      <div className="static-page-grid">
        <section className="window-panel pink-panel static-panel">
          <p className="mini-label">what this space is for</p>
          <p className="static-copy">
            a place to name messy work stories, relationship fallout, strange
            microaggressions, bright wins, quiet grief, and the things that
            usually get edited down elsewhere.
          </p>
        </section>

        <section className="window-panel peach-panel static-panel">
          <p className="mini-label">what matters here</p>
          <ul className="static-list">
            <li>anonymity that lowers the cost of honesty</li>
            <li>community feedback through affirming and questioning</li>
            <li>a feed shaped by lived experience instead of branding</li>
          </ul>
        </section>

        <section className="window-panel cyan-panel static-panel">
          <p className="mini-label">want to add your own story?</p>
          <p className="static-copy">
            the writing flow is intentionally simple so the page gets out of
            your way.
          </p>
          <button
            className="mini-button lavender-button"
            onClick={onOpenCompose}
            type="button"
          >
            create a post
          </button>
        </section>
      </div>
    </section>
  );
}
