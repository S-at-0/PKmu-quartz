import { removeAllChildren } from "./util"

interface CanvasNode {
  id: string; x: number; y: number; width: number; height: number;
  type: "text" | "file" | "link" | "group"
  text?: string; file?: string; link?: string; label?: string; color?: string
}

interface CanvasEdge {
  id: string; fromNode: string; toNode: string;
  fromSide?: "top" | "bottom" | "left" | "right"; toSide?: "top" | "bottom" | "left" | "right"
  label?: string; color?: string;
  fromEnd?: "arrow" | "none"; toEnd?: "arrow" | "none"
}

interface CanvasData { nodes: CanvasNode[]; edges: CanvasEdge[] }

class CanvasRenderer {
  private scale = 1; private pan = { x: 0, y: 0 }; private isDragging = false
  private startPan = { x: 0, y: 0 }; private viewport: HTMLElement; private content: HTMLElement
  private data: CanvasData | null = null; private index: any = {}; private currentSlug: string; private rootPath: string

  constructor(private container: HTMLElement, private src: string) {
    this.currentSlug = container.getAttribute("data-slug") || ""
    this.rootPath = this.pathToRoot(this.currentSlug)
    this.viewport = document.createElement("div"); this.viewport.className = "canvas-viewport"
    this.content = document.createElement("div"); this.content.className = "canvas-content"
    this.viewport.appendChild(this.content); removeAllChildren(this.container); this.container.appendChild(this.viewport)
    this.setupControls(); this.setupEventListeners(); this.load()
  }

  private pathToRoot(slug: string): string {
    const parts = slug.split("/"); if (parts.length <= 1) return ""; return "../".repeat(parts.length - 1)
  }

  private getColor(color: string | undefined): string | undefined {
    if (!color) return undefined
    const colorMap: Record<string, string> = { "1": "#ff3e3e", "2": "#ff9c3e", "3": "#ffff3e", "4": "#3eff3e", "5": "#3effff", "6": "#a33eff" }
    return colorMap[color] || color
  }

  private async load() {
    try {
      const [canvasResp, indexResp] = await Promise.all([
        fetch(this.src),
        fetch(this.rootPath + "static/contentIndex.json").catch(() => fetch(this.rootPath + "index.json"))
      ])
      if (!canvasResp.ok) {
        throw new Error(`Canvas file not found (${canvasResp.status})`)
      }
      this.data = await canvasResp.json()
      try { this.index = await indexResp.json() } catch (e) {}
      this.render(); this.autoFit()
    } catch (e) { this.container.innerHTML = `<div class="canvas-error">Canvasを読み込めませんでした: ${e}</div>` }
  }


