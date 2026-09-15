#!/usr/bin/env bash
#
# Publica el sitio en GitHub Pages: https://imanol05.github.io/matter-club/
#
#   ./deploy.sh
#
# Compila la versión estática y la sube a la rama gh-pages. El código fuente va
# por separado con un commit y push normales a main.

set -euo pipefail

REPO_HTTPS="https://github.com/imanol05/matter-club.git"
RAMA="gh-pages"
AUTOR_NOMBRE="Imanol"
AUTOR_EMAIL="edgardobuttarelli@gmail.com"

cd "$(dirname "$0")"

echo "==> Compilando el sitio estático"
npm run build:pages

if [[ ! -f out/index.html ]]; then
  echo "ERROR: no se generó out/index.html. Abortando." >&2
  exit 1
fi

# El .nojekyll es imprescindible: sin él GitHub Pages ignora la carpeta _next
# (Jekyll saltea todo lo que empieza con guión bajo) y el sitio sale sin
# estilos ni JavaScript.
touch out/.nojekyll

echo "==> Publicando en la rama $RAMA"
# Se arma un repo descartable adentro de out/ y se fuerza el push: la rama
# gh-pages no necesita historia, es siempre el último build entero.
(
  cd out
  rm -rf .git
  git init -q -b "$RAMA"
  git add -A
  git -c user.name="$AUTOR_NOMBRE" -c user.email="$AUTOR_EMAIL" \
      commit -q -m "Publicar sitio · $(date '+%Y-%m-%d %H:%M')"
  git push -f -q "$REPO_HTTPS" "$RAMA"
  rm -rf .git
)

echo
echo "==> Listo. En un minuto o dos:"
echo "    https://imanol05.github.io/matter-club/"
echo
echo "    Si no ves los cambios, probá con Ctrl+Shift+R (el navegador cachea)."
