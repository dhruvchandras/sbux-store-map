"use strict";
const companyCard = (() => {
  const card = document.createElement("section");
  card.className = "company-card";
  card.id = "company-card";
  card.hidden = true;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-labelledby", "profile-title");
  document.body.append(card);
  let active = null;
  let pinned = false;
  let timer;
  let returningFocus = false;

  function close(restoreFocus = false) {
    clearTimeout(timer);
    if (!active) return;
    const previous = active;
    previous.setAttribute("aria-expanded", "false");
    card.hidden = true;
    active = null;
    pinned = false;
    if (restoreFocus) {
      returningFocus = true;
      previous.focus({preventScroll:true});
      returningFocus = false;
    }
  }

  function scheduleClose() {
    clearTimeout(timer);
    if (!pinned) timer = setTimeout(() => {
      if (!card.matches(":hover") && !card.contains(document.activeElement)) close();
    }, 250);
  }

  function logo(profile) {
    const image = document.createElement("img");
    image.src = profile.logo;
    image.alt = "";
    return image;
  }

  function link(label, url) {
    const anchor = make("a",label);
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
  }

  function position() {
    if (!active) return;
    const anchor = active.getBoundingClientRect();
    const panel = card.getBoundingClientRect();
    const left = document.getElementById("sidebar").getBoundingClientRect().right + 6;
    card.style.left = Math.max(8, Math.min(left, innerWidth - panel.width - 8)) + "px";
    card.style.top = Math.max(8, Math.min(anchor.top - 12, innerHeight - panel.height - 8)) + "px";
  }

  function show(button, brand, count) {
    clearTimeout(timer);
    if (active === button) return;
    close();
    active = button;
    button.setAttribute("aria-expanded","true");
    const profile = window.PROFILES[brand];
    const title = make("h2",brand);
    title.id = "profile-title";
    const dismiss = make("button","×","profile-close");
    dismiss.setAttribute("aria-label","Close company facts");
    dismiss.onclick = () => close(true);
    const head = make("div",null,"profile-head");
    head.append(logo(profile),title,dismiss);
    const facts = make("dl",null,"profile-facts");
    for (const [label,value] of [
      ["U.S. stores on map",count.toLocaleString("en-US")],
      ["Founded",profile.founded], ["Headquarters",profile.hq],
      ["CEO / leadership",profile.leader], ["2025 revenue",profile.revenue],
      ["Revenue per store",profile.perStore], ["Tagline",profile.tagline]
    ]) {
      facts.append(make("dt",label),make("dd",value));
    }
    const links = make("div",null,"profile-links");
    if (profile.wiki) links.append(link(profile.wiki.includes("?search=") ? "Search Wikipedia" : "Wikipedia",profile.wiki));
    else links.append(link("Search Wikipedia","https://en.wikipedia.org/w/index.php?search="+encodeURIComponent(brand)));
    links.append(link("Company website",profile.website));
    const refs = make("details",null,"profile-sources");
    refs.append(make("summary","Fact sources"));
    const list = make("ul");
    for (const url of profile.sources) {
      const item = make("li");
      item.append(link(new URL(url).hostname.replace(/^www\./,"") + " · " + (list.children.length+1),url));
      list.append(item);
    }
    refs.append(list);
    card.replaceChildren(head,make("p",profile.description,"profile-description"),facts,links,refs);
    card.hidden = false;
    card.scrollTop = 0;
    position();
  }

  function trigger(brand, count) {
    const button = make("button",null,"profile-trigger");
    button.append(logo(window.PROFILES[brand]),make("strong",brand));
    button.setAttribute("aria-label",brand+" company facts");
    button.setAttribute("aria-haspopup","dialog");
    button.setAttribute("aria-expanded","false");
    button.setAttribute("aria-controls",card.id);
    button.onpointerenter = event => {
      if (event.pointerType === "mouse" && innerWidth > 760 && !pinned) show(button,brand,count);
    };
    button.onpointerleave = () => { if (active === button) scheduleClose(); };
    button.onfocus = () => { if (!returningFocus) show(button,brand,count); };
    button.onblur = event => {
      if (active === button && !card.contains(event.relatedTarget)) scheduleClose();
    };
    button.onclick = () => {
      show(button,brand,count);
      pinned = true;
      card.querySelector("button").focus({preventScroll:true});
    };
    return button;
  }

  card.onpointerenter = () => clearTimeout(timer);
  card.onpointerleave = scheduleClose;
  document.addEventListener("pointerdown",event => {
    if (active && !card.contains(event.target) && !active.contains(event.target)) close();
  });
  document.addEventListener("focusin",event => {
    if (active && !card.contains(event.target) && !active.contains(event.target)) close();
  });
  document.addEventListener("keydown",event => {
    if (event.key === "Escape" && active) {
      event.preventDefault();
      close(card.contains(document.activeElement));
    }
  });
  document.getElementById("groups").addEventListener("scroll",() => close());
  window.addEventListener("resize",position);
  return {trigger,close};
})();