  private resolveUrl(filePath: string | undefined): string {
    if (!filePath) return ""
    const target = filePath.replace(/\\/g, "/").replace(/^(public\/)+/, "").replace(/^\//, "")
    for (const [slug, data] of Object.entries(this.index) as [string, any][]) {
      const path = data.filePath.replace(/\\/g, "/").replace(/^(public\/)+/, "").replace(/^\//, "")
      if (path === target) return this.rootPath + slug.replace(/^(public\/)+/, "") + ".html"
    }
    return this.rootPath + target.replace(/\.md$/, "").replace(/\s/g, "-").toLowerCase().replace(/^(public\/)+/, "") + ".html"
  }

  private setupControls() {
    const controls = document.createElement("div"); controls.className = "canvas-controls"
    const zoomIn = document.createElement("button"); zoomIn.innerText = "+"; zoomIn.onclick = () => this.zoom(0.2)
    const zoomOut = document.createElement("button"); zoomOut.innerText = "-"; zoomOut.onclick = () => this.zoom(-0.2)
    const reset = document.createElement("button"); reset.innerText = "Fit"; reset.onclick = () => this.autoFit()
    controls.appendChild(zoomOut); controls.appendChild(reset); controls.appendChild(zoomIn); this.container.appendChild(controls)
  }

  private setupEventListeners() {
    this.viewport.addEventListener("mousedown", (e) => { if (e.button !== 0) return; this.isDragging = true; this.startPan = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y } })
    window.addEventListener("mousemove", (e) => { if (!this.isDragging) return; this.pan = { x: e.clientX - this.startPan.x, y: e.clientY - this.startPan.y }; this.updateTransform() })
    window.addEventListener("mouseup", () => { this.isDragging = false })
    this.viewport.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom(-e.deltaY * 0.0005, e.clientX, e.clientY) }, { passive: false })
  }

  private zoom(delta: number, clientX?: number, clientY?: number) {
    const oldScale = this.scale; this.scale = Math.min(Math.max(this.scale + delta, 0.05), 5)
    if (clientX !== undefined && clientY !== undefined) {
      const rect = this.viewport.getBoundingClientRect(); const x = clientX - rect.left - this.pan.x; const y = clientY - rect.top - this.pan.y
      const scaleRatio = this.scale / oldScale; this.pan.x -= x * (scaleRatio - 1); this.pan.y -= y * (scaleRatio - 1)
    }
    this.updateTransform()
  }

  private autoFit() {
    if (!this.data || this.data.nodes.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of this.data.nodes) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height) }
    const p = 100; const w = maxX - minX + p * 2; const h = maxY - minY + p * 2
    const cW = this.container.clientWidth; const cH = this.container.clientHeight; this.scale = Math.min(cW / w, cH / h, 1)
    this.pan.x = (cW - w * this.scale) / 2 - minX * this.scale + p * this.scale; this.pan.y = (cH - h * this.scale) / 2 - minY * this.scale + p * this.scale
    this.updateTransform()
  }

  private updateTransform() { this.content.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.scale})` }

  private render() {
    if (!this.data) return; removeAllChildren(this.content)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "canvas-edges")
    const canvasId = Math.random().toString(36).substring(2, 7)
    svg.style.position = "absolute"; svg.style.top = "0"; svg.style.left = "0"; svg.style.width = "100%"; svg.style.height = "100%"; svg.style.overflow = "visible"; svg.style.pointerEvents = "none"
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker"); marker.id = `arrowhead-${canvasId}`
    marker.setAttribute("markerWidth", "10"); marker.setAttribute("markerHeight", "7"); marker.setAttribute("refX", "10"); marker.setAttribute("refY", "3.5"); marker.setAttribute("orient", "auto-start-reverse")
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon"); poly.setAttribute("points", "0 0, 10 3.5, 0 7"); poly.setAttribute("fill", "#999")
    marker.appendChild(poly); defs.appendChild(marker); svg.appendChild(defs); this.content.appendChild(svg)

    for (const edge of this.data.edges) {
      const from = this.data.nodes.find(n => n.id === edge.fromNode); const to = this.data.nodes.find(n => n.id === edge.toNode); if (!from || !to) continue
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      const start = this.getSidePos(from, edge.fromSide || "right"); const end = this.getSidePos(to, edge.toSide || "left")
      const dx = Math.abs(end.x - start.x); const dy = Math.abs(end.y - start.y); const off = Math.max(40, Math.min(Math.sqrt(dx * dx + dy * dy) * 0.4, 120))
      const cp1 = { x: start.x, y: start.y }; const cp2 = { x: end.x, y: end.y }
      if (edge.fromSide === "left") cp1.x -= off; else if (edge.fromSide === "right") cp1.x += off; else if (edge.fromSide === "top") cp1.y -= off; else if (edge.fromSide === "bottom") cp1.y += off; else cp1.x += off
      if (edge.toSide === "left") cp2.x -= off; else if (edge.toSide === "right") cp2.x += off; else if (edge.toSide === "top") cp2.y -= off; else if (edge.toSide === "bottom") cp2.y += off; else cp2.x -= off
      path.setAttribute("d", `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`); path.setAttribute("fill", "none"); path.style.strokeWidth = "2"
      
      const drawStart = edge.fromEnd === "arrow"; const drawEnd = edge.toEnd !== "none"
      const col = this.getColor(edge.color)
      let markerUrl = `url(#arrowhead-${canvasId})`
      
      if (col) {
        path.style.stroke = col; const m = marker.cloneNode(true) as SVGMarkerElement; const id = `m-${edge.id}-${canvasId}`; m.id = id; m.querySelector("polygon")?.setAttribute("fill", col); defs.appendChild(m); markerUrl = `url(#${id})`
      } else { path.style.stroke = "#999" }
      
      if (drawStart) path.setAttribute("marker-start", markerUrl)
      if (drawEnd) path.setAttribute("marker-end", markerUrl)
      
      svg.appendChild(path)
      if (edge.label) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text"); t.setAttribute("x", ((start.x + end.x) / 2).toString()); t.setAttribute("y", ((start.y + end.y) / 2 - 8).toString()); t.setAttribute("text-anchor", "middle"); t.style.fontSize = "12px"; t.style.fill = col || "#999"; t.style.paintOrder = "stroke"; t.style.stroke = "var(--light)"; t.style.strokeWidth = "3px"; t.textContent = edge.label; svg.appendChild(t)
      }
    }

    for (const node of this.data.nodes) {
      const el = document.createElement("div"); el.className = `canvas-node node-${node.type}`; el.style.left = `${node.x}px`; el.style.top = `${node.y}px`; el.style.width = `${node.width}px`; el.style.height = `${node.height}px`
      const col = this.getColor(node.color); if (col) { el.style.borderColor = col; el.style.backgroundColor = `${col}15` } else { el.style.backgroundColor = "rgba(var(--light-rgb), 0.7)" }
      if (node.type === "text") { el.innerHTML = `<div class="text-content">${(node.text || "").replace(/\n/g, "<br>")}</div>` }
      else if (node.type === "file") {
        const ext = node.file?.split(".").pop()?.toLowerCase() || ""; const isImg = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)
        const fileUrl = this.resolveUrl(node.file)
        if (isImg) {
          const imgPath = this.rootPath + (node.file || "").replace(/\\/g, "/").replace(/^(public\/)+/, "").replace(/^\//, "")
          el.innerHTML = `<img src="${imgPath}" style="width:100%;height:100%;object-fit:contain;display:block;cursor:pointer;">`
          el.onclick = () => { if (fileUrl) window.location.href = fileUrl }
        } else {
          const iframeUrl = fileUrl + "?embed=true"
          el.innerHTML = `<iframe src="${iframeUrl}" style="width:100%;height:100%;border:none;background:transparent;"></iframe>`
          const overlay = document.createElement("div"); Object.assign(overlay.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", zIndex: "1", cursor: "pointer" })
          el.appendChild(overlay)
          overlay.onclick = () => { window.location.href = fileUrl }
          overlay.onwheel = (e) => {
            e.preventDefault(); e.stopPropagation()
            const iframe = el.querySelector("iframe"); if (iframe?.contentWindow) iframe.contentWindow.scrollBy(0, e.deltaY)
          }
        }
      } else if (node.type === "group") { el.innerHTML = `<div class="node-label">${node.label || ""}</div>` }
      else if (node.type === "link") { el.innerHTML = `<a href="${node.link}" target="_blank">${node.link}</a>` }
      this.content.appendChild(el)
    }
  }

  private getSidePos(node: CanvasNode, s: string) {
    if (s === "top") return { x: node.x + node.width / 2, y: node.y }
    if (s === "bottom") return { x: node.x + node.width / 2, y: node.y + node.height }
    if (s === "left") return { x: node.x, y: node.y + node.height / 2 }
    return { x: node.x + node.width, y: node.y + node.height / 2 }
  }
}

document.addEventListener("nav", () => {
  const embeds = document.querySelectorAll(".canvas-embed"); embeds.forEach((el) => { const s = el.getAttribute("data-src"); if (s) new CanvasRenderer(el as HTMLElement, s) })
})
