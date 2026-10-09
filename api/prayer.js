module.exports = async function handler(req, res) {
  try {
    const q = req.query || {};
    const latitude = Number(q.latitude);
    const longitude = Number(q.longitude);
    const date = String(q.date || "");
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        !/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      return res.status(400).json({ error: "Invalid prayer request." });
    }

    // University of Islamic Sciences, Karachi + standard (non-Hanafi) Asr
    // to match the Google-style Payyanur timetable requested for the site.
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      method: "1",
      school: "0"
    });
    const upstream = await fetch(
      "https://api.aladhan.com/v1/timings/" + date + "?" + params.toString(),
      { headers: { accept: "application/json" } }
    );
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.send(body);
  } catch (error) {
    console.error("Prayer proxy failed:", error);
    return res.status(502).json({ error: "Prayer service unavailable." });
  }
};
