const url = window["kanaConfig"]["wobbegongapi"];

export async function fetchJson(path) {
  const res = await fetch(url + "/file/" + path);
  if (!res.ok) {
    throw new Error(
      "oops, failed to retrieve '" + path + "' (" + String(res.status) + ")"
    );
  }
  return res.json();
}

export async function fetchRange(path, start, end) {
  const res = await fetch(url + "/file/" + path, {
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

export async function convertPath(path) {
  const res = await fetch(url + "/convert", {
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
    const sres = await fetch(url + "/file/" + body.status_path);
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

const sewerrat_url = "https://research.gene.com/sewerrat/api/v1";

export async function findMarkerFiles(path) {
  let all_markers = {};

  let parent = path.replace(/\/[^\/]+$/, "");
  let listing_res = await fetch(sewerrat_url + "/list?path=" + encodeURIComponent(parent) + "&recursive=false")
  if (!listing_res.ok) {
    throw new Error("failed to search for marker genes in '" + parent + "'");
  }

  let listing = await listing_res.json();
  if (listing.indexOf("markers/") >= 0) {
    let marker_res = await fetch(sewerrat_url + encodeURIComponent(parent + "/markers") + "&recursive=false")
    if (!marker_res.ok) {
      throw new Error("failed to search the 'markers/' subdirectory");
    }
    let available = (await marker_res.json()).filter(p => p.endsWith("/")).map(p => "markers/" + p);
    if (available.length) {
      all_markers[""] = available;
    }
  }

  for (const el of listing) {
    if (!el.startsWith("markers-") || !el.endsWith("/")) {
      continue;
    }

    let leftovers = el.slice(8, el.length - 1);
    if (leftovers.match(/^[0-9]+$/)) { // for back-compatibility.
      if (!("" in all_markers)) {
        all_markers[""] = []
      }
      all_markers[""].push(el);

    } else {
      let marker_res = await fetch(sewerrat_url + encodeURIComponent(parent + "/markers") + "&recursive=false")
      if (!marker_res.ok) {
        throw new Error("failed to search the 'markers/' subdirectory");
      }
      let available = (await marker_res.json()).filter(p => p.endsWith("/")).map(p => el + p); 
      if (available.length) {
        all_markers[leftovers] = available;
      }
    }
  }

  return all_markers;
}

export async function convertAllFiles(path, markers) {
  let parent = path.replace(/\/[^\/]+$/, "");

  let promises = [ convertPath(path) ];
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
    new_markers.push(current);
  }

  return [ resolved[0], new_markers ];
}

export async function matchMarkersToExperiment(experiment, markers) {
  // First we take the first entry from each marker type, get its row names, sort them and hash it.
  const marker_mapping = new Map;
  for (const [key, val] of Object.entries(markers)) {
    const df = await wob.load(val);
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

  // Next we go through the main experiment and pull out its row names.

}
