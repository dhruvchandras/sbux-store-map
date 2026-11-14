"use strict";
const rows = [...window.LOCATIONS, ...window.REGIONAL];
const sources = {...window.SOURCES, ...Object.fromEntries(window.REGIONAL_SOURCES.map(s => [s.company, s]))};
const byBrand = new Map();
for (const row of rows) {
  if (!byBrand.has(row[0])) byBrand.set(row[0], []);
  byBrand.get(row[0]).push(row);
}
const brands = [...byBrand.keys()].sort((a,b) => byBrand.get(b).length - byBrand.get(a).length);
function sizeGroup(count) {
  if (count >= 1500) return "Large";
  if (count <= 200) return "Small";
  return "Medium";
}
const competitors = brands.filter(brand => brand !== "Starbucks");
const sections = [
  ["Reference company", ["Starbucks"]],
  ...["Large", "Medium", "Small"].map(size => [
    size, competitors.filter(brand => sizeGroup(byBrand.get(brand).length) === size)
  ])
];
const colors = {
  "Starbucks": "#176648",
  "McDonald's": "#FFC72C",
  "Dunkin'": "#DA1884",
  "Dutch Bros Coffee": "#2457A6",
  "7 Brew Coffee": "#512A89",
  "Scooter's Coffee": "#8F2419",
  "Einstein Bros. Bagels": "#9973CC",
  "Tim Hortons": "#E24B14",
  "BIGGBY Coffee": "#AA5521",
  "Caribou Coffee": "#548FC4",
  "Krispy Kreme": "#523322",
  "Peet's Coffee": "#28344F",
  "Black Rock Coffee Bar": "#605DC2"
};
for (const brand of competitors) {
  if (sizeGroup(byBrand.get(brand).length) === "Small") colors[brand] = "#626262";
}
const selected = new Set(brands);
const get = id => document.getElementById(id);
const format = n => n.toLocaleString("en-US");
function make(tag, content, className) {
  const el = document.createElement(tag);
  if (content !== null) el.textContent = content;
  if (className) el.className = className;
  return el;
}
function renderGroups() {
  const groups = get("groups");
  groups.replaceChildren();
  const query = get("search").value.toLowerCase().trim();
  for (const [title, list] of sections) {
    const matching = list.filter(b => b.toLowerCase().includes(query));
    if (!matching.length) continue;
    const group = make("section",null,"group");
    const heading = make("h3",title);
    group.append(heading);
    let groupToggle;
    function syncGroupToggle() {
      if (!groupToggle) return;
      const count = list.filter(brand => selected.has(brand)).length;
      groupToggle.checked = count === list.length;
      groupToggle.indeterminate = count > 0 && count < list.length;
    }
    if (title === "Medium" || title === "Small") {
      const label = make("label","All","group-toggle");
      groupToggle = make("input",null);
      groupToggle.type = "checkbox";
      groupToggle.setAttribute("aria-label","All " + title + " competitors");
      label.append(groupToggle);
      heading.append(label);
      syncGroupToggle();
      groupToggle.onchange = () => {
        const show = groupToggle.checked;
        for (const brand of list) {
          if (show) selected.add(brand); else selected.delete(brand);
        }
        for (const button of group.querySelectorAll(".brand")) {
          button.setAttribute("aria-checked",show);
        }
        syncGroupToggle();
        updateMap();
      };
    }
    for (const brand of matching) {
      const button = make("button",null,"brand");
      button.setAttribute("role","switch");
      button.setAttribute("aria-label",brand);
      button.setAttribute("aria-checked",selected.has(brand));
      button.style.setProperty("--ink",colors[brand]);
      button.append(make("span",null,"swatch"),make("strong",brand),make("span",format(byBrand.get(brand).length),"count"),make("span",null,"switch"));
      button.onclick = () => {
        if (selected.has(brand)) selected.delete(brand); else selected.add(brand);
        button.setAttribute("aria-checked",selected.has(brand));
        syncGroupToggle();
        updateMap();
      };
      group.append(button);
    }
    groups.append(group);
  }
  if (!groups.children.length) groups.append(make("p","No companies match your search.","empty"));
}
function updateMap() {
  const activeRows = rows.filter(r => selected.has(r[0]));
  window.atlasMap.setData(activeRows,colors);
  get("map-sub").textContent = format(activeRows.length) + " locations \u00b7 " + selected.size + (selected.size === 1 ? " company" : " companies");
  get("selected").textContent = selected.size + " of " + brands.length + " selected";
  get("toggleAll").textContent = selected.size === brands.length ? "Clear all" : "Select all";
}
get("toggleAll").onclick = () => {
  if (selected.size === brands.length) selected.clear(); else brands.forEach(b => selected.add(b));
  renderGroups(); updateMap();
};
get("search").oninput = renderGroups;
get("zoomIn").onclick = () => atlasMap.zoomBy(1.8);
get("zoomOut").onclick = () => atlasMap.zoomBy(1/1.8);
get("reset").onclick = () => atlasMap.reset();
get("mobileLayers").onclick = () => {
  const open = get("sidebar").classList.toggle("open");
  get("mobileLayers").setAttribute("aria-expanded",open);
  get("mobileLayers").textContent = open ? "Close layers" : "Company layers";
};
get("mobileLayers").setAttribute("aria-expanded","false");
get("mobileLayers").setAttribute("aria-controls","sidebar");
const details = get("details");
details.append(make("p",format(rows.length) + " geocoded listings across " + brands.length + " coffee and restaurant chains in the 50 states and Washington, DC. Store openings, closures, and licensed counters can differ from these directory snapshots."));
details.append(make("h3","How companies are grouped"),make("p","Groups use mapped U.S. store counts. Large chains have 1,500 or more stores, Medium chains have 201–1,499, and Small chains have 200 or fewer. Starbucks has its own reference layer."));
details.append(make("h3","Store directories"));
const list = make("ul");
for (const brand of brands) {
  const s = sources[brand];
  const item = make("li");
  const link = make("a",brand);
  link.href = s.url; link.target = "_blank"; link.rel = "noopener";
  item.append(link,document.createTextNode(" \u00b7 " + s.label + " \u00b7 " + s.date));
  list.append(item);
}
details.append(list,make("h3","Map geography"),make("p","State boundaries from the U.S. Census Bureau. Surrounding geography from Natural Earth. Alaska and Hawaii are shown as insets."));
get("about").onclick = () => get("dialog").showModal();
get("closeDialog").onclick = () => get("dialog").close();
get("dialog").onclick = e => { if (e.target === get("dialog") && (e.clientX < e.target.getBoundingClientRect().left || e.clientX > e.target.getBoundingClientRect().right || e.clientY < e.target.getBoundingClientRect().top || e.clientY > e.target.getBoundingClientRect().bottom)) e.target.close(); };
renderGroups();
updateMap();
