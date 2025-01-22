import * as wob from "wobbegong";

const wobbegong_url = "https://research.gene.com/wobbegong/api/v1";

// We cache the JSON so that we don't have to make repeated requests
// when creating new instances of the various wobbegong classes.
const wobbegong_json_cache = new Map();

export async function getSE(path) {
  const data_path = await convertExperiment(path);
  const summ = await fetchJson(data_path + "/summary.json");
  let se = new wb.SummarizedExperiment(summ, data_path, fetchJson, fetchRange);

  return se;
}

export async function fetchJson(path) {
  let existing = wobbegong_json_cache.get(path);
  if (typeof existing != "undefined") {
    return existing;
  }

  const res = await fetch(wobbegong_url + "/file/" + path);
  if (!res.ok) {
    throw new Error(
      "oops, failed to retrieve '" + path + "' (" + String(res.status) + ")"
    );
  }

  let payload = await res.json();
  wobbegong_json_cache.set(path, payload);
  return payload;
}

// We don't cache the ranges, otherwise the user might eventually cache the
// entire assay matrix if they click on enough genes.
export async function fetchRange(path, start, end) {
  const res = await fetch(wobbegong_url + "/file/" + path, {
    headers: { Range: "bytes=" + String(start) + "-" + String(end - 1) },
  });
  if (!res.ok) {
    throw new Error(
      "oops, failed to retrieve range from '" +
        path +
        "' (" +
        String(res.status) +
        ")"
    );
  }
  let output = new Uint8Array(await res.arrayBuffer());
  return output.slice(0, end - start); // trim off any excess junk
}

const sewerrat_url = "https://research.gene.com/sewerrat/api/v1";

export async function findMarkerFiles(path) {
  let all_markers = {};

  let parent = path.replace(/\/[^\/]+$/, "");
  let listing_res = await fetch(
    sewerrat_url +
      "/list?path=" +
      encodeURIComponent(parent) +
      "&recursive=false"
  );
  if (!listing_res.ok) {
    throw new Error("failed to search for marker genes in '" + parent + "'");
  }

  let listing = await listing_res.json();
  if (listing.indexOf("markers/") >= 0) {
    let marker_res = await fetch(
      sewerrat_url +
        "/list?path=" +
        encodeURIComponent(parent + "/markers") +
        "&recursive=false"
    );
    if (!marker_res.ok) {
      throw new Error("failed to search the 'markers/' subdirectory");
    }
    let available = (await marker_res.json())
      .filter((p) => p.endsWith("/"))
      .map((p) => "markers/" + p);
    if (available.length) {
      all_markers[""] = available;
    }
  }

  for (const el of listing) {
    if (!el.startsWith("markers-") || !el.endsWith("/")) {
      continue;
    }

    let leftovers = el.slice(8, el.length - 1);
    if (leftovers.match(/^[0-9]+$/)) {
      // for back-compatibility.
      if (!("" in all_markers)) {
        all_markers[""] = [];
      }
      all_markers[""].push(el);
    } else {
      let marker_res = await fetch(
        sewerrat_url +
          encodeURIComponent(parent + "/markers") +
          "&recursive=false"
      );
      if (!marker_res.ok) {
        throw new Error("failed to search the 'markers/' subdirectory");
      }
      let available = (await marker_res.json())
        .filter((p) => p.endsWith("/"))
        .map((p) => el + p);
      if (available.length) {
        all_markers[leftovers] = available;
      }
    }
  }

  return all_markers;
}

export async function convertPath(path) {
  const res = await fetch(wobbegong_url + "/convert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: path }),
  });
  if (!res.ok) {
    throw new Error("failed to start conversion for '" + path + "'");
  }

  const body = await res.json();

  let status = body.status;
  while (status == "PENDING") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const sres = await fetch(wobbegong_url + "/file/" + body.status_path);
    if (!sres.ok) {
      throw new Error("failed to poll for completion for '" + path + "'");
    }
    status = (await sres.text()).trimRight();
  }

  if (status == "FAILURE") {
    throw new Error("conversion failed for '" + path + "'");
  }

  return body.data_path;
}

export async function convertAllFiles(path, markers) {
  let parent = path.replace(/\/[^\/]+$/, "");

  let promises = [convertPath(path)];
  for (const [key, val] of Object.entries(markers)) {
    for (const v of val) {
      promises.push(convertPath(parent + "/" + v));
    }
  }

  let resolved = await Promise.all(promises);

  let new_markers = {};
  let i = 1;
  for (const [key, val] of Object.entries(markers)) {
    let current = [];
    for (const v of val) {
      current.push(resolved[i]);
      i++;
    }
    new_markers[key] = current;
  }

  return { path: resolved[0], markers: new_markers };
}

