export function ThemeBootScript() {
  const code = `
(function(){
  try {
    var t = localStorage.getItem('vforge.theme');
    if (t !== 'dark' && t !== 'light') {
      t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', t);
    var m = document.cookie.match(/(?:^|; )vforge\\.locale=([^;]+)/);
    var l = m ? decodeURIComponent(m[1]) : (localStorage.getItem('vforge.locale') || (navigator.language||'es').slice(0,2));
    if (l !== 'es' && l !== 'en') l = 'es';
    document.documentElement.setAttribute('lang', l);
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
