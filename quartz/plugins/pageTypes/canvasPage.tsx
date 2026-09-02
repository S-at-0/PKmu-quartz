import { QuartzPageTypePlugin } from "../types"
import { QuartzComponentConstructor, QuartzComponentProps } from "../../components/types"

import { FilePath, FullSlug, joinSegments, pathToRoot, slugifyFilePath } from "../../util/path"
import path from "path"

// @ts-ignore
import canvasScript from "../../components/scripts/canvas.inline"
import canvasStyle from "../../components/styles/canvas.inline.scss"

export const CanvasBody: QuartzComponentConstructor = () => {
  const CanvasComponent = ({ fileData }: QuartzComponentProps) => {
    const slug = fileData.slug!
    const fp = fileData.relativePath ?? ((fileData.slug + ".canvas") as FilePath)
    const rawUrl = slugifyFilePath(fp as FilePath)
    const name = (fileData.frontmatter?.title as string) ?? path.basename(fp, ".canvas")
    const base = pathToRoot(slug)
    const finalRawUrl = joinSegments(base, rawUrl)

    return (
      <div class="canvas-full-page">
        <div
          class="canvas-embed"
          data-src={finalRawUrl}
          data-slug={slug}
          data-page={slugifyFilePath(fp as FilePath)}
          style="position: relative; background-color: transparent; margin: 1rem 0; height: 100vh; border: none; border-radius: 0;"
        >
          <div class="canvas-fallback">Loading Canvas: {name}</div>
        </div>
      </div>
    )
  }

  CanvasComponent.css = canvasStyle
  CanvasComponent.afterDOMLoaded = canvasScript

  return CanvasComponent
}

export const CanvasPageType: QuartzPageTypePlugin = () => ({
  name: "CanvasPageType",
  priority: 10,
  fileExtensions: [".canvas"],
  match: ({ fileData }) => {
    return fileData.relativePath?.endsWith(".canvas") ?? false
  },

  generate({ ctx }) {
    const fps = ctx.allFiles.filter((fp) => fp.endsWith(".canvas"))
    return fps.map((fp) => {
      const slug = slugifyFilePath(fp as FilePath, true) as FullSlug
      const name = path.basename(fp, ".canvas")
      return {
        slug,
        title: name,
        data: {
          slug,
          relativePath: fp as FilePath,
          frontmatter: { title: name, tags: [] },
        },
      }
    })
  },
  layout: "canvas",
  frame: "default",
  body: CanvasBody,
})

