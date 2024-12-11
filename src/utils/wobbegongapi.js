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

export async function convertExperiment(path) {
  const res = await fetch(url + "/convert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: path }),
  });
  if (!res.ok) {
    throw new Error("oops failed to start conversion");
  }

  const body = await res.json();

  let status = body.status;
  while (status == "PENDING") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const sres = await fetch(url + "/file/" + body.status_path);
    if (!sres.ok) {
      throw new Error("oops failed to poll for completion");
    }
    status = (await sres.text()).trimRight();
  }

  if (status == "FAILURE") {
    throw new Error("oops conversion failed");
  }

  return body.data_path;
}
