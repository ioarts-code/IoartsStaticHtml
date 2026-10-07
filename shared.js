// Shared site menu and footer. Edit here to update every page.
// Pages mark where each goes with <div data-site-menu></div> and <div data-site-footer></div>.

const SITE_MENU_HTML = `
  <aside class="vertical-menu" aria-label="Site menu">
    <button class="vertical-menu__dots" type="button" aria-label="Open menu"><span></span><span></span><span></span></button>
    <a class="vertical-menu__brand" href="index.html">IOARTS</a>
    <nav class="vertical-menu__links">
      <a href="about-me.html">About Me</a>
      <a href="https://buymeacoffee.com/ioartseu">Buy me coffee</a>
    </nav>
  </aside>
`;

const SITE_FOOTER_HTML = `
  <footer class="ioarts-footer">
    <div class="ioarts-footer__brand">IOARTS</div>
    <div class="ioarts-footer__social" aria-label="Social links">
      <a href="https://www.deviantart.com/ioartseu/" target="_blank" rel="noopener noreferrer" aria-label="DeviantArt">Deviant</a>
      <a href="https://se.pinterest.com/brevduva999/" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">Pinterest</a>
      <a href="https://www.facebook.com/ioartseu" target="_blank" rel="noopener noreferrer" aria-label="Facebook">Fb</a>
    </div>
    <nav class="ioarts-footer__links" aria-label="Footer navigation">
      <a href="about-me.html">About Me</a>
      <a href="contact.html">Contact</a>
      <a href="terms-of-sale.html">Terms of Sale</a>
      <a href="privacy-policy.html">Privacy Policy</a>
      <a href="copyright-attribution.html">Copyright</a>
    </nav>
    <div class="ioarts-footer__copyright">2026 © By Ioarts Websites</div>
  </footer>
`;

function injectSharedParts() {
  document.querySelectorAll('[data-site-menu]').forEach((slot) => {
    slot.outerHTML = SITE_MENU_HTML.trim();
  });
  document.querySelectorAll('[data-site-footer]').forEach((slot) => {
    slot.outerHTML = SITE_FOOTER_HTML.trim();
  });
}

injectSharedParts();
