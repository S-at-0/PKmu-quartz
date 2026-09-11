
document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement

    // 1. Handle Download Button Click (Toggle)
    const button = target.closest(".download-button")
    if (button) {
        const container = button.closest(".download-button-container")
        const dropdown = container?.querySelector(".download-dropdown")
        if (dropdown) {
            // Prevent close event from firing immediately if we were using separate listeners,
            // but here we manage flow logic directly.
            e.stopPropagation()

            // Close all other open dropdowns first to keep UI clean
            document.querySelectorAll(".download-dropdown.show").forEach(d => {
                if (d !== dropdown) d.classList.remove("show")
            })

            dropdown.classList.toggle("show")
            return
        }
    }

    // 2. Handle PDF Button Click
    const pdfBtn = target.closest(".download-pdf")
    if (pdfBtn) {
        const container = pdfBtn.closest(".download-button-container")
        const dropdown = container?.querySelector(".download-dropdown")
        if (dropdown) {
            dropdown.classList.remove("show")
            window.print()
            return
        }
    }

    // 3. Handle clicks inside the dropdown (e.g. Markdown link) -> Do nothing, let default action happen
    if (target.closest(".download-dropdown")) {
        return
    }

    // 4. Click outside -> Close all dropdowns
    document.querySelectorAll(".download-dropdown.show").forEach(d => {
        d.classList.remove("show")
    })
})

