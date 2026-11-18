#!/usr/bin/env bash
# HYDROLAB – Verificación previa al despliegue
# Comprueba que todos los archivos que usa la página existan con el nombre exacto
# (Render corre en Linux, que distingue mayúsculas y minúsculas) y que no haya
# direcciones locales. Si algo falla, el despliegue se detiene con un mensaje claro.
set -euo pipefail
cd "$(dirname "$0")/../public"
errores=0

echo "▶ Verificando recursos de public/index.html…"
refs=$(grep -oE '(src|href)="[^"#]+"' index.html | sed -E 's/^(src|href)="//; s/"$//; s/\?.*$//')
for r in $refs; do
  case "$r" in http*|mailto:*|data:*) continue;; esac
  if [ -f "$r" ]; then echo "  ✓ $r"; else echo "  ✗ FALTA: $r"; errores=$((errores+1)); fi
done

echo "▶ Verificando fuentes de styles.css…"
for r in $(grep -oE 'url\("[^"]+"\)' styles.css | sed -E 's/url\("//; s/"\)//'); do
  if [ -f "$r" ]; then echo "  ✓ $r"; else echo "  ✗ FALTA: $r"; errores=$((errores+1)); fi
done

echo "▶ Verificando el video de VIDEO_CONFIG (script.js)…"
vurl=$(grep -oE "url: '[^']*'" script.js | head -1 | sed -E "s/url: '//; s/'$//")
if [ -z "$vurl" ]; then echo "  · Sin video configurado"
elif [[ "$vurl" == http* ]]; then echo "  ✓ Video externo: $vurl"
elif [ -f "$vurl" ]; then echo "  ✓ $vurl ($(du -h "$vurl" | cut -f1))"
else echo "  ✗ FALTA el video: $vurl"; errores=$((errores+1)); fi
for img in $(grep -oE "portada: '[^']*'" script.js | sed -E "s/portada: '//; s/'$//"); do
  if [ -f "$img" ]; then echo "  ✓ $img"; else echo "  ✗ FALTA: $img"; errores=$((errores+1)); fi
done

echo "▶ Buscando direcciones locales (localhost, 127.0.0.1, file://)…"
if grep -rnE "localhost|127\.0\.0\.1|file://" --include='*.html' --include='*.js' --include='*.css' . ; then
  echo "  ✗ Hay direcciones locales que no funcionarían publicadas"; errores=$((errores+1))
else
  echo "  ✓ Ninguna"
fi

if [ "$errores" -gt 0 ]; then
  echo "✗ Verificación fallida: $errores problema(s)."; exit 1
fi
echo "✓ Todo correcto: HYDROLAB está listo para publicarse."
