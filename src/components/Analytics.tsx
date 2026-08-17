"use client";

import Script from "next/script";

const GA_ID = "G-6Y1JBT1EXB";
const CLARITY_ID = "t8hxb4v0kn";

export function Analytics() {
  return (
    <>
      <Script id="portfolio-analytics-config" strategy="afterInteractive">
        {`window.PORTFOLIO_ANALYTICS = { gaId: '${GA_ID}', clarityId: '${CLARITY_ID}' };`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="portfolio-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? { debug_mode: true } : {});
        `}
      </Script>
      <Script id="portfolio-clarity" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `}
      </Script>
    </>
  );
}
