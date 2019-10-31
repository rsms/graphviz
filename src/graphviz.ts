import Viz from "./viz"
import { Format, Engine } from "./viz"

declare const VERSION :string

export const version = VERSION
export const TimeoutError = new Error("timeout")

let _viz :Viz

export function layout(
  source   :string,
  format?  :Format,  // defaults to "svg"
  engine?  :Engine,  // defaults to "dot"
  timeout? :number,  // milliseconds
) :Promise<string> {
  return new Promise<string>((resolve, reject) => {

    let timeoutTimer :any
    if (timeout && timeout > 0) {
      timeoutTimer = setTimeout(() => {
        restartWorker()
        reject(TimeoutError)
      }, timeout)
    }

    return _viz.renderString(source, {
      format: format || "svg",
      engine: engine || "dot",
    }).then(resolve).catch(err => {
      clearTimeout(timeoutTimer)
      restartWorker()
      reject(err)
    })

  })
}


function restartWorker() {
  if (_viz) {
    // kill existing worker
    _viz.wrapper.worker.terminate()
  }
  _viz = new Viz({ workerURL: "viz-worker.js?v=" + VERSION })
  // warm up
  _viz.renderString("digraph G {}", { format: "svg", engine: "dot" }).catch(() => {})
}

restartWorker()
