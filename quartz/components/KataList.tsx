import { FullSlug, transformLink, slugifyFilePath, FilePath } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const wikilinkPattern = /^!?\[\[([^\]|#]+)?(#+[^\]|]+)?(?:\|([^\]]+))?\]\]$/

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
        const match = wikilinkPattern.exec(trimmed)

        if (match) {
          const rawTarget = match[1]?.trim() ?? ""
          const anchor = match[2]?.trim() ?? ""
          const alias = match[3]?.trim()

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
