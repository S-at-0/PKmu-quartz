import { QuartzTransformerPlugin } from "../types"
import { Root, Html } from "mdast"
import { visit } from "unist-util-visit"
import path from "path"
import { FilePath, slugifyFilePath } from "../../util/path"
import { JSResource, CSSResource } from "../../util/resources"
// @ts-ignore
import canvasScript from "../../components/scripts/canvas.inline"
import canvasStyle from "../../components/styles/canvas.inline.scss"

export const Canvas: QuartzTransformerPlugin = () => {
  return {
    name: "Canvas",
    externalResources() {
      return {
        js: [
          {
            script: canvasScript,
            loadTime: "afterDOMReady",
            contentType: "inline",
          },
        ],
        css: [
          {
            content: canvasStyle,
            inline: true,
          },
        ],
      }
    },
  }
}
