const sewerrat = window["kanaConfig"]["searchapi"];

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
  if (searchtext != null && searchtext != "") {
    searchtext = type_condition;
  } else {
    searchtext = "(" + searchtext + ") AND (" + type_condition + ")";
  }
  query.push({ type: "text", text: searchtext });

  if (searchpath != null && searchpath != "") {
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