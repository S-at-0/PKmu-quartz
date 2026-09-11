import { FilePath, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import path from "path"
import fs from "fs"
import { glob } from "../../util/glob"

export const SourceExporter: QuartzEmitterPlugin = () => {
    return {
        name: "SourceExporter",
        async *emit({ argv, cfg }) {
            const fps = await glob("**/*.md", argv.directory, cfg.configuration.ignorePatterns)
            for (const fp of fps) {
                const src = joinSegments(argv.directory, fp) as FilePath
                const dest = joinSegments(argv.output, "sources", "content", fp) as FilePath

                const dir = path.dirname(dest)
                await fs.promises.mkdir(dir, { recursive: true })
                await fs.promises.copyFile(src, dest)
                yield dest
            }
        },
        async *partialEmit(ctx, _content, _resources, changeEvents) {
            for (const changeEvent of changeEvents) {
                if (path.extname(changeEvent.path) !== ".md") continue

                if (changeEvent.type === "add" || changeEvent.type === "change") {
                    const src = joinSegments(ctx.argv.directory, changeEvent.path) as FilePath
                    const dest = joinSegments(ctx.argv.output, "sources", "content", changeEvent.path) as FilePath

                    const dir = path.dirname(dest)
                    await fs.promises.mkdir(dir, { recursive: true })
                    await fs.promises.copyFile(src, dest)
                    yield dest
                } else if (changeEvent.type === "delete") {
                    const dest = joinSegments(ctx.argv.output, "sources", "content", changeEvent.path) as FilePath
                    await fs.promises.unlink(dest)
                }
            }
        },
    }
}
