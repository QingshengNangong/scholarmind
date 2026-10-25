import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ConceptGraphData, ConceptNode, ConceptLink } from '../types';

interface ConceptGraphProps {
  data: ConceptGraphData;
}

// Extend d3 types for simulation nodes
interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  // Fix: Explicitly add d3 simulation properties to satisfy TypeScript
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  relation: string;
  source: string | SimulationNode; // d3 modifies this to object after init
  target: string | SimulationNode;
}

const ConceptGraph: React.FC<ConceptGraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes.length || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 500;
    
    // Muted Earth Tones Palette
    const palette = ["#78716c", "#a8a29e", "#d6d3d1", "#57534e", "#44403c"];
    const color = d3.scaleOrdinal(palette);

    // Deep copy data to prevent D3 from mutating props which causes React strict mode issues
    const nodes: SimulationNode[] = data.nodes.map(d => ({ ...d }));
    const links: SimulationLink[] = data.links.map(d => ({ ...d }));

    // Clear previous render
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Zoom container
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<SimulationNode>(nodes)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links).id(d => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(45));

    // Arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#a8a29e");

    // Links
    const link = g.append("g")
      .selectAll("g")
      .data(links)
      .join("g");

    const linkPath = link.append("line")
      .attr("stroke", "#d6d3d1")
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    const linkLabel = link.append("text")
      .text(d => d.relation)
      .attr("font-size", 9)
      .attr("font-family", "Source Serif 4, serif")
      .attr("fill", "#78716c")
      .attr("text-anchor", "middle")
      .attr("dy", -6);

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", d => 18 + (d.group * 1.5)) 
      .attr("fill", "#fafaf9") // Light fill
      .attr("stroke", d => color(String(d.group)))
      .attr("stroke-width", 2);

    node.append("text")
      .text(d => d.id)
      .attr("x", 0)
      .attr("y", d => -25 - (d.group * 1.5))
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-family", "Source Serif 4, serif")
      .attr("font-weight", "500")
      .attr("fill", "#292524")
      .clone(true).lower()
      .attr("stroke", "#fafaf9")
      .attr("stroke-width", 4);

    simulation.on("tick", () => {
      linkPath
        .attr("x1", d => (d.source as SimulationNode).x!)
        .attr("y1", d => (d.source as SimulationNode).y!)
        .attr("x2", d => (d.target as SimulationNode).x!)
        .attr("y2", d => (d.target as SimulationNode).y!);

      linkLabel
        .attr("x", d => ((d.source as SimulationNode).x! + (d.target as SimulationNode).x!) / 2)
        .attr("y", d => ((d.source as SimulationNode).y! + (d.target as SimulationNode).y!) / 2);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, SimulationNode, unknown>, d: SimulationNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SimulationNode, unknown>, d: SimulationNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, SimulationNode, unknown>, d: SimulationNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="w-full h-[500px] bg-[#fafaf9] overflow-hidden">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
    </div>
  );
};

export default ConceptGraph;