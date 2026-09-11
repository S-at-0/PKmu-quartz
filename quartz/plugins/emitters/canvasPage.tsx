import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { FilePath, joinSegments, pathToRoot, slugifyFilePath } from "../../util/path"
import { defaultContentPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { write } from "./helpers"
import path from "path"

export const CanvasPage: QuartzEmitterPlugin<Partial<FullPageLayout>> = (userOpts) => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultContentPageLayout,
    pageBody: () => null,
    ...userOpts,
  }

  const { head: Head, header, beforeBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "CanvasPage",
    getQuartzComponents() {
      return [Head, Header, Body]
    },
    async *emit(ctx, content, resources) {
      const cfg = ctx.cfg.configuration
      const fps = ctx.allFiles.filter((fp) => fp.endsWith(".canvas"))
      const processedSlugs = new Set(content.map((c) => c[1].data.slug))

      for (const fp of fps) {
        const slug = slugifyFilePath(fp as FilePath, true)
        if (processedSlugs.has(slug)) continue

        const rawUrl = slugifyFilePath(fp as FilePath)
        const name = path.basename(fp, ".canvas")
        
        const fileData = {
          slug,
          relativePath: fp as FilePath,
          frontmatter: { title: name },
        }

        const externalResources = pageResources(pathToRoot(slug), resources)
        const componentData: QuartzComponentProps = {
          ctx,
          fileData,
          externalResources,
          cfg,
          children: [],
          allFiles: [],
          tree: { type: "root", children: [] },
        }

        const base = pathToRoot(slug)
        const finalRawUrl = joinSegments(base, rawUrl)

        // Custom full-screen canvas body
        const CanvasBody = () => (
          <div class="canvas-full-page">
            <div class="canvas-embed" data-src={finalRawUrl} data-slug={slug} data-page={slugifyFilePath(fp as FilePath)} style="position: relative; background-color: transparent; margin: 1rem 0; height: 100vh; border: none; border-radius: 0;">
               <div class="canvas-fallback">Loading Canvas: {name}</div>
            </div>
          </div>
        )

        const content = renderPage(cfg, slug, componentData, { ...opts, pageBody: CanvasBody }, externalResources)
        yield write({
          ctx,
          content,
          slug,
          ext: ".html",
        })
      }
    },
  }
}
