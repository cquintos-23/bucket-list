const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#0A2571");

const color = d3.scaleOrdinal()
  .domain(["Adventure", "Skill", "Project", "Experience"])
  .range(["#758BFD", "#09BC8A", "#E71968", "#FEE440"]);

d3.csv("BucketList.csv").then(data => {
  const nodes = data.map(d => ({
    name: (() => {
      const place = d["Place or Region"]?.trim();
      const activity = d.Activity?.trim();
      if (place && activity) return `${place} — ${activity}`;
      else if (place) return place;
      else if (activity) return activity;
      else return "Unnamed";
    })(),
    category: d.Category || null,
    continent: d.Continent || null,
    country: d.Country || null,
    topics: d.Topics || null,
    completed: d.Completed === "yes"
  }));

  const categoryHubs = [...new Set(nodes.map(d => d.category).filter(Boolean))].map(cat => ({
    id: `hub-category-${cat}`,
    isHub: true,
    hubType: "category",
    category: cat,
    name: cat
  }));

  const continentHubs = [...new Set(nodes.map(d => d.continent).filter(Boolean))].map(cont => ({
    id: `hub-continent-${cont}`,
    isHub: true,
    hubType: "continent",
    continent: cont,
    name: cont
  }));

  const topicHubs = [...new Set(nodes.map(d => d.topics).filter(Boolean))].map(top => ({
    id: `hub-topics-${top}`,
    isHub: true,
    hubType: "topics",
    topics: top,
    name: top
  }));

  const countryHubs = [...new Set(nodes.map(d => d.country).filter(Boolean))].map(country => ({
    id: `hub-country-${country}`,
    isHub: true,
    hubType: "country",
    country: country,
    name: country
  }));

  const allHubs = [...categoryHubs, ...continentHubs, ...topicHubs, ...countryHubs];

// Combine nodes + hubs
const allNodes = [...nodes, ...allHubs];


const links = [];

// Find the "Adventure" category hub
const adventureHub = categoryHubs.find(h => h.category === "adventure");

if (adventureHub) {
  continentHubs.forEach(contHub => {
    links.push({
      source: contHub,
      target: adventureHub
    });
  });
} else {
  console.warn("Adventure category hub not found");
}



// Link nodes to hubs
nodes.forEach(d => {
  const topicHub = topicHubs.find(h => h.topics === d.topics);
  const continentHub = continentHubs.find(h => h.continent === d.continent);
  const countryHub = countryHubs.find(h => h.country === d.country);
  const categoryHub = categoryHubs.find(h => h.category === d.category);

  if (topicHub) links.push({ source: d, target: topicHub });
  if (countryHub) links.push({ source: d, target: countryHub });
  if (continentHub && !(countryHub && topicHub)) links.push({ source: d, target: continentHub });
  if (!topicHub && !countryHub && !continentHub && categoryHub) links.push({ source: d, target: categoryHub });
});

const specificCategories = ["project", "skill", "experience"];

nodes.forEach(node => {
  if (!node.isHub && specificCategories.includes(node.category)) {
    const catHub = categoryHubs.find(h => h.category === node.category);
    if (catHub) {
      links.push({
        source: node,
        target: catHub
      });
    }
  }
});

countryHubs.forEach(countryHub => {
  const exampleNode = nodes.find(n => n.country === countryHub.country && n.continent);
  if (exampleNode) {
    const continentHub = continentHubs.find(h => h.continent === exampleNode.continent);
    if (continentHub) {
      links.push({
        source: countryHub,
        target: continentHub
      });
    }
  }
});


  const simulation = d3.forceSimulation(allNodes)
    .force("link", d3.forceLink(links).distance(80).strength(0.4))
    .force("charge", d3.forceManyBody().strength(-10))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => d.isHub ? 40 : 16))
    .force("x", d3.forceX(d => {
      if (d.isHub && d.hubType === "category") {
        return d.category === "Adventure" ? width * 0.1 :
               d.category === "skill" ? width * 0.3 :
               d.category === "project" ? width * 0.6 :
               d.category === "experience" ? width * 0.9 :
               width / 2;
      }
      return width / 2;
    }).strength(0.1))
    .force("y", d3.forceY(height / 2).strength(0.7));

  const linkLines = svg.selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6);

  const circles = svg.selectAll("circle")
  .data(allNodes)
  .enter()
  .append("circle")
  .attr("r", d => d.isHub ? 6 : 10)
  .attr("fill", d => {
    if (!d.isHub) return color(d.category);
    if (d.hubType === "category") return "#000000";
    if (d.hubType === "continent") return "#86B63E";
    if (d.hubType === "country") return "#F7A1B9";
    if (d.hubType === "topics") return "#3BCBFF";
    return "#ffffff";
  })
  .attr("stroke", d => {
    if (d.isHub) return "#fff";
    // For regular nodes, stroke based on completion status
    return d.completed ? "#FF7700" : "none";
  })
  .attr("stroke-width", d => d.completed ? 2 : 0)
  .call(drag(simulation));

  const labels = svg.selectAll("text")
    .data(allNodes) // includes both nodes and hubs  
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -12)
    .text(d => d.name)
    .style("fill", "#fff")
    .style("opacity", 0);

  circles.on("mouseover", (event, d) => {
    labels.filter(l => l === d).style("opacity", 1);
  }).on("mouseout", (event, d) => {
    labels.filter(l => l === d).style("opacity", 0);
  });

  simulation.on("tick", () => {

    
    linkLines
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    circles
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.005).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {

        simulation.alphaTarget(0);
      });
  }
  
  
});
