/**
 * Portfolio-wide Mermaid defaults for project pages (L1/L2 architecture diagrams).
 * Theme: dark base + slate palette - avoids pure-black node/cluster fills.
 * Self-Analytics: pass { flowchartPadding: 20, nodeSpacing: 60, rankSpacing: 60 } for ELK layouts.
 */
(function (global) {
  'use strict';

  /**
   * Expanded themeVariables for Mermaid 10.x (flowchart / graph).
   * Complements css/mermaid-diagrams.css SVG rules.
   */
  function getPortfolioMermaidThemeVariables() {
    return {
      darkMode: true,
      background: 'transparent',
      primaryColor: '#0e7490',
      primaryTextColor: '#f1f5f9',
      primaryBorderColor: '#22d3ee',
      secondaryColor: '#334155',
      tertiaryColor: '#1e293b',
      lineColor: '#94a3b8',
      mainBkg: '#1e293b',
      secondBkg: '#334155',
      tertiaryBkg: '#0f172a',
      clusterBkg: 'rgba(30, 41, 59, 0.65)',
      clusterBorder: '#64748b',
      edgeLabelBackground: 'rgba(51, 65, 85, 0.95)',
      titleColor: '#f1f5f9',
      nodeTextColor: '#e2e8f0',
      nodeBorder: '#64748b',
      defaultLinkColor: '#94a3b8',
      actorBkg: '#1e293b',
      actorBorder: '#64748b',
      actorTextColor: '#f1f5f9',
      signalColor: '#94a3b8',
      labelBkg: '#334155',
      labelTextColor: '#f1f5f9',
      loopTextColor: '#cbd5e1',
      activationBorderColor: '#64748b',
      sequenceNumberColor: '#f1f5f9',
      /* Color scale - replace near-black defaults from dark theme */
      cScale0: '#164e63',
      cScale1: '#155e75',
      cScale2: '#0e7490',
      cScale3: '#0891b2',
      cScale4: '#06b6d4',
      cScale5: '#22d3ee',
      cScale6: '#334155',
      cScale7: '#475569',
      cScale8: '#64748b',
      cScale9: '#94a3b8',
      cScale10: '#cbd5e1',
      cScale11: '#e2e8f0'
    };
  }

  /**
   * @param {Object} [options]
   * @param {number} [options.flowchartPadding] - default 0; Self-Analytics uses 20
   * @param {number} [options.nodeSpacing]
   * @param {number} [options.rankSpacing]
   */
  function getMermaidBaseConfig(options) {
    options = options || {};
    var flow = {
      useMaxWidth: false,
      htmlLabels: false,
      curve: 'basis',
      diagramPadding: options.flowchartPadding != null ? options.flowchartPadding : 0
    };
    if (options.nodeSpacing != null) {
      flow.nodeSpacing = options.nodeSpacing;
    }
    if (options.rankSpacing != null) {
      flow.rankSpacing = options.rankSpacing;
    }

    return {
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      themeVariables: getPortfolioMermaidThemeVariables(),
      flowchart: flow,
      graph: {
        useMaxWidth: false,
        htmlLabels: false,
        diagramPadding: 0
      }
    };
  }

  global.MermaidPortfolioConfig = {
    getPortfolioMermaidThemeVariables: getPortfolioMermaidThemeVariables,
    getMermaidBaseConfig: getMermaidBaseConfig
  };
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
