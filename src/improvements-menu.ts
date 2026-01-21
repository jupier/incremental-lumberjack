import * as d3 from "d3";
import { ImprovementCategory } from "./improvements";

export interface Improvement {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  requires?: string; // ID of required improvement
  repeatable?: boolean;
  level?: number; // only meaningful when repeatable === true
  category: ImprovementCategory;
  tier: number;
}

// Category configuration: colors and display names
const CATEGORY_CONFIG: Partial<Record<
  ImprovementCategory,
  { color: string; name: string }
>> = {
  axe: { color: "#e74c3c", name: "Axe" },
  cursor: { color: "#f1c40f", name: "Cursor" },
  map: { color: "#2ecc71", name: "Map" },
};

// Helper function to get category config with defaults
function getCategoryConfig(category: ImprovementCategory): { color: string; name: string } {
  return CATEGORY_CONFIG[category] ?? {
    color: "#ffffff", // Default white
    name: category.charAt(0).toUpperCase() + category.slice(1), // Capitalize category name
  };
}

interface TreeNodeData {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  repeatable?: boolean;
  level?: number;
  tier: number;
  locked: boolean;
  category?: ImprovementCategory;
  children?: TreeNodeData[];
}

export function createImprovementsMenu(
  improvements: Improvement[],
  onPurchase: (improvementId: string) => void,
  hasImprovement?: (improvementId: string) => boolean,
  cursorContainer?: { container: any; hide?: () => void; show?: () => void },
  onStartRound?: () => void
): {
  show: () => void;
  hide: () => void;
  update: (improvements: Improvement[]) => void;
  destroy: () => void;
} {
  // Create modal container
  const modal = document.createElement("div");
  modal.id = "improvements-modal";
  modal.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    overflow: auto;
    cursor: default !important;
  `;

  // Create modal content
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    position: relative;
    background-color: #1a1a1a;
    margin: 20px auto;
    padding: 20px;
    border: 3px solid #4169e1;
    border-radius: 8px;
    max-width: 95%;
    max-height: 90vh;
    overflow: auto;
    color: white;
    font-family: Arial, sans-serif;
    cursor: default !important;
  `;

  // Create title
  const title = document.createElement("h2");
  title.textContent = "Improvements";
  title.style.cssText = `
    text-align: center;
    margin: 0 0 20px 0;
    color: white;
    font-size: 24px;
    font-weight: bold;
  `;
  modalContent.appendChild(title);

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
    width: 40px;
    height: 40px;
    line-height: 40px;
    padding: 0;
  `;
  closeBtn.onclick = () => hide();
  modalContent.appendChild(closeBtn);

  // Create tree container
  const treeContainer = document.createElement("div");
  treeContainer.id = "improvements-tree";
  treeContainer.style.cssText = `
    min-height: 400px;
    position: relative;
  `;
  modalContent.appendChild(treeContainer);

  // Create Start Round button (only show if onStartRound callback is provided)
  let startRoundBtn: HTMLButtonElement | null = null;
  if (onStartRound) {
    startRoundBtn = document.createElement("button");
    startRoundBtn.textContent = "Start Round";
    startRoundBtn.style.cssText = `
      display: block;
      margin: 20px auto 0;
      padding: 15px 40px;
      background-color: #4169e1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s;
    `;
    startRoundBtn.onmouseenter = () => {
      if (startRoundBtn) startRoundBtn.style.backgroundColor = "#5a7ff0";
    };
    startRoundBtn.onmouseleave = () => {
      if (startRoundBtn) startRoundBtn.style.backgroundColor = "#4169e1";
    };
    startRoundBtn.onclick = () => {
      if (onStartRound) {
        onStartRound();
        hide();
      }
    };
    modalContent.appendChild(startRoundBtn);
  }

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) {
      hide();
    }
  };

  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && modal.style.display !== "none") {
      hide();
    }
  };
  window.addEventListener("keydown", handleEscape);

  // Build tree data structure from all improvements with a common root
  function buildTreeData(
    allImprovements: Improvement[],
    hasImprovement?: (id: string) => boolean
  ): TreeNodeData | null {
    if (allImprovements.length === 0) return null;

    const allNodes = new Map<string, TreeNodeData>();

    // Create all nodes
    allImprovements.forEach(imp => {
      allNodes.set(imp.id, {
        id: imp.id,
        name: imp.name,
        description: imp.description,
        cost: imp.cost,
        purchased: imp.purchased,
        repeatable: imp.repeatable,
        level: imp.level ?? 0,
        tier: imp.tier,
        locked: imp.requires ? !(hasImprovement && hasImprovement(imp.requires)) : false,
        category: imp.category,
        children: [],
      });
    });

    // Build parent-child relationships
    allImprovements.forEach(imp => {
      if (imp.requires) {
        const parent = allNodes.get(imp.requires);
        const child = allNodes.get(imp.id);
        if (parent && child) {
          if (!parent.children) parent.children = [];
          parent.children.push(child);
        }
      }
    });

    // Find root nodes (improvements with no requirements)
    const roots = allImprovements.filter(imp => !imp.requires);

    // Create a common root node that connects to all root improvements
    return {
      id: "root",
      name: "Core",
      description: "Starting point for all improvements",
      cost: 0,
      purchased: true,
      tier: 0,
      locked: false,
      category: "axe" as ImprovementCategory, // Default category for root
      children: roots.map(r => allNodes.get(r.id)!).filter(Boolean),
    };
  }

  // Render tree using D3.js
  function renderTreeWithD3(
    treeData: TreeNodeData,
    container: HTMLElement,
    onPurchase: (id: string) => void
  ) {
    // Clear container
    container.innerHTML = "";

    // Create SVG container
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };
    const width = Math.max(800, container.clientWidth - margin.left - margin.right);
    const height = Math.max(400, treeData.children?.length ? treeData.children.length * 100 : 400);

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background-color", "transparent");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build D3 hierarchy
    const root = d3.hierarchy(treeData, d => d.children);
    
    // Create tree layout
    const treeLayout = d3.tree<TreeNodeData>()
      .size([height, width - 200])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5) / a.depth);

    treeLayout(root);

    // Draw links (edges) with category-based colors
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .attr("fill", "none")
      .attr("stroke", d => {
        const targetData = d.target.data as TreeNodeData;
        const category = targetData.category;
        return category ? getCategoryConfig(category).color : "#4169e1";
      })
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Draw nodes
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Node circles
    nodes.append("circle")
      .attr("r", d => {
        const data = d.data as TreeNodeData;
        return data.id === "root" ? 30 : 25;
      })
      .attr("fill", d => {
        const data = d.data as TreeNodeData;
        if (data.id === "root") return "#1f1f1f";
        if (data.locked) return "#333";
        if (data.purchased) return "#2a4a2a";
        return "#1f1f1f";
      })
      .attr("stroke", d => {
        const data = d.data as TreeNodeData;
        if (data.id === "root") return "#4169e1";
        if (data.locked) return "#666";
        if (data.purchased) return "#4a8a4a";
        const category = data.category;
        return category ? getCategoryConfig(category).color : "#4169e1";
      })
      .attr("stroke-width", d => {
        const data = d.data as TreeNodeData;
        if (data.id === "root") return 5;
        return data.tier === 0 ? 4 : 3;
      })
      .style("cursor", d => {
        const data = d.data as TreeNodeData;
        return data.locked ? "not-allowed" : "pointer";
      })
      .attr("data-cursor", d => (d.data as TreeNodeData).locked ? "not-allowed" : "pointer")
      .on("mouseenter", function(_event, d) {
        const data = d.data as TreeNodeData;
        if (!data.locked && data.id !== "root") {
          const category = data.category;
          const color = category ? getCategoryConfig(category).color : "#4169e1";
          d3.select(this)
            .attr("r", 30)
            .style("filter", `drop-shadow(0 0 10px ${color})`);
        }
      })
      .on("mouseleave", function(_event, d) {
        const data = d.data as TreeNodeData;
        const baseRadius = data.id === "root" ? 30 : 25;
        d3.select(this)
          .attr("r", baseRadius)
          .style("filter", "none");
      })
      .on("click", function(_event, d) {
        const data = d.data as TreeNodeData;
        if (!data.locked && (!data.purchased || data.repeatable)) {
          onPurchase(data.id);
        }
      });

    // Node labels
    nodes.append("text")
      .attr("dy", ".35em")
      .attr("x", d => (d.children ? -35 : 35))
      .attr("text-anchor", d => (d.children ? "end" : "start"))
      .attr("fill", d => {
        const data = d.data as TreeNodeData;
        return data.locked ? "#666" : "white";
      })
      .attr("font-size", "12px")
      .attr("font-family", "Arial, sans-serif")
      .text(d => {
        const data = d.data as TreeNodeData;
        return data.name;
      });

    // Cost/Level info below node name
    nodes.append("text")
      .attr("dy", "1.5em")
      .attr("x", d => (d.children ? -35 : 35))
      .attr("text-anchor", d => (d.children ? "end" : "start"))
      .attr("fill", d => {
        const data = d.data as TreeNodeData;
        return data.locked ? "#666" : "#aaa";
      })
      .attr("font-size", "10px")
      .attr("font-family", "Arial, sans-serif")
      .text(d => {
        const data = d.data as TreeNodeData;
        if (data.repeatable && data.level !== undefined) {
          return `L${data.level} - ${data.cost}`;
        } else if (!data.purchased) {
          return `${data.cost}`;
        } else {
          return "✓";
        }
      });

    // Tooltips
    nodes.append("title")
      .text(d => {
        const data = d.data as TreeNodeData;
        return `${data.name}\n${data.description}\nCost: ${data.cost}`;
      });
  }

  // Build and render single unified tree
  function buildTree() {
    treeContainer.innerHTML = "";

    // Build single tree from all improvements
    const treeData = buildTreeData(improvements, hasImprovement);
    if (treeData) {
      const treeDiv = document.createElement("div");
      treeDiv.style.cssText = "width: 100%; overflow: auto;";
      treeContainer.appendChild(treeDiv);
      renderTreeWithD3(treeData, treeDiv, onPurchase);
    }
  }

  function show() {
    modal.style.display = "block";
    buildTree();
    
    // Hide custom cursor container if provided
    if (cursorContainer?.container) {
      cursorContainer.container.visible = false;
    }
    
    // Show standard cursor when menu is open - use !important to override
    // But allow pointer cursor on clickable elements
    const style = document.createElement("style");
    style.id = "improvements-menu-cursor-style";
    style.textContent = `
      html, body, canvas, #improvements-modal, #improvements-modal * {
        cursor: default !important;
      }
      #improvements-modal svg circle[data-cursor="pointer"]:hover,
      #improvements-modal svg circle[data-cursor="pointer"] {
        cursor: pointer !important;
      }
      #improvements-modal svg circle[data-cursor="not-allowed"] {
        cursor: not-allowed !important;
      }
    `;
    document.head.appendChild(style);
  }

  function hide() {
    modal.style.display = "none";
    
    // Show custom cursor container again if provided
    if (cursorContainer?.container) {
      cursorContainer.container.visible = true;
    }
    
    // Remove the cursor override style
    const style = document.getElementById("improvements-menu-cursor-style");
    if (style) {
      document.head.removeChild(style);
    }
  }

  function update(newImprovements: Improvement[]) {
    improvements = newImprovements;
    if (modal.style.display !== "none") {
      buildTree();
    }
  }

  function destroy() {
    window.removeEventListener("keydown", handleEscape);
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  }

  return { show, hide, update, destroy };
}
