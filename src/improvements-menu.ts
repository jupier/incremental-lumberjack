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
  onStartRound?: () => void,
  getWoodCount?: () => number
): {
  show: () => void;
  hide: () => void;
  update: (improvements: Improvement[]) => void;
  updateWoodCount: (count: number) => void;
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

  // Create modal content - allow it to expand and be scrollable
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    position: relative;
    background-color: #1a1a1a;
    margin: 20px auto;
    padding: 20px;
    border: 3px solid #4169e1;
    border-radius: 8px;
    max-width: 98%;
    min-width: 800px;
    width: fit-content;
    max-height: 95vh;
    overflow-y: auto;
    overflow-x: auto;
    color: white;
    font-family: Arial, sans-serif;
    cursor: default !important;
  `;

  // Create title with wood count
  const titleContainer = document.createElement("div");
  titleContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 0 20px 0;
  `;
  
  const title = document.createElement("h2");
  title.textContent = "Improvements";
  title.style.cssText = `
    margin: 0;
    color: white;
    font-size: 24px;
    font-weight: bold;
    flex: 1;
    text-align: center;
  `;
  titleContainer.appendChild(title);
  
  // Create wood count display
  const woodCountDisplay = document.createElement("div");
  woodCountDisplay.id = "improvements-wood-count";
  woodCountDisplay.style.cssText = `
    background-color: #2a4a2a;
    border: 2px solid #4a8a4a;
    border-radius: 8px;
    padding: 10px 20px;
    color: white;
    font-size: 18px;
    font-weight: bold;
    font-family: Arial, sans-serif;
    min-width: 120px;
    text-align: center;
  `;
  
  const updateWoodCountDisplay = () => {
    const woodCount = getWoodCount ? getWoodCount() : 0;
    woodCountDisplay.textContent = `Wood: ${woodCount}`;
  };
  
  updateWoodCountDisplay();
  titleContainer.appendChild(woodCountDisplay);
  modalContent.appendChild(titleContainer);

  // Close button removed - menu can only be closed via Start Round button

  // Create zoom controls (will be added after tree container)
  const zoomControls = document.createElement("div");
  zoomControls.id = "zoom-controls";
  zoomControls.style.cssText = `
    position: absolute;
    top: 60px;
    right: 30px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10001;
  `;
  
  const createZoomButton = (text: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 12px;
      background-color: #4169e1;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;
    btn.onmouseenter = () => {
      btn.style.backgroundColor = "#5a7ff0";
    };
    btn.onmouseleave = () => {
      btn.style.backgroundColor = "#4169e1";
    };
    btn.onclick = onClick;
    return btn;
  };
  
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  let svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  let currentZoomTransform: d3.ZoomTransform = d3.zoomIdentity;
  let savedScrollPosition = { top: 0, left: 0 };
  
  const zoomIn = () => {
    if (zoomBehavior && svgElement) {
      svgElement.transition().duration(200).call(zoomBehavior.scaleBy, 1.5);
    }
  };
  
  const zoomOut = () => {
    if (zoomBehavior && svgElement) {
      svgElement.transition().duration(200).call(zoomBehavior.scaleBy, 1 / 1.5);
    }
  };
  
  const resetZoom = () => {
    if (zoomBehavior && svgElement) {
      svgElement.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
    }
  };
  
  zoomControls.appendChild(createZoomButton("+", zoomIn));
  zoomControls.appendChild(createZoomButton("−", zoomOut));
  zoomControls.appendChild(createZoomButton("Reset", resetZoom));
  
  // Create tree container with scrolling
  const treeContainer = document.createElement("div");
  treeContainer.id = "improvements-tree";
  treeContainer.style.cssText = `
    min-height: 400px;
    position: relative;
    overflow: auto;
    width: 100%;
    max-height: 70vh;
  `;
  modalContent.appendChild(treeContainer);
  // Add zoom controls after tree container so they appear on top
  modalContent.appendChild(zoomControls);

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

  // Prevent closing on background click - menu can only be closed via Start Round button
  modal.onclick = (e) => {
    // Prevent closing - do nothing
    e.stopPropagation();
  };

  // Prevent closing on Escape key - menu can only be closed via Start Round button
  // (No escape handler needed)

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

    // Calculate tree dimensions based on number of nodes
    const countNodes = (node: TreeNodeData): number => {
      let count = 1;
      if (node.children) {
        node.children.forEach(child => {
          count += countNodes(child);
        });
      }
      return count;
    };
    
    const nodeCount = countNodes(treeData);
    const maxDepth = (node: TreeNodeData, depth = 0): number => {
      if (!node.children || node.children.length === 0) return depth;
      return Math.max(...node.children.map(child => maxDepth(child, depth + 1)));
    };
    const treeDepth = maxDepth(treeData);
    
    // Create SVG container with better sizing
    const margin = { top: 40, right: 200, bottom: 40, left: 200 };
    // Calculate width based on depth (horizontal spacing)
    const nodeWidth = 250; // Horizontal spacing between levels
    const width = Math.max(1200, treeDepth * nodeWidth);
    // Calculate height based on nodes (vertical spacing)
    const nodeHeight = 120; // Vertical spacing between nodes
    const height = Math.max(600, nodeCount * nodeHeight);

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background-color", "transparent");

    // Create a container group for zoom/pan transformations
    const g = svg.append("g")
      .attr("class", "zoom-container")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3]) // Allow zoom from 30% to 300%
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString() + ` translate(${margin.left},${margin.top})`);
        currentZoomTransform = event.transform;
      });
    
    // Store zoom behavior and SVG for button controls
    zoomBehavior = zoom;
    svgElement = svg;
    
    // Apply zoom to SVG and restore previous zoom state if available
    svg.call(zoom);
    if (currentZoomTransform !== d3.zoomIdentity) {
      // Restore previous zoom/pan state
      svg.call(zoom.transform, currentZoomTransform);
    }

    // Build D3 hierarchy
    const root = d3.hierarchy(treeData, d => d.children);
    
    // Create tree layout with better separation
    const treeLayout = d3.tree<TreeNodeData>()
      .size([height, width])
      .separation((a, b) => {
        // Better separation to prevent overlap
        if (a.parent === b.parent) {
          return 1.2; // Siblings need more space
        }
        return 1.5; // Different parents
      });

    treeLayout(root);

    // Draw links (edges) FIRST so they appear behind nodes
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
      .attr("opacity", 0.4)
      .lower(); // Ensure links are behind nodes

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

    // Create background rectangles for text to ensure visibility
    nodes.append("rect")
      .attr("x", d => {
        const data = d.data as TreeNodeData;
        if (data.id === "root") return -60;
        return d.children ? -80 : 40;
      })
      .attr("y", -15)
      .attr("width", d => {
        const data = d.data as TreeNodeData;
        const nameLength = data.name.length;
        return Math.max(120, nameLength * 7);
      })
      .attr("height", 35)
      .attr("fill", "#1a1a1a")
      .attr("fill-opacity", 0.9)
      .attr("stroke", "none")
      .lower(); // Behind text but above links
    
    // Node labels with better positioning
    nodes.append("text")
      .attr("dy", ".35em")
      .attr("x", d => {
        const data = d.data as TreeNodeData;
        if (data.id === "root") return 0;
        return d.children ? -45 : 45;
      })
      .attr("text-anchor", d => (d.children ? "end" : "start"))
      .attr("fill", d => {
        const data = d.data as TreeNodeData;
        return data.locked ? "#666" : "white";
      })
      .attr("font-size", "13px")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none") // Allow clicks to pass through to circle
      .text(d => {
        const data = d.data as TreeNodeData;
        return data.name;
      })
      .raise(); // Ensure text is on top

    // Cost/Level info below node name
    nodes.append("text")
      .attr("dy", "1.5em")
      .attr("x", d => {
        const data = d.data as TreeNodeData;
        if (data.id === "root") return 0;
        return d.children ? -45 : 45;
      })
      .attr("text-anchor", d => (d.children ? "end" : "start"))
      .attr("fill", d => {
        const data = d.data as TreeNodeData;
        return data.locked ? "#666" : "#aaa";
      })
      .attr("font-size", "11px")
      .attr("font-family", "Arial, sans-serif")
      .attr("pointer-events", "none") // Allow clicks to pass through to circle
      .text(d => {
        const data = d.data as TreeNodeData;
        if (data.repeatable && data.level !== undefined) {
          return `L${data.level} - ${data.cost}`;
        } else if (!data.purchased) {
          return `${data.cost}`;
        } else {
          return "✓";
        }
      })
      .raise(); // Ensure text is on top

    // Tooltips
    nodes.append("title")
      .text(d => {
        const data = d.data as TreeNodeData;
        return `${data.name}\n${data.description}\nCost: ${data.cost}`;
      });
  }

  // Build and render single unified tree
  function buildTree() {
    // Save current scroll position before clearing
    savedScrollPosition = {
      top: treeContainer.scrollTop,
      left: treeContainer.scrollLeft
    };
    
    treeContainer.innerHTML = "";
    
    // Build single tree from all improvements
    const treeData = buildTreeData(improvements, hasImprovement);
    if (treeData) {
      // Create a wrapper div that allows the SVG to expand beyond viewport
      const treeDiv = document.createElement("div");
      treeDiv.style.cssText = "width: 100%; min-width: 100%; overflow: visible;";
      treeContainer.appendChild(treeDiv);
      renderTreeWithD3(treeData, treeDiv, onPurchase);
      
      // Restore scroll position after a brief delay to allow rendering
      setTimeout(() => {
        treeContainer.scrollTop = savedScrollPosition.top;
        treeContainer.scrollLeft = savedScrollPosition.left;
      }, 10);
    }
  }

  function show() {
    modal.style.display = "block";
    updateWoodCountDisplay(); // Update wood count when menu is shown
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
  
  function updateWoodCount(count: number) {
    woodCountDisplay.textContent = `Wood: ${count}`;
  }

  function destroy() {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
  }

  return { show, hide, update, updateWoodCount, destroy };
}
