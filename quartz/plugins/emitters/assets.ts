import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import path from "path"
import fs from "fs"
import { glob } from "../../util/glob"
import { Argv } from "../../util/ctx"
import { QuartzConfig } from "../../cfg"
import isAbsoluteUrl from "is-absolute-url"

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

  const canvasDir = path.posix.dirname(canvasFp)
  const rawResolved = path.posix.resolve("/", canvasDir, targetPath.split("?")[0].split("#")[0])
  const cleanPath = rawResolved.replace(/^\//, "").replace(/^(public\/)+/, "")
  return `${s3Prefix}/${cleanPath}`
}

const filesToCopy = async (argv: Argv, cfg: QuartzConfig) => {
  // glob all non MD files in content folder and copy it over
  return await glob("**", argv.directory, ["**/*.md", ...cfg.configuration.ignorePatterns])
}

const copyFile = async (argv: Argv, fp: FilePath) => {
  const src = joinSegments(argv.directory, fp) as FilePath

  const name = slugifyFilePath(fp)
  const dest = joinSegments(argv.output, name) as FilePath

  // ensure dir exists
  const dir = path.dirname(dest) as FilePath
  await fs.promises.mkdir(dir, { recursive: true })

  // .canvas ファイル中のアセットパスを S3 URL に書き換えて出力
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
        }
      }
      await fs.promises.writeFile(dest, JSON.stringify(canvasData, null, 2))
      return dest
    } catch {
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
    async *emit({ argv, cfg }) {
      const fps = await filesToCopy(argv, cfg)
      for (const fp of fps) {
        if (userOpts?.filter && !userOpts.filter(fp)) continue
        yield copyFile(argv, fp)
      }
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      for (const changeEvent of changeEvents) {
        const ext = path.extname(changeEvent.path)
        if (ext === ".md") continue
        if (userOpts?.filter && !userOpts.filter(changeEvent.path)) continue

        if (changeEvent.type === "add" || changeEvent.type === "change") {
          yield copyFile(ctx.argv, changeEvent.path)
        } else if (changeEvent.type === "delete") {
          const name = slugifyFilePath(changeEvent.path)
          const dest = joinSegments(ctx.argv.output, name) as FilePath
          await fs.promises.unlink(dest)
        }
      }
    },
  }
}
