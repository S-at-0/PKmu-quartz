import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import isAbsoluteUrl from "is-absolute-url"
import path from "path"
import { Root } from "hast"

export interface RemoteImagesOptions {
  baseUrl: string
  bucket: string
  nonAssetExtensions: string[]
}

const defaultOptions: RemoteImagesOptions = {
  baseUrl: "https://sato.tail82e0be.ts.net",
  bucket: "public",
  nonAssetExtensions: ["canvas", "css", "js", "json", "md", "ts", "html", "scss", "txt", "xml"],
}

export const RemoteImages: QuartzTransformerPlugin<Partial<RemoteImagesOptions>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  const s3Prefix = `${opts.baseUrl.replace(/\/$/, "")}/${opts.bucket.replace(/^\/|\/$/g, "")}`
  const nonAssetSet = new Set(opts.nonAssetExtensions.map((e) => e.toLowerCase().replace(/^\./, "")))

  const isTargetAsset = (urlStr: string): boolean => {
    const cleanUrl = urlStr.split("?")[0].split("#")[0]
    const ext = path.extname(cleanUrl).toLowerCase().replace(/^\./, "")
    if (!ext) return false
    return !nonAssetSet.has(ext)
  }

  const convertToS3Url = (fileSlug: string, src: string): string => {
    if (isAbsoluteUrl(src, { httpOnly: false })) {
      return src
    }

    const [cleanSrc, searchOrHash] = src.split(/(?=[?#])/)
    const fileDir = path.posix.dirname(fileSlug ?? "")
    const rawResolved = path.posix.resolve("/", fileDir, cleanSrc)
    const cleanPath = rawResolved.replace(/^\//, "").replace(/^(public\/)+/, "")
    const queryOrHash = searchOrHash ?? ""

    return `${s3Prefix}/${cleanPath}${queryOrHash}`
  }

  return {
    name: "RemoteImages",
    htmlPlugins() {
      return [
        () => {
          return (tree: Root, file) => {
            const currentSlug = file.data.slug ?? ""

            visit(tree, "element", (node) => {
              // 1. <img>, <video>, <audio>, <source> タグの src / srcset の置換
              if (
                ["img", "video", "audio", "source"].includes(node.tagName) &&
                node.properties &&
                typeof node.properties.src === "string"
              ) {
                const src = node.properties.src
                if (isTargetAsset(src) && !isAbsoluteUrl(src, { httpOnly: false })) {
                  node.properties.src = convertToS3Url(currentSlug, src)
                }
              }

              // 2. <a> タグの href (アセット/メディアファイルへのリンク) の置換
              if (
                node.tagName === "a" &&
                node.properties &&
                typeof node.properties.href === "string"
              ) {
                const href = node.properties.href
                if (isTargetAsset(href) && !isAbsoluteUrl(href, { httpOnly: false })) {
                  node.properties.href = convertToS3Url(currentSlug, href)
                  const classes = (node.properties.className ?? []) as string[]
                  if (!classes.includes("external")) {
                    classes.push("external")
                  }
                  const internalIndex = classes.indexOf("internal")
                  if (internalIndex !== -1) {
                    classes.splice(internalIndex, 1)
                  }
                  node.properties.className = classes
                }
              }
            })
          }
        },
      ]
    },
  }
}
