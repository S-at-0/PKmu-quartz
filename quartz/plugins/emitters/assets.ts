import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import path from "path"
import fs from "fs"
import { glob } from "../../util/glob"
import { Argv, BuildCtx } from "../../util/ctx"
import { QuartzConfig } from "../../cfg"
import isAbsoluteUrl from "is-absolute-url"
import { createMdProcessor, createHtmlProcessor } from "../../processors/parse"
import { VFile } from "vfile"
import { toHtml } from "hast-util-to-html"

const nonAssetExts = new Set(["canvas", "css", "js", "json", "md", "ts", "html", "scss", "txt", "xml"])
const s3Prefix = "https://sato.tail82e0be.ts.net/public"

const isTargetAsset = (filePath: string): boolean => {
  const cleanPath = filePath.split("?")[0].split("#")[0]
  const ext = path.extname(cleanPath).toLowerCase().replace(/^\./, "")
  if (!ext) return false
  return !nonAssetExts.has(ext)
}

const convertPathToS3Url = (canvasFp: string, targetPath: string): string => {
  if (isAbsoluteUrl(targetPath, { httpOnly: false })) return targetPath
  if (!isTargetAsset(targetPath)) return targetPath

  const rawTarget = targetPath.split("?")[0].split("#")[0].replace(/\\/g, "/")
  const canvasDir = path.posix.dirname(canvasFp)

  let cleanPath: string
  if (rawTarget.startsWith("./") || rawTarget.startsWith("../")) {
    cleanPath = path.posix.resolve("/", canvasDir, rawTarget).replace(/^\//, "")
  } else if (canvasDir === "." || canvasDir === "" || rawTarget.startsWith(canvasDir + "/")) {
    cleanPath = rawTarget.replace(/^\//, "")
  } else {
    cleanPath = path.posix.resolve("/", canvasDir, rawTarget).replace(/^\//, "")
  }

  if (canvasDir !== "." && canvasDir !== "") {
    const dupPrefix = `${canvasDir}/${canvasDir}/`
    while (cleanPath.startsWith(dupPrefix)) {
      cleanPath = cleanPath.slice(canvasDir.length + 1)
    }
  }

  cleanPath = cleanPath.replace(/^(public\/)+/, "")
  return `${s3Prefix}/${cleanPath}`
}

async function processTextToHtml(
  text: string,
  fullFp: FilePath,
  ctx: BuildCtx,
  mdProcessor: ReturnType<typeof createMdProcessor>,
  htmlProcessor: ReturnType<typeof createHtmlProcessor>,
): Promise<string> {
  if (!text) return ""

  const relativePath = path.posix.relative(ctx.argv.directory, fullFp) as FilePath
  const file = new VFile({
    value: text,
    data: {
      filePath: fullFp,
      relativePath: relativePath,
      slug: slugifyFilePath(relativePath),
    },
  })

  for (const plugin of ctx.cfg.plugins.transformers.filter((p) => p.textTransform)) {
    file.value = plugin.textTransform!(ctx, file.value.toString())
  }

  const ast = mdProcessor.parse(file)
  const newAst = await mdProcessor.run(ast, file)
  const htmlAst = await htmlProcessor.run(newAst as any, file)

  return toHtml(htmlAst, { allowDangerousHtml: true })
}

const filesToCopy = async (argv: Argv, cfg: QuartzConfig) => {
  // glob all non MD files in content folder and copy it over
  return await glob("**", argv.directory, ["**/*.md", ...cfg.configuration.ignorePatterns])
}

const copyFile = async (
  ctx: BuildCtx,
  fp: FilePath,
  mdProcessor?: ReturnType<typeof createMdProcessor>,
  htmlProcessor?: ReturnType<typeof createHtmlProcessor>,
) => {
  const { argv } = ctx
  const src = joinSegments(argv.directory, fp) as FilePath

  const name = slugifyFilePath(fp)
  const dest = joinSegments(argv.output, name) as FilePath

  // ensure dir exists
  const dir = path.dirname(dest) as FilePath
  await fs.promises.mkdir(dir, { recursive: true })

  // .canvas ファイル中のアセットパスを S3 URL に書き換え & text ノードを HTML 変換して出力
  if (fp.endsWith(".canvas")) {
    try {
      const rawContent = await fs.promises.readFile(src, "utf-8")
      const canvasData = JSON.parse(rawContent)
      if (Array.isArray(canvasData.nodes)) {
        for (const node of canvasData.nodes) {
          if (node.type === "file" && typeof node.file === "string") {
            node.file = convertPathToS3Url(fp, node.file)
          }
          if (node.type === "link") {
            if (typeof node.url === "string") {
              node.url = convertPathToS3Url(fp, node.url)
            }
            if (typeof node.link === "string") {
              node.link = convertPathToS3Url(fp, node.link)
            }
          }
          if (node.type === "text" && typeof node.text === "string" && mdProcessor && htmlProcessor) {
            node.textHtml = await processTextToHtml(node.text, src, ctx, mdProcessor, htmlProcessor)
          }
        }
      }
      await fs.promises.writeFile(dest, JSON.stringify(canvasData, null, 2))
      return dest
    } catch (err) {
      console.error(`Failed to process canvas file ${fp}:`, err)
      await fs.promises.copyFile(src, dest)
      return dest
    }
  }

  await fs.promises.copyFile(src, dest)
  return dest
}

interface Options {
  filter?: (path: string) => boolean
}

export const Assets: QuartzEmitterPlugin<Partial<Options>> = (userOpts) => {
  return {
    name: "Assets",
    async *emit(ctx) {
      const { argv, cfg } = ctx
      const mdProcessor = createMdProcessor(ctx)
      const htmlProcessor = createHtmlProcessor(ctx)
      const fps = await filesToCopy(argv, cfg)
      for (const fp of fps) {
        if (userOpts?.filter && !userOpts.filter(fp)) continue
        yield copyFile(ctx, fp, mdProcessor, htmlProcessor)
      }
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      const mdProcessor = createMdProcessor(ctx)
      const htmlProcessor = createHtmlProcessor(ctx)
      for (const changeEvent of changeEvents) {
        const ext = path.extname(changeEvent.path)
        if (ext === ".md") continue
        if (userOpts?.filter && !userOpts.filter(changeEvent.path)) continue

        if (changeEvent.type === "add" || changeEvent.type === "change") {
          yield copyFile(ctx, changeEvent.path as FilePath, mdProcessor, htmlProcessor)
        } else if (changeEvent.type === "delete") {
          const name = slugifyFilePath(changeEvent.path as FilePath)
          const dest = joinSegments(ctx.argv.output, name) as FilePath
          await fs.promises.unlink(dest)
        }
      }
    },
  }
}
