#!/bin/bash -e
cd "$(dirname "$0")"


pids=()
function cleanup {
  # echo "Stopping subprocesses"
  for pid in ${pids[*]}; do
    kill $pid
    wait $pid
  done
}
trap cleanup EXIT


bash build.sh -w &
pids+=( $! )

./docs/serve.py
