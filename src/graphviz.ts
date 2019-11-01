import Viz from "./viz"
import { Format, Engine, RenderOptions } from "./viz"

declare const DEBUG :boolean
declare const VERSION :string

export const version = DEBUG ? "dev-" + Date.now().toString(36) : VERSION
export const TimeoutError = new Error("timeout")

// force use of iframe proxy, even when not necessary (only active when DEBUG=true)
const DEBUG_FORCE_PROXY = false


// Workers needs to use absolute URLs, also used for iframe proxy
const urlBase = ((s :HTMLScriptElement) => {
  let m = (s ? s.src : "").match(/^[^\?]+\//)
  return m ? m[0]
           : DEBUG ? "http://127.0.0.1:3009/"
                   : "https://rsms.me/graphviz/"
})(document.currentScript as HTMLScriptElement)


interface ProxyMsg {
  readonly type :string
  [k:string]    :any
}

interface ProxyTransaction<T> {
  readonly id      :number
  readonly resolve :(result:T)=>void
  readonly reject  :(reason:any)=>void
}


// Use an iframe proxy when served over a non-http url, like file:, data: or blob:
// where Worker is restricted.
const proxy = (
  document.location.pathname.indexOf("iframe-proxy.html") == -1 &&
  ( (DEBUG && DEBUG_FORCE_PROXY) || !(document.location.protocol in {"http:":1,"https:":1}) )
) ? new class {
  loadp     :Promise<void>
  iframe    :HTMLIFrameElement
  w         :Window
  resolve   :()=>void
  reject    :(e:Error)=>void
  nextTrID  :number = 0
  trans     = new Map<number,ProxyTransaction<any>>()   // id => tr

  constructor() {
    const timeStart = DEBUG ? Date.now() : 0
    const timeoutTimer = setTimeout(() => { this.reject(new Error("proxy timeout")) }, 30000)
    this.loadp = new Promise<void>((resolve, reject) => {
      this.resolve = () => {
        dlog(`proxy loaded in ${(Date.now() - timeStart).toFixed(0)}ms`)
        clearTimeout(timeoutTimer)
        resolve()
      }
      this.reject = e => {
        reject(e)
      }
    })
    // hook up message event listener
    window.addEventListener("message", ev => {
      dlog("[gv] got message from proxy:", ev.data)
      let msg = ev.data
      if (msg && typeof msg == "object") switch (msg.type) {

      case "graphviz.proxy.ready":
        ev.stopPropagation()
        this.resolve()
        break

      case "graphviz.proxy.response": {
        let t = this.trans.get(msg.trid)
        if (t) {
          this.trans.delete(msg.trid)
          if (msg.error) {
            t.reject(new Error(String(msg.error)))
          } else {
            t.resolve(msg.result)
          }
        }
        ev.stopPropagation()
        break
      }

      }
    })
    this.createIframe()
  }

  transaction<T = any>(msg :ProxyMsg) :Promise<T> {
    return this.loadp.then(() =>
      new Promise<T>((resolve, reject) => {
        let t :ProxyTransaction<T> = { id: this.nextTrID++, resolve, reject }
        this.trans.set(t.id, t)
        this.w.postMessage({ ...msg, trid: t.id }, "*")
      })
    )
  }

  layout(source :string, format? :Format, engine? :Engine, timeout? :number) :Promise<string> {
    return this.transaction<string>({
      type: "layout",
      args: [source, format, engine, timeout]
    })
  }

  createIframe() {
    let proxyUrl = urlBase + "iframe-proxy.html?v=" + version
    let iframe = this.iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.visibility = "hidden"
    iframe.style.pointerEvents = "none"
    iframe.src = proxyUrl
    ;(iframe as any).sandbox =
      "allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
    ;(iframe as any).border = "0"
    document.documentElement.appendChild(iframe)
    this.w = iframe.contentWindow!
    assert(this.w)
  }
} : null; // proxy


// main API function
export const layout : (
  source   :string,
  format?  :Format,  // defaults to "svg"
  engine?  :Engine,  // defaults to "dot"
  timeout? :number,  // milliseconds
) => Promise<string> = proxy ? proxy.layout.bind(proxy) : (() => {
  let _viz :Viz

  function restartWorker() {
    if (_viz) {
      // kill existing worker
      _viz.wrapper.worker.terminate()
    }
    _viz = new Viz({ workerURL: urlBase + "viz-worker.js?v=" + version })
    // warm up
    _viz.renderString("digraph G {}", { format: "svg", engine: "dot" }).catch(() => {})
  }

  restartWorker()

  return (source :string, format? :Format, engine? :Engine, timeout? :number) =>
    new Promise<string>((resolve, reject) => {

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

})()
