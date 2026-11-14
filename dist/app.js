"use strict";
const rows = [...window.LOCATIONS, ...window.REGIONAL];
const sources = {...window.SOURCES, ...Object.fromEntries(window.REGIONAL_SOURCES.map(s => [s.company, s]))};
const byBrand = new Map();
for (const row of rows) {
  if (!byBrand.has(row[0])) byBrand.set(row[0], []);
  byBrand.get(row[0]).push(row);
}
const brands = [...byBrand.keys()].sort((a,b) => byBrand.get(b).length - byBrand.get(a).length);
const footprint = brand => new Set(byBrand.get(brand).map(row => row[5])).size;
const sections = [
  ["Reference company", ["Starbucks"]],
  ["National competitors", brands.filter(b => b !== "Starbucks" && footprint(b) >= 25)],
  ["Regional competitors", brands.filter(b => b !== "Starbucks" && footprint(b) < 25)]
];
const colors = {"Starbucks":"#176648","Dunkin'":"#e67932","Dutch Bros Coffee":"#286d9e","7 Brew Coffee":"#ae4359","Scooter's Coffee":"#af5249","Krispy Kreme":"#839134","Einstein Bros. Bagels":"#8060a1"};
const palette = ["#72623c","#20847f","#a24c73","#8c6b9b","#617c43","#b16730","#637ba0","#975757","#44848b","#9a782f","#5b7694","#965283","#53866d","#936343","#727390","#677745","#9e6661","#407586","#805b78"];
let nextColor = 0;
for (const b of brands) if (!colors[b]) colors[b] = palette[nextColor++ % palette.length];
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
    group.append(make("h3",title));
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
  get("map-sub").textContent = format(activeRows.length) + " locations · " + selected.size + (selected.size === 1 ? " company" : " companies");
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
details.append(make("p",format(rows.length) + " geocoded listings across " + brands.length + " coffee, doughnut, and bagel chains in the 50 states and Washington, DC. Store openings, closures, and licensed counters can differ from these directory snapshots."));
details.append(make("h3","How companies are grouped"),make("p","National competitors have mapped stores in at least 25 states or DC. Regional competitors have a smaller mapped footprint. Starbucks has its own reference layer."));
details.append(make("h3","Store directories"));
const list = make("ul");
for (const brand of brands) {
  const s = sources[brand];
  const item = make("li");
  const link = make("a",brand);
  link.href = s.url; link.target = "_blank"; link.rel = "noopener";
  item.append(link,document.createTextNode(" · " + s.label + " · " + s.date));
  list.append(item);
}
details.append(list,make("h3","Map geography"),make("p","State boundaries from the U.S. Census Bureau. Surrounding geography from Natural Earth. Alaska and Hawaii are shown as insets."));
get("about").onclick = () => get("dialog").showModal();
get("closeDialog").onclick = () => get("dialog").close();
get("dialog").onclick = e => { if (e.target === get("dialog") && (e.clientX < e.target.getBoundingClientRect().left || e.clientX > e.target.getBoundingClientRect().right || e.clientY < e.target.getBoundingClientRect().top || e.clientY > e.target.getBoundingClientRect().bottom)) e.target.close(); };
renderGroups();
updateMap();
