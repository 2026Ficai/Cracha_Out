const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
    <path d="M7.3 2h9.4A5.3 5.3 0 0 1 22 7.3v9.4a5.3 5.3 0 0 1-5.3 5.3H7.3A5.3 5.3 0 0 1 2 16.7V7.3A5.3 5.3 0 0 1 7.3 2Zm0 2A3.3 3.3 0 0 0 4 7.3v9.4A3.3 3.3 0 0 0 7.3 20h9.4a3.3 3.3 0 0 0 3.3-3.3V7.3A3.3 3.3 0 0 0 16.7 4H7.3ZM12 6.8A5.2 5.2 0 1 1 6.8 12 5.2 5.2 0 0 1 12 6.8Zm0 2A3.2 3.2 0 1 0 15.2 12 3.2 3.2 0 0 0 12 8.8Zm5.55-3.5a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
    <path d="M13.7 22v-8h2.7l.4-3.1h-3.1V8.95c0-.9.25-1.5 1.55-1.5H16.9V4.68c-.29-.04-1.27-.12-2.42-.12-2.4 0-4.05 1.47-4.05 4.17v2.17H7.7V14h2.73v8h3.27Z" />
  </svg>
);

const AppFooter = () => (
  <footer className="no-print mt-auto shrink-0 border-t border-blue-800 bg-[#064f99] text-white">
    <div className="mx-auto flex min-h-10 w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2 text-[11px] sm:px-8">
      <p className="font-medium text-white/95">Secretaria Municipal de Educação | PMI <span className="mx-1 text-white/50">•</span> (21) 3782-9003 <span className="mx-1 text-white/50">•</span> cpdinfra@edu.itaguai.rj.gov.br</p>
      <div className="flex items-center gap-3 text-white">
        <span className="font-bold text-white/90">Itaguaí, RJ</span>
        <a href="https://www.instagram.com/prefeituradeitaguai/" target="_blank" rel="noreferrer" aria-label="Instagram da Prefeitura de Itaguaí" className="transition-opacity hover:opacity-60"><InstagramIcon /></a>
        <a href="https://www.facebook.com/prefeituradeitaguai" target="_blank" rel="noreferrer" aria-label="Facebook da Prefeitura de Itaguaí" className="transition-opacity hover:opacity-60"><FacebookIcon /></a>
      </div>
    </div>
  </footer>
);

export default AppFooter;