export async function matchMarkersToExperiment(
  converted_path,
  converted_markers
) {
  // First we take the first entry from each marker type, get its row names, sort them and hash it.
  const marker_mapping = new Map();
  for (const [key, val] of Object.entries(converted_markers)) {
    const df = await wob.load(val[0], fetchJson, fetchRange);
    if (!df.hasRowNames()) {
      continue;
    }
    let rn = await df.rowNames();
    let existing = marker_mapping.get(rn.length);
    if (typeof existing == "undefined") {
      existing = [];
    }
    existing.push({ names: rn.toSorted(), key: key });
    marker_mapping.set(rn.length, existing);
  }

  // Setting up a function to find a match.
  let find_match = (se_names) => {
    let candidates = marker_mapping.get(se_names.length);
    if (typeof candidates == "undefined") {
      return null;
    }

    let sorted_names = se_names.toSorted();
    for (const { names, key } of candidates) {
      let failed = false;
      for (var i = 0; i < names.length; ++i) {
        if (names[i] != sorted_names[i]) {
          failed = true;
          break;
        }
      }

      if (!failed) {
        return key;
      }
    }

    return null;
  };

  // Next we go through the main experiment and pull out its row names.
  const sce = await wob.load(converted_path, fetchJson, fetchRange);
  let main = null;
  if (sce.hasRowData()) {
    let rd = await sce.rowData();
    if (rd.hasRowNames()) {
      main = find_match(await rd.rowNames());
    }
  }

  // Ditto for the alternative experiments.
  let alts = {};
  if (sce.isSingleCellExperiment()) {
    const altnames = sce.alternativeExperimentNames();
    for (const an of altnames) {
      let ae = await sce.alternativeExperiment(an);
      if (ae.hasRowNames()) {
        alts[an] = find_match(await ae.rowNames());
      } else {
        alts[an] = null;
      }
    }
  }

  return { main: main, alternative: alts };
}

export function chooseAssay(sce) {
  let all_names = sce.assayNames();

  // First we search for anything "log"-ish:
  for (const a of all_names) {
    if (a.toLowerCase().startsWith("log")) {
      return { assay: a, normalize: false };
    }
  }

  // Then we search for anything "count"-ish:
  for (const a of all_names) {
    if (a.toLowerCase().startsWith("count")) {
      return { assay: a, normalize: true };
    }
  }

  // Otherwise we just return the first assay.
  return { assay: all_names[0], normalize: true };
}

export async function computeSizeFactors(assay) {
  let colsums = await assay.statistic("column_sum");

  let mean = 0;
  for (const c of colsums) {
    mean += c;
  }
  mean /= colsums.length;

  let centered = new Float64Array(colsums.length);
  for (var i = 0; i < colsums.length; i++) {
    centered[i] = colsums[i] / mean;
  }

  return centered;
}

export function normalizeCounts(values, size_factors, log) {
  let copy = new Float64Array(values.length);
  for (var i = 0; i < values.length; i++) {
    if (size_factors[i] > 0) {
      copy[i] = values[i] / size_factors[i];
    } else {
      copy[i] = 0;
    }
  }

  if (log) {
    for (var i = 0; i < values.length; i++) {
      copy[i] = Math.log2(copy[i]);
    }
  }

  return copy;
}

export function mapNames(df_names, sce_names) {
  let mapping = new Map();
  for (var i = 0; i < sce_names.length; i++) {
    mapping.set(sce_names[i], i);
  }

  // No need to protect against missingness, as matchMarkersToExperiment()
  // should guarantee that the names are identical.
  let output = [];
  for (var i = 0; i < df_names.length; i++) {
    output.push(mapping.get(df_names[i]));
  }

  return output;
}

export async function findExperiments(searchtext, searchpath, searchnum = 100) {
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
  if (
    typeof searchtext != "undefined" &&
    searchtext != null &&
    searchtext != ""
  ) {
    searchtext = "(" + searchtext + ") AND (" + type_condition + ")";
  } else {
    searchtext = type_condition;
  }
  query.push({ type: "text", text: searchtext });

  if (
    typeof searchpath != "undefiend" &&
    searchpath != null &&
    searchpath != ""
  ) {
    query.push({ type: "path", path: searchpath });
  }

  if (query.length != 1) {
    query = { type: "and", children: query };
  } else {
    query = query[0];
  }
  query = JSON.stringify(query);

  // Now looping through all the search result pages.
  let stub = sewerrat_url + "/query?translate=true";
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

export function truncateString(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  } else {
    return str.slice(0, maxLength) + "...";
  }
}

export function breakString(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  } else {
    let result = "";
    for (let i = 0; i < str.length; i += maxLength) {
      result = result + " " + str.substr(i, maxLength);
    }
    return result;
  }
}

export async function findMarkers(path) {
  let dir = path.slice(0, path.lastIndexOf("/"));

  let list_res = await fetch(
    sewerrat_url + "/list?recursive=false&path=" + encodeURIComponent(dir)
  );
  if (!list_res.ok) {
    throw new Error(
      "failed to obtain a directory listing for '" +
        dir +
        "' (" +
        String(list_res.status) +
        ")"
    );
  }
  let listing = await list_res.json();

  if (listing.indexOf("markers/") < 0) {
    return listing
      .filter((x) => x.startsWith("markers-"))
      .map((x) => dir + "/" + x);
  }

  let subdir = dir + "/markers";
  let sublist_res = await fetch(
    sewerrat_url + "/list?recursive=false&path=" + encodeURIComponent(subdir)
  );
  if (!sublist_res.ok) {
    throw new Error(
      "failed to obtain a directory listing for '" +
        subdir +
        "' (" +
        String(sublist_res.status) +
        ")"
    );
  }

  let sublisting = await sublist_res.json();
  return sublisting.filter((x) => x.endsWith("/")).map((x) => subdir + "/" + x);
}
