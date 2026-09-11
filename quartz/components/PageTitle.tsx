import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)

  // タイトルを単語ごとに分割
  const words = title.split(" ")

  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir} class="title-container">
        <img class="page-title-icon" src={`${baseDir}/static/icon.png`} alt="Logo" />
        <div class="title-text">
          {words.map((word) => (
            <span class="title-line">{word}</span>
          ))}
        </div>
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  margin: 0;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-decoration: none;
}

.page-title-icon {
  height: 3.5rem; /* タイトルの3行分に合わせる（後ほどCSSで微調整） */
  width: auto;
}

.title-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.title-line {
  font-family: var(--headerFont);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--dark);
  white-space: nowrap;
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
