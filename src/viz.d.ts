// constructed based on https://github.com/mdaines/viz.js/wiki/API

export type Format = "dot"
                   | "json"
                   | "json0"
                   | "plain"
                   | "plain-ext"
                   | "ps"
                   | "ps2"
                   | "svg"
                   | "xdot"

export type Engine = "circo"  // for circular layout of graphs
                   | "dot"    // for drawing directed graphs
                   | "fdp"    // for drawing undirected graphs
                   | "neato"  // for drawing undirected graphs
                   | "osage"  // for drawing large undirected graphs
                   | "twopi"  // for radial layouts of graphs

export default class Viz {
  readonly wrapper :{
    readonly worker :Worker
  }
  constructor(options? :{ workerURL :string})
  renderString(source :string, options? :RenderOptions) :Promise<string>
}


export interface RenderOptions {
  /** Layout engine */
  engine? :Engine

  /** Output format */
  format? :Format

  /**
   * Invert the y coordinate in generic output formats (dot, xdot, plain, plain-ext).
   * This is equivalent to specifying -y when invoking Graphviz from the command-line.
   */
  yInvert? :boolean

  /** Image dimensions to use when rendering nodes with image attributes. */
  images? :Object[]

  /** Files to make available to Graphviz using Emscripten's in-memory filesystem. */
  files? :Object[]

  /**
   * "No layout" mode for the neato engine.
   * This is equivalent to specifying the -n option when invoking Graphviz from the command-line.
   */
  nop? :number
}
