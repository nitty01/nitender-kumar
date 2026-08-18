/**
 * Portfolio-wide Mermaid defaults for project pages (L1 architecture overviews).
 * Light canvas + slate structure so classDef semantic fills stay readable.
 */
(function (global) {
  'use strict';

  /**
   * Expanded themeVariables for Mermaid 10.x (flowchart / graph).
   * Complements css/mermaid-diagrams.css SVG rules.
   */
  function getPortfolioMermaidThemeVariables() {
    return {
      darkMode: false,
      background: 'transparent',
      primaryColor: '#ccfbf1',
      primaryTextColor: '#042f2e',
      primaryBorderColor: '#0f766e',
      secondaryColor: '#f1f5f9',
      tertiaryColor: '#f8fafc',
      lineColor: '#334155',
      mainBkg: '#ccfbf1',
      secondBkg: '#f1f5f9',
      tertiaryBkg: '#f8fafc',
      clusterBkg: '#f8fafc',
      clusterBorder: '#94a3b8',
      edgeLabelBackground: '#fafafa',
      titleColor: '#0f172a',
      nodeTextColor: '#0f172a',
      nodeBorder: '#475569',
      defaultLinkColor: '#334155',
      actorBkg: '#f1f5f9',
      actorBorder: '#475569',
      actorTextColor: '#0f172a',
      signalColor: '#334155',
      labelBkg: '#fafafa',
      labelTextColor: '#0f172a',
      loopTextColor: '#334155',
      activationBorderColor: '#475569',
      sequenceNumberColor: '#0f172a',
      fontFamily: 'Inter, Helvetica Neue, Segoe UI, sans-serif',
      cScale0: '#ccfbf1',
      cScale1: '#dbeafe',
      cScale2: '#fef3c7',
      cScale3: '#f1f5f9',
      cScale4: '#f8fafc',
      cScale5: '#0f766e',
      cScale6: '#1d4ed8',
      cScale7: '#b45309',
      cScale8: '#475569',
      cScale9: '#64748b',
      cScale10: '#334155',
      cScale11: '#0f172a'
    };
  }

  /**
   * @param {Object} [options]
   * @param {number} [options.flowchartPadding]
   * @param {number} [options.nodeSpacing]
   * @param {number} [options.rankSpacing]
   */
  function getMermaidBaseConfig(options) {
    options = options || {};
    var flow = {
      useMaxWidth: false,
      htmlLabels: false,
      curve: 'linear',
      padding: 16,
      nodeSpacing: options.nodeSpacing != null ? options.nodeSpacing : 48,
      rankSpacing: options.rankSpacing != null ? options.rankSpacing : 64,
      diagramPadding: options.flowchartPadding != null ? options.flowchartPadding : 16
    };

    return {
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'strict',
      themeVariables: getPortfolioMermaidThemeVariables(),
      flowchart: flow,
      graph: {
        useMaxWidth: false,
        htmlLabels: false,
        diagramPadding: 16
      }
    };
  }

  global.MermaidPortfolioConfig = {
    getPortfolioMermaidThemeVariables: getPortfolioMermaidThemeVariables,
    getMermaidBaseConfig: getMermaidBaseConfig
  };
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
