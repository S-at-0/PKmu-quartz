/** Restore the aliases used by the v4 custom FrontMatter transformer. */
export default function JapaneseFrontmatter() {
  return {
    name: "JapaneseFrontmatter",
    markdownPlugins() {
      return [
        () => (_tree, file) => {
          const frontmatter = file.data?.frontmatter
          if (!frontmatter || typeof frontmatter !== "object") return

          if (frontmatter["通り名"] != null && String(frontmatter["通り名"]).trim() !== "") {
            frontmatter.title = String(frontmatter["通り名"])
          }
          if (frontmatter["日付"] != null) frontmatter.created = frontmatter["日付"]
          if (frontmatter["とき"] != null) frontmatter.modified = frontmatter["とき"]
          if (frontmatter.modified == null && frontmatter.created != null) {
            frontmatter.modified = frontmatter.created
          }
        },
      ]
    },
  }
}
