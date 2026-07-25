// Shared styles for all src/app/wiki/[gameId]/** pages, following the app's convention of a
// single `styles` template-literal string rendered via <style>{styles}</style> (no CSS
// modules, no Tailwind — see docs/components.md). Kept in one module since the wiki spans many
// pages that share the same look, instead of duplicating ~150 lines of CSS per page.
export const wikiStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');

  .wiki-page { min-height: 100vh; background: #0f1a0f; color: #f2e8d0; font-family: 'Lato', sans-serif; padding: 24px; }
  .wiki-container { max-width: 720px; margin: 0 auto; }
  .wiki-title { font-family: 'Cinzel', serif; font-size: 1.6rem; font-weight: 700; color: #c9922a; margin-bottom: 4px; }
  .wiki-subtitle { font-size: 0.85rem; color: #8a9a7a; margin-bottom: 20px; }
  .wiki-back { display: inline-block; margin-bottom: 16px; font-size: 0.78rem; color: #8a9a7a; text-decoration: none; }
  .wiki-back:hover { color: #c9922a; }

  .wiki-language-picker { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0 12px; }
  .wiki-language-option { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; color: #f2e8d0; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.85rem; padding: 12px 22px; }
  .wiki-language-option:hover { border-color: #c9922a; color: #c9922a; }
  .wiki-language-note { font-size: 0.75rem; color: #5a6a4a; }

  .wiki-combobox { position: relative; margin-bottom: 24px; }
  .wiki-combobox-input { width: 100%; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.95rem; padding: 11px 14px; outline: none; box-sizing: border-box; }
  .wiki-combobox-input:focus { border-color: #c9922a; }
  .wiki-combobox-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; max-height: 320px; overflow-y: auto; z-index: 10; }
  .wiki-combobox-empty { padding: 12px 14px; color: #5a6a4a; font-size: 0.85rem; }
  .wiki-combobox-option { padding: 10px 14px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; }
  .wiki-combobox-option.active { background: #1a2e1a; }
  .wiki-combobox-type { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: #8a9a7a; border: 1px solid #2d3b2d; border-radius: 3px; padding: 1px 6px; flex-shrink: 0; }

  .wiki-section-heading { font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase; color: #8a9a7a; margin: 28px 0 12px; }
  .wiki-section-heading:first-of-type { margin-top: 0; }
  .wiki-see-all-link { display: inline-block; margin-top: 10px; font-size: 0.78rem; color: #8a9a7a; text-decoration: none; }
  .wiki-see-all-link:hover { color: #c9922a; }

  .wiki-section-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .wiki-section-link { display: block; background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 18px; text-align: center; text-decoration: none; color: #f2e8d0; font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.05em; }
  .wiki-section-link:hover { border-color: #c9922a; }

  .wiki-list { display: flex; flex-direction: column; gap: 6px; }
  .wiki-list-item { display: block; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; padding: 10px 14px; text-decoration: none; color: #f2e8d0; font-size: 0.9rem; }
  .wiki-list-item:hover { border-color: #c9922a; }
  .wiki-list-item-sub { color: #8a9a7a; font-size: 0.75rem; margin-left: 8px; }

  .wiki-detail-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 24px; }
  .wiki-detail-body { line-height: 1.6; font-size: 0.95rem; }
  .wiki-link { color: #c9922a; text-decoration: underline; text-decoration-color: rgba(201,146,42,0.4); }
  .wiki-link:hover { text-decoration-color: #c9922a; }
  .wiki-faction-notes { margin-top: 24px; padding-top: 16px; border-top: 1px solid #2d3b2d; }
  .wiki-faction-notes ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
  .wiki-faction-notes li { font-size: 0.85rem; color: #a0b090; line-height: 1.55; }
  .wiki-craft-cost { margin-top: 16px; padding-top: 16px; border-top: 1px solid #2d3b2d; font-size: 0.85rem; color: #a0b090; }
  .wiki-craft-cost-line { margin-top: 6px; }

  .wiki-faction-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  .wiki-faction-card { display: block; background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 14px; text-align: center; text-decoration: none; color: #f2e8d0; }
  .wiki-faction-card:hover { border-color: #c9922a; }
  .wiki-faction-name { font-family: 'Cinzel', serif; font-size: 0.78rem; margin-top: 8px; }
  .wiki-faction-badge { display: inline-block; margin-top: 6px; font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 3px; }
  .wiki-faction-badge.complete { background: rgba(90,138,58,0.3); color: #9fce7a; }
  .wiki-faction-badge.stub { background: rgba(90,90,90,0.3); color: #8a9a7a; }

  .wiki-play-button { display: inline-block; margin-top: 16px; background: #8b3a1a; border: none; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.82rem; letter-spacing: 0.1em; padding: 10px 22px; text-decoration: none; }
  .wiki-play-button:hover { background: #a04520; }

  .lookup { position: relative; margin-bottom: 18px; }
  .lookup-input { width: 100%; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.85rem; padding: 8px 12px; outline: none; box-sizing: border-box; }
  .lookup-input:focus { border-color: #c9922a; }
  .lookup-results { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; max-height: 240px; overflow-y: auto; z-index: 10; }
  .lookup-empty { padding: 10px 12px; color: #5a6a4a; font-size: 0.8rem; }
  .lookup-result { padding: 8px 12px; cursor: pointer; font-size: 0.85rem; }
  .lookup-result:hover { background: #1a2e1a; }
  .lookup-panel { margin-top: 10px; background: #0f1a0f; border: 1px solid #2d3b2d; border-left: 3px solid #c9922a; border-radius: 3px; padding: 12px 14px; }
  .lookup-panel-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
  .lookup-panel-header strong { font-family: 'Cinzel', serif; font-size: 0.9rem; color: #c9922a; }
  .lookup-panel-header button { background: none; border: none; color: #5a6a4a; cursor: pointer; font-size: 0.9rem; padding: 2px 6px; }
  .lookup-panel-header button:hover { color: #c9922a; }
  .lookup-panel-cost { font-size: 0.78rem; color: #a0b090; margin-bottom: 8px; }
  .lookup-panel-body { font-size: 0.88rem; line-height: 1.55; }
  .wiki-link-inline { background: none; border: none; padding: 0; font: inherit; cursor: pointer; }

  .wizard-variant-picker { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #2d3b2d; }
  .wizard-variant-description { font-size: 0.82rem; color: #a0b090; margin-top: 8px; line-height: 1.5; }
  .wizard-modifier-list { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 8px; }
  .wizard-modifier-option { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.82rem; color: #f2e8d0; cursor: pointer; }
  .wizard-modifier-option.disabled { color: #5a6a4a; cursor: not-allowed; }
  .wizard-action-modifier { font-size: 0.85rem; color: #e08a3a; background: rgba(224,138,58,0.08); border-left: 2px solid rgba(224,138,58,0.5); padding: 6px 10px; margin: 6px 0 0; line-height: 1.5; }
  .wizard-action-modifier strong { color: #c9922a; }
  .wizard-driven-actions { display: flex; flex-direction: column; gap: 4px; }
  .wizard-failure-panel { margin-top: 12px; }
  .wizard-failure-toggle { background: none; border: none; color: #e08a3a; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.76rem; padding: 4px 0; }
  .wizard-failure-toggle:hover { color: #c9922a; }
  .wizard-failure-body { margin-top: 8px; padding-left: 12px; border-left: 2px solid rgba(224,138,58,0.4); }

  .wizard { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 24px; }
  .wizard-beginner-toggle { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; color: #a0b090; margin-bottom: 16px; cursor: pointer; }
  .wizard-phase-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .wizard-phase-pill { font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #5a6a4a; background: none; border: 1px solid #2d3b2d; border-radius: 12px; padding: 3px 10px; cursor: pointer; }
  .wizard-phase-pill:hover { border-color: #c9922a; }
  .wizard-phase-pill.active { color: #c9922a; border-color: #c9922a; }
  .wizard-progress { font-size: 0.72rem; color: #5a6a4a; margin-bottom: 16px; }
  .wizard-pending { color: #a0b090; font-style: italic; padding: 20px 0; }
  .wizard-repeat-badge { display: inline-block; font-size: 0.68rem; color: #e08a3a; border: 1px solid rgba(224,138,58,0.4); border-radius: 3px; padding: 2px 8px; margin-bottom: 10px; }
  .wizard-action h3 { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #f2e8d0; margin: 0 0 8px; }
  .wizard-action p { line-height: 1.6; font-size: 0.92rem; margin: 0 0 14px; }
  .wizard-tip { background: #152515; border-left: 3px solid #c9922a; border-radius: 3px; padding: 10px 12px; font-size: 0.85rem; margin-top: 10px; line-height: 1.5; }
  .wizard-nav { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #2d3b2d; }
  .wizard-nav-group { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .wizard-nav-label { font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: #5a6a4a; width: 52px; flex-shrink: 0; }
  .wizard-nav-group button { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.76rem; padding: 7px 16px; }
  .wizard-nav-group button:hover:not(:disabled) { border-color: #c9922a; color: #c9922a; }
  .wizard-nav-group button:disabled { color: #3a4a3a; cursor: not-allowed; }
`;
