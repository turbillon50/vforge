export function ThemeBootScript() {
  const code = `
(function(){
  try {
    var t = localStorage.getItem('vf-theme') || localStorage.getItem('vforge.theme');
    // VForge es dark-first: solo ir a light si el usuario lo eligió explícitamente
    if (t !== 'light') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var m = document.cookie.match(/(?:^|; )vforge\.locale=([^;]+)/);
    var l = m ? decodeURIComponent(m[1]) : (localStorage.getItem('vforge.locale') || (navigator.language||'es').slice(0,2));
    if (l !== 'es' && l !== 'en') l = 'es';
    document.documentElement.setAttribute('lang', l);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
