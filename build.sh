#!/bin/bash -e
cd "$(dirname "$0")"

FIGPLUG_ARGS=( \
  -no-manifest \
  -v \
)
RELEASE_MODE=false

function usage {
  echo "usage: $0 [options]"
  echo "options:"
  echo "  -h, --help  Show help message."
  echo "  -O          Build optimizied release build."
  echo "  -w          Watch source files for changes and rebuild continously."
}

while (( "$#" )); do
  case "$1" in
    -O)
      RELEASE_MODE=true
      shift
      ;;
    -w)
      FIGPLUG_ARGS+=( "-w" )
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --) # end argument parsing
      shift
      break
      ;;
    -*|--*)
      echo "Error: unexpected argument $1" >&2
      usage
      exit 1
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done

if $RELEASE_MODE; then
  FIGPLUG_ARGS+=( "-O" )
else
  FIGPLUG_ARGS+=( "-g" )
fi

VERSION=$(node -e 'process.stdout.write(require("./package.json").version)')

# figplug=~/src/figplug/bin/figplug.g
figplug=./node_modules/.bin/figplug

# update version
sed -E 's/let VERSION = "[^"]+"/let VERSION = "'"$VERSION"'"/g' docs/app.js > docs/.app.js
mv -f docs/.app.js docs/app.js

sed -E 's/\?v=[^"]+/?v='"$VERSION"'/g' docs/index.html > docs/.index.html
mv -f docs/.index.html docs/index.html

# optimize images
pushd docs >/dev/null
for f in *.svg; do
  svgo --multipass -q "$f" &
done
for f in *.png; do
  TMPNAME=.$f.tmp
  (pngcrush -q "$f" "$TMPNAME" && mv -f "$TMPNAME" "$f") &
done
popd >/dev/null

# build
$figplug build "${FIGPLUG_ARGS[@]}" src/graphviz.json:docs

wait
