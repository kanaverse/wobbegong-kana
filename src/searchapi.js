const sewerrat = "https://research.gene.com/sewerrat/api/v1";

export async function findExperiments(searchtext, searchpath, searchnum=100) {
  // First, assembling the query body.
  let query = [];

  const allowed_types = [
    "single_cell_experiment",
    "spatial_experiment",
    "spatial_feature_experiment",
  ];
  const type_condition = allowed_types
    .map((x) => "object.type: " + x)
    .join(" OR ");
  if (typeof searchtext != "undefined" && searchtext != null && searchtext != "") {
    searchtext = "(" + searchtext + ") AND (" + type_condition + ")";
  } else {
    searchtext = type_condition;
  }
  query.push({ type: "text", text: searchtext });

  if (typeof searchpath != "undefiend" && searchpath != null && searchpath != "") {
    query.push({ type: "path", path: searchpath });
  }

  if (query.length != 1) {
    query = { type: "and", children: query };
  } else {
    query = query[0];
  }
  query = JSON.stringify(query);

  // Now looping through all the search result pages.
  let stub = sewerrat + "/query?translate=true";
  let collected = [];
  while (collected.length < searchnum) {
    const res = await fetch(
      stub + "&limit=" + String(searchnum - collected.length),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: query,
      }
    );
    if (!res.ok) {
      throw new Error("oops failed to query for interesting things");
    }

    const body = await res.json();
    for (const hit of body.results) {
      collected.push(hit);
    }

    if (!("next" in body)) {
      break;
    }
    stub = body.next;
  }

  return collected;
}

export function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  } else {
    return str.slice(0, maxLength) + "...";
  }
}

export function truncateString(str, maxLength) {
  if (str.length <= maxLength + 10) {
    return str;
  } else {
    let half = maxLength / 2;
    return str.slice(0, half) + "..." + str.slice(str.length - half, str.length)
  }
}

export async function findMarkers(path) {
  let dir = path.slice(0, path.lastIndexOf("/"));

  let list_res = await fetch(sewerrat + "/list?recursive=false&path=" + encodeURIComponent(dir));
  if (!list_res.ok) {
    throw new Error("failed to obtain a directory listing for '" + dir + "' (" + String(list_res.status) + ")");
  }
  let listing = await list_res.json();

  if (listing.indexOf("markers/") < 0) {
    return listing.filter(x => x.startsWith("markers-")).map(x => dir + "/" + x);
  }

  let subdir = dir + "/markers";
  let sublist_res = await fetch(sewerrat + "/list?recursive=false&path=" + encodeURIComponent(subdir));
  if (!sublist_res.ok) {
    throw new Error("failed to obtain a directory listing for '" + subdir + "' (" + String(sublist_res.status) + ")");
  }

  let sublisting = await sublist_res.json();
  return sublisting.filter(x => x.endsWith("/")).map(x => subdir + "/" + x);
}
