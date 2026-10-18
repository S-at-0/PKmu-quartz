import { FullSlug, transformLink, slugifyFilePath, FilePath } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import isAbsoluteUrl from "is-absolute-url"

const wikilinkPattern = /^!?\[\[([^\]|#]+)?(#+[^\]|]+)?(?:\|([^\]]+))?\]\]$/
// [表示テキスト](URL) 形式のMarkdownリンク
const mdLinkPattern = /^\[([^\]]*)\]\(([^)]+)\)$/

const KataList: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  const kataList = (fileData.frontmatter?.kata ?? fileData.frontmatter?.["カタ"]) as string[] | undefined

  if (!kataList || kataList.length === 0) {
    return null
  }

  const allSlugs = allFiles.map((f) => f.slug).filter((s): s is FullSlug => Boolean(s))

  return (
    <ul class={classNames(displayClass, "kata-list")}>
      {kataList.map((item) => {
        const trimmed = item.trim()

        // --- Wikilink: [[target|alias]] ---
        const wikilinkMatch = wikilinkPattern.exec(trimmed)
        if (wikilinkMatch) {
          const rawTarget = wikilinkMatch[1]?.trim() ?? ""
          const anchor = wikilinkMatch[2]?.trim() ?? ""
          const alias = wikilinkMatch[3]?.trim()

          const targetSlug = slugifyFilePath(rawTarget as FilePath)
          const href = transformLink(fileData.slug!, targetSlug + anchor, {
            strategy: "shortest",
            allSlugs,
          })

          const displayText = alias || rawTarget

          return (
            <li>
              <a href={href} class="internal kata-badge">
                <span class="kata-icon">◇</span>
                {displayText}
              </a>
            </li>
          )
        }

        // --- Markdownリンク: [text](url) ---
        const mdMatch = mdLinkPattern.exec(trimmed)
        if (mdMatch) {
          const displayText = mdMatch[1] || mdMatch[2]
          const rawHref = mdMatch[2]

          if (isAbsoluteUrl(rawHref, { httpOnly: false })) {
            // 外部リンク
            return (
              <li>
                <a href={rawHref} class="external kata-badge" target="_blank" rel="noopener noreferrer">
                  <span class="kata-icon">◇</span>
                  {displayText}
                  <svg
                    aria-hidden="true"
                    class="external-icon"
                    style="max-width:0.8em;max-height:0.8em"
                    viewBox="0 0 512 512"
                  >
                    <path d="M320 0H288V64h32 82.7L201.4 265.4 178.7 288 224 333.3l22.6-22.6L448 109.3V192v32h64V192 32 0H480 320zM32 32H0V64 480v32H32 456h32V480 352 320H424v32 96H64V96h96 32V32H160 32z" />
                  </svg>
                </a>
              </li>
            )
          } else {
            // 内部リンク（相対パス）
            const href = transformLink(fileData.slug!, rawHref as any, {
              strategy: "shortest",
              allSlugs,
            })
            return (
              <li>
                <a href={href} class="internal kata-badge">
                  <span class="kata-icon">◇</span>
                  {displayText}
                </a>
              </li>
            )
          }
        }

        // 通常のテキストの場合
        return (
          <li>
            <span class="kata-badge text-only">
              <span class="kata-icon">◇</span>
              {trimmed}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

KataList.css = `
.kata-list {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 0.5rem 0 1rem 0;
  flex-wrap: wrap;
}

.kata-list > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

.kata-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 6px;
  background-color: var(--highlight);
  border: 1px solid var(--lightgray);
  padding: 0.15rem 0.5rem;
  font-size: 0.85rem;
  color: var(--secondary);
  text-decoration: none;
  transition: all 0.2s ease;
}

a.internal.kata-badge:hover {
  border-color: var(--secondary);
  background-color: var(--lightgray);
}

.kata-badge.text-only {
  color: var(--darkgray);
}

.kata-icon {
  font-size: 0.75rem;
  opacity: 0.7;
}
`

export default (() => KataList) satisfies QuartzComponentConstructor
