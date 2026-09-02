import { jsx, jsxs } from "preact/jsx-runtime"
import { classNames, pathToRoot } from "@quartz-community/utils"

export function BrandedPageTitle() {
  const PageTitle = ({ cfg, fileData, displayClass }) => {
    const title = cfg.pageTitle ?? "Quartz"
    const baseDir = pathToRoot(fileData.slug)
    const lines = title.split(" ").filter(Boolean)

    return jsx("h2", {
      class: classNames(displayClass, "page-title"),
      children: jsxs("a", {
        href: baseDir,
        class: "title-container",
        children: [
          jsx("img", { class: "page-title-icon", src: `${baseDir}/static/icon.png`, alt: "Logo" }),
          jsx("span", {
            class: "title-text",
            children: lines.map((line) =>
              jsx("span", { class: "title-line", children: line }, line),
            ),
          }),
        ],
      }),
    })
  }

  PageTitle.css = `
.page-title { margin: 0; }
.title-container { align-items: center; display: flex; gap: 0.8rem; text-decoration: none; }
.page-title-icon { height: 3.5rem; width: auto; }
.title-text { display: flex; flex-direction: column; line-height: 1.1; }
.title-line { color: var(--dark); font-family: var(--headerFont); font-size: 1.2rem; font-weight: 700; white-space: nowrap; }
`

  return PageTitle
}
