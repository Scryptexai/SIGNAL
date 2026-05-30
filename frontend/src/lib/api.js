import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 95000 });

// Backend returns graceful { error, detail } bodies (HTTP 200) for upstream
// failures — surface them as thrown errors so views can show a clean message.
const unwrap = (data) => {
  if (data && typeof data === "object" && data.error) {
    const e = new Error(data.detail || data.error);
    e.code = data.error;
    throw e;
  }
  return data;
};
const get = (url, params) => api.get(url, { params }).then((r) => unwrap(r.data));

export const getStatus = () => get("/status");
export const getCatalog = () => get("/intel/catalog");

export const getEntity = (slug) => get(`/intel/entity/${slug}`);
export const getAddress = (addr) => get(`/intel/address/${addr}`);
export const resolveSearch = (query) => get("/intel/search", { query });

export const getTransfers = (params) => get("/txns/transfers", params);
export const getSwaps = (params) => get("/txns/swaps", params);
export const getLarge = () => get("/txns/large");

export const getTrending = () => get("/tokens/trending");
export const getHolders = (slug) => get(`/tokens/holders/${slug}`);
export const getFlow = (slug, time_last = "24h") => get(`/tokens/flow/${slug}`, { time_last });

export const generateContent = (body) =>
  api.post("/content/generate", body).then((r) => r.data);

export const errMsg = (e) =>
  e?.response?.data?.detail || e?.message || "Request failed";

export default api;
